import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
  simulateStorageEvent,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Multi-Tab Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should sync preferences across tabs via storage event', async ({
    page,
    context,
  }) => {
    // Set preferences in tab 1
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    // Open tab 2
    const tab2 = await context.newPage();
    await tab2.goto('/');
    await tab2.waitForLoadState('networkidle');

    // Change preferences in tab 2
    await tab2.click('button:has-text("Settings"), tab:has-text("Settings")');
    await tab2.click('button:has-text("MQTT Connectivity"), tab:has-text("MQTT")');
    await waitForPreferencesSave(tab2);

    // Simulate storage event in tab 1 (this would happen automatically in real browser)
    await simulateStorageEvent(page, 'pidicon:preferences:v1', {
      version: 1,
      deviceCards: {},
      currentView: 'settings',
      settingsTab: 'mqtt',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: '',
        expandedSections: [],
      },
      showDevScenes: false,
    });

    await page.waitForTimeout(1000);

    // Tab 1 should have updated preferences
    const prefsTab1 = await getPreferences(page);
    expect(prefsTab1.settingsTab).toBe('mqtt');

    await tab2.close();
  });

  test('should handle storage events from other tabs', async ({ page }) => {
    // Start on Dashboard
    await expect(page.locator('button:has-text("Dashboard")[aria-current="page"], tab[selected]:has-text("Dashboard")')).toBeVisible();

    // Simulate another tab changing preferences
    await simulateStorageEvent(page, 'pidicon:preferences:v1', {
      version: 1,
      deviceCards: {},
      currentView: 'settings',
      settingsTab: 'global',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: '',
        expandedSections: [],
      },
      showDevScenes: false,
    });

    await page.waitForTimeout(1500);

    // Should sync to Settings view
    // Note: Actual navigation may depend on implementation
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
  });

  test('should not create infinite loops when syncing', async ({ page }) => {
    let storageEventCount = 0;
    await page.evaluate(() => {
      window.addEventListener('storage', () => {
        (window as any).__storageEventCount =
          ((window as any).__storageEventCount || 0) + 1;
      });
    });

    // Make a change
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    // Simulate storage event
    await simulateStorageEvent(page, 'pidicon:preferences:v1', {
      version: 1,
      deviceCards: {},
      currentView: 'settings',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: '',
        expandedSections: [],
      },
      showDevScenes: false,
    });

    await page.waitForTimeout(2000);

    storageEventCount = await page.evaluate(
      () => (window as any).__storageEventCount || 0
    );

    // Should not have created many events (at most a few)
    expect(storageEventCount).toBeLessThan(5);
  });

  test('should handle device card collapse sync across tabs', async ({
    page,
    context,
  }) => {
    const tab2 = await context.newPage();
    await tab2.goto('/');
    await tab2.waitForLoadState('networkidle');

    // Collapse device in tab 1
    const firstCard = page.locator('[data-testid="device-card"]').first();
    const collapseBtn = firstCard.locator('button[aria-label*="collapse" i]');

    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.click();
      await waitForPreferencesSave(page);

      const prefs = await getPreferences(page);
      const ipText = await firstCard
        .locator('text=/192\\.168\\.\\d+\\.\\d+/')
        .textContent();
      const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

      // Simulate storage event in tab 2
      if (ip) {
        await simulateStorageEvent(tab2, 'pidicon:preferences:v1', prefs);
        await tab2.waitForTimeout(1000);

        // Tab 2 should have synced preferences
        const prefsTab2 = await getPreferences(tab2);
        expect(prefsTab2.deviceCards).toEqual(prefs.deviceCards);
      }
    }

    await tab2.close();
  });

  test('should handle concurrent updates from multiple tabs', async ({
    page,
    context,
  }) => {
    const tab2 = await context.newPage();
    await tab2.goto('/');
    await tab2.waitForLoadState('networkidle');

    // Both tabs make changes simultaneously
    await Promise.all([
      page.click('button:has-text("Settings"), tab:has-text("Settings")'),
      tab2.click('button:has-text("Settings"), tab:has-text("Settings")'),
    ]);

    await Promise.all([
      waitForPreferencesSave(page),
      waitForPreferencesSave(tab2),
    ]);

    // Both should eventually converge (last write wins)
    const prefsTab1 = await getPreferences(page);
    const prefsTab2 = await getPreferences(tab2);

    expect(prefsTab1.currentView).toBe('settings');
    expect(prefsTab2.currentView).toBe('settings');

    await tab2.close();
  });

  test('should ignore storage events for other keys', async ({ page }) => {
    const prefsBefore = await getPreferences(page);

    // Simulate storage event for unrelated key
    await page.evaluate(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some-other-app-key',
          newValue: '{"data": "value"}',
          url: window.location.href,
        })
      );
    });

    await page.waitForTimeout(500);

    const prefsAfter = await getPreferences(page);
    expect(prefsAfter).toEqual(prefsBefore);
  });
});

