import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
} from '../helpers/preferences-helpers';

test.describe('Preferences Migration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should migrate from legacy pidicon:showDevScenes to v1 schema', async ({
    page,
  }) => {
    // Seed legacy preference
    await page.evaluate(() => {
      localStorage.setItem('pidicon:showDevScenes', 'true');
    });

    // Reload page to trigger migration
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check v1 schema was created
    const prefs = await getPreferences(page);
    expect(prefs).toBeDefined();
    expect(prefs.version).toBe(1);
    expect(prefs.showDevScenes).toBe(true);

    // Check legacy key was removed
    const legacy = await page.evaluate(() =>
      localStorage.getItem('pidicon:showDevScenes')
    );
    expect(legacy).toBeNull();
  });

  test('should handle missing version field as v0 and upgrade', async ({
    page,
  }) => {
    // Seed preferences without version field (v0)
    await page.evaluate(() => {
      localStorage.setItem(
        'pidicon:preferences:v1',
        JSON.stringify({
          currentView: 'devices',
          settingsTab: 'global',
          // No version field = v0
        })
      );
    });

    // Reload to trigger migration
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should add version field and fill in missing defaults
    const prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
    expect(prefs.currentView).toBe('devices');
    expect(prefs.settingsTab).toBe('global');
    expect(prefs.deviceCards).toBeDefined();
    expect(prefs.sceneManager).toBeDefined();
    expect(prefs.testsView).toBeDefined();
  });

  test('should preserve existing v1 preferences without modification', async ({
    page,
  }) => {
    const existingPrefs = {
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
        bulkMode: true,
      },
      testsView: {
        searchQuery: 'unit',
        expandedSections: ['preferences', 'mqtt'],
      },
      showDevScenes: true,
    };

    await seedPreferences(page, existingPrefs);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify preferences unchanged
    const prefs = await getPreferences(page);
    expect(prefs).toEqual(existingPrefs);
  });

  test('should handle partial v1 schema by filling in missing keys', async ({
    page,
  }) => {
    // Seed with only some v1 keys
    await page.evaluate(() => {
      localStorage.setItem(
        'pidicon:preferences:v1',
        JSON.stringify({
          version: 1,
          currentView: 'devices',
          // Missing: deviceCards, settingsTab, sceneManager, testsView, showDevScenes
        })
      );
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
    expect(prefs.currentView).toBe('devices');

    // Check defaults filled in
    expect(prefs.deviceCards).toEqual({});
    expect(prefs.settingsTab).toBe('devices');
    expect(prefs.sceneManager).toEqual({
      selectedDeviceIp: null,
      sortBy: 'sortOrder',
      searchQuery: '',
      bulkMode: false,
    });
    expect(prefs.testsView).toEqual({
      searchQuery: '',
      expandedSections: [],
    });
    expect(prefs.showDevScenes).toBe(false);
  });

  test('should migrate legacy boolean string to actual boolean', async ({
    page,
  }) => {
    // Seed legacy with string "true"
    await page.evaluate(() => {
      localStorage.setItem('pidicon:showDevScenes', '"true"');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs.showDevScenes).toBe(true);
    expect(typeof prefs.showDevScenes).toBe('boolean');
  });

  test('should handle legacy "false" string correctly', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('pidicon:showDevScenes', 'false');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs.showDevScenes).toBe(false);

    // Legacy key should be removed
    const legacy = await page.evaluate(() =>
      localStorage.getItem('pidicon:showDevScenes')
    );
    expect(legacy).toBeNull();
  });
});

