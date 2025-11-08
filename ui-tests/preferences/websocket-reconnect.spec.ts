import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('WebSocket Reconnection Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should preserve preferences during WebSocket disconnection', async ({
    page,
  }) => {
    // Set some preferences
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.click('button:has-text("MQTT Connectivity"), tab:has-text("MQTT")');
    await waitForPreferencesSave(page);

    // Get preferences before disconnect
    const prefsBefore = await getPreferences(page);

    // Simulate WebSocket disconnect
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('websocket-disconnect', {
          detail: { code: 1006, reason: 'network-error' },
        })
      );
    });

    await page.waitForTimeout(1000);

    // Preferences should still be in localStorage
    const prefsDuring = await getPreferences(page);
    expect(prefsDuring).toEqual(prefsBefore);
  });

  test('should continue saving preferences during disconnection', async ({
    page,
  }) => {
    // Simulate disconnect
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-disconnect'));
    });

    await page.waitForTimeout(500);

    // Make preference changes while disconnected
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
  });

  test('should restore preferences after WebSocket reconnection', async ({
    page,
  }) => {
    // Set preferences
    await seedPreferences(page, {
      version: 1,
      deviceCards: {
        '192': { '168': { '1': { '100': { collapsed: true } } } },
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
    await page.waitForLoadState('networkidle');

    // Simulate disconnect
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-disconnect'));
    });

    await page.waitForTimeout(500);

    // Simulate reconnect
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('websocket-reconnect', {
          detail: { attemptNumber: 1 },
        })
      );
    });

    await page.waitForTimeout(1000);

    // All preferences should still be intact
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
    expect(prefs.settingsTab).toBe('mqtt');
    expect(prefs.deviceCards['192']['168']['1']['100'].collapsed).toBe(true);
  });

  test('should handle multiple disconnect/reconnect cycles', async ({
    page,
  }) => {
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    // Cycle through multiple disconnects/reconnects
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-disconnect'));
      });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-reconnect'));
      });
      await page.waitForTimeout(200);
    }

    // Preferences should still be valid
    const prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
    expect(prefs.currentView).toBe('settings');
  });

  test('should not duplicate preferences on reconnection', async ({ page }) => {
    // Set initial preferences
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    const prefsBefore = await getPreferences(page);
    const beforeKeys = JSON.stringify(Object.keys(prefsBefore).sort());

    // Disconnect and reconnect
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-disconnect'));
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-reconnect'));
    });
    await page.waitForTimeout(500);

    // Preference structure should be unchanged
    const prefsAfter = await getPreferences(page);
    const afterKeys = JSON.stringify(Object.keys(prefsAfter).sort());

    expect(afterKeys).toBe(beforeKeys);
  });

  test('should show connection status while maintaining preferences', async ({
    page,
  }) => {
    // Look for connection indicator
    const connectionStatus = page.locator(
      '[data-testid="connection-status"], text=/connected|disconnected/i'
    );

    // Disconnect
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-disconnect'));
    });

    await page.waitForTimeout(1000);

    // Status should indicate disconnection (if visible)
    if ((await connectionStatus.count()) > 0) {
      const statusText = await connectionStatus.textContent();
      expect(statusText?.toLowerCase()).toContain('disconnect');
    }

    // Make preference changes
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    // Preferences should save despite disconnection
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
  });
});

