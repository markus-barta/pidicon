import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  corruptPreferences,
  getPreferences,
  seedPreferences,
} from '../helpers/preferences-helpers';

test.describe('Preferences Corruption Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should recover from completely corrupted JSON', async ({ page }) => {
    // Corrupt localStorage with invalid JSON
    await corruptPreferences(page, '{ this is not valid json }');

    // Reload to trigger recovery
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should fallback to defaults
    const prefs = await getPreferences(page);
    expect(prefs).toBeDefined();
    expect(prefs.version).toBe(1);
    expect(prefs.deviceCards).toEqual({});
    expect(prefs.currentView).toBe('devices');
  });

  test('should recover from truncated JSON', async ({ page }) => {
    // Seed valid preferences first
    await seedPreferences(page, {
      version: 1,
      currentView: 'settings',
      settingsTab: 'mqtt',
    });

    // Corrupt by truncating
    await corruptPreferences(page, '{"version":1,"currentView":"sett');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should fallback to defaults
    const prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
    expect(prefs.currentView).toBe('devices'); // Default
  });

  test('should handle null value in localStorage', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('pidicon:preferences:v1', null as any);
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs).toBeDefined();
    expect(prefs.version).toBe(1);
  });

  test('should handle empty string in localStorage', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('pidicon:preferences:v1', '');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs).toBeDefined();
    expect(prefs.version).toBe(1);
  });

  test('should handle malformed device cards structure', async ({ page }) => {
    // Seed with invalid deviceCards structure
    await page.evaluate(() => {
      localStorage.setItem(
        'pidicon:preferences:v1',
        JSON.stringify({
          version: 1,
          deviceCards: 'this should be an object', // Invalid type
          currentView: 'devices',
          settingsTab: 'devices',
          sceneManager: {},
          testsView: {},
          showDevScenes: false,
        })
      );
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs.deviceCards).toEqual({}); // Should reset to default
  });

  test('should handle corrupt sceneManager object', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'pidicon:preferences:v1',
        JSON.stringify({
          version: 1,
          deviceCards: {},
          currentView: 'devices',
          settingsTab: 'devices',
          sceneManager: null, // Invalid
          testsView: {},
          showDevScenes: false,
        })
      );
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs.sceneManager).toEqual({
      selectedDeviceIp: null,
      sortBy: 'sortOrder',
      searchQuery: '',
      bulkMode: false,
    });
  });

  test('should recover and allow normal operation after corruption', async ({
    page,
  }) => {
    // Start with corruption
    await corruptPreferences(page, '}{invalid');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to Settings
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Click MQTT tab
    await page.click('button:has-text("MQTT Connectivity")');

    // Verify preferences are now being saved correctly
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
    expect(prefs.settingsTab).toBe('mqtt');
  });

  test('should log corruption error to console', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleMessages.push(msg.text());
      }
    });

    await corruptPreferences(page, '{corrupt}');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should have logged an error about corruption
    const hasCorruptionError = consoleMessages.some((msg) =>
      msg.toLowerCase().includes('preferences')
    );
    expect(hasCorruptionError).toBe(true);
  });

  test('should handle corruption during active session', async ({ page }) => {
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Corrupt during session (simulate external manipulation)
    await corruptPreferences(page, 'broken');

    // Try to navigate (which will attempt to save preferences)
    await page.click('button:has-text("Settings")');

    // Should recover gracefully without crashing
    await expect(page.locator('text=Settings')).toBeVisible();

    // Check that defaults are in place
    const prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
  });
});

