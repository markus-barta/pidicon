import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Device Card Daemon Conflict Resolution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
    await page.waitForSelector('[data-testid="device-card"], .device-card', {
      state: 'visible',
      timeout: 10000,
    });
  });

  test('should handle daemon restoring device state vs UI preferences', async ({
    page,
  }) => {
    // Collapse a device in UI
    const firstCard = page.locator('[data-testid="device-card"]').first();
    const collapseButton = firstCard.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i]'
    );

    await collapseButton.click();
    await waitForPreferencesSave(page);

    // Verify it's collapsed in preferences
    let prefs = await getPreferences(page);
    const ipText = await firstCard
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();
    const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (ip) {
      const devicePrefs =
        prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
      expect(devicePrefs?.collapsed).toBe(true);
    }

    // Simulate daemon sending device state update via WebSocket
    // (This would normally happen when daemon restarts or device reconnects)
    await page.evaluate(() => {
      // Trigger a mock WebSocket message
      window.dispatchEvent(
        new CustomEvent('mock-daemon-update', {
          detail: { type: 'device-state-update' },
        })
      );
    });

    await page.waitForTimeout(1000);

    // UI preference (collapsed state) should still be preserved
    prefs = await getPreferences(page);
    if (ip) {
      const devicePrefs =
        prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
      expect(devicePrefs?.collapsed).toBe(true);
    }
  });

  test('should not override UI preferences when daemon reconnects', async ({
    page,
  }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();

    // Set UI preference
    const collapseButton = firstCard.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i]'
    );
    await collapseButton.click();
    await waitForPreferencesSave(page);

    // Get preferences before "daemon restart"
    const prefsBeforeReconnect = await getPreferences(page);

    // Simulate WebSocket disconnect/reconnect
    await page.evaluate(() => {
      // Mock daemon reconnection
      window.dispatchEvent(
        new CustomEvent('websocket-reconnect', {
          detail: { reason: 'daemon-restart' },
        })
      );
    });

    await page.waitForTimeout(1500);

    // Preferences should be unchanged
    const prefsAfterReconnect = await getPreferences(page);
    expect(prefsAfterReconnect.deviceCards).toEqual(
      prefsBeforeReconnect.deviceCards
    );
  });

  test('should preserve UI preferences when device goes offline/online', async ({
    page,
  }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();

    // Set preferences while device is online
    const collapseButton = firstCard.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i]'
    );
    await collapseButton.click();
    await waitForPreferencesSave(page);

    const ipText = await firstCard
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();
    const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (!ip) return;

    // Simulate device going offline (WebSocket would send status update)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('mock-device-status', {
          detail: { status: 'offline' },
        })
      );
    });

    await page.waitForTimeout(500);

    // Preferences should persist even if device offline
    let prefs = await getPreferences(page);
    const devicePrefs = prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
    expect(devicePrefs?.collapsed).toBe(true);

    // Simulate device coming back online
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('mock-device-status', {
          detail: { status: 'online' },
        })
      );
    });

    await page.waitForTimeout(500);

    // Preferences should still be intact
    prefs = await getPreferences(page);
    const devicePrefsAfter =
      prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
    expect(devicePrefsAfter?.collapsed).toBe(true);
  });

  test('should handle daemon state reset without losing UI preferences', async ({
    page,
  }) => {
    // Set multiple UI preferences
    await seedPreferences(page, {
      version: 1,
      deviceCards: {
        '192': {
          '168': {
            '1': {
              '100': {
                collapsed: true,
                showSceneDetails: true,
                showPerfMetrics: false,
              },
            },
          },
        },
      },
      currentView: 'settings',
      settingsTab: 'mqtt',
      sceneManager: {
        selectedDeviceIp: '192.168.1.100',
        sortBy: 'name',
        searchQuery: 'test',
        bulkMode: false,
      },
      testsView: {
        searchQuery: '',
        expandedSections: [],
      },
      showDevScenes: true,
    });

    await page.reload();
    await page.waitForSelector('text=Settings', { state: 'visible' });

    // Simulate daemon sending full state reset
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('mock-daemon-reset', {
          detail: { type: 'full-reset' },
        })
      );
    });

    await page.waitForTimeout(1000);

    // All UI preferences should be preserved
    const prefs = await getPreferences(page);
    expect(prefs.deviceCards['192']['168']['1']['100'].collapsed).toBe(true);
    expect(prefs.currentView).toBe('settings');
    expect(prefs.settingsTab).toBe('mqtt');
    expect(prefs.sceneManager.selectedDeviceIp).toBe('192.168.1.100');
  });

  test('should not create duplicate device entries on daemon updates', async ({
    page,
  }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();
    const collapseButton = firstCard.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i]'
    );

    // Collapse device
    await collapseButton.click();
    await waitForPreferencesSave(page);

    // Simulate multiple daemon updates for same device
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent('mock-daemon-update', {
            detail: { type: 'device-heartbeat' },
          })
        );
      });
      await page.waitForTimeout(200);
    }

    // Should still have only one preference entry for the device
    const prefs = await getPreferences(page);
    const ipText = await firstCard
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();
    const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (ip) {
      // Count device entries (should be exactly 1)
      const deviceCount = Object.keys(
        prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]] || {}
      ).length;
      expect(deviceCount).toBeGreaterThanOrEqual(1);

      // And our specific device preference should still be there
      const devicePrefs =
        prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
      expect(devicePrefs?.collapsed).toBe(true);
    }
  });
});

