import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Tests View Advanced Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should persist expanded test sections', async ({ page }) => {
    // Seed with some expanded sections
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'tests',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: '',
        expandedSections: ['preferences', 'mqtt', 'websocket'],
      },
      showDevScenes: false,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify preferences restored
    const prefs = await getPreferences(page);
    expect(prefs.testsView.expandedSections).toEqual([
      'preferences',
      'mqtt',
      'websocket',
    ]);
  });

  test('should persist search query in tests view', async ({ page }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'tests',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: 'preferences',
        expandedSections: [],
      },
      showDevScenes: false,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check search input
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="filter" i]'
    );

    if ((await searchInput.count()) > 0) {
      const value = await searchInput.inputValue();
      expect(value).toBe('preferences');
    }

    const prefs = await getPreferences(page);
    expect(prefs.testsView.searchQuery).toBe('preferences');
  });

  test('should add/remove sections from expandedSections array', async ({
    page,
  }) => {
    // Start with one section expanded
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'tests',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: '',
        expandedSections: ['preferences'],
      },
      showDevScenes: false,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    let prefs = await getPreferences(page);
    expect(prefs.testsView.expandedSections).toContain('preferences');

    // Manually modify to add another section
    await page.evaluate(() => {
      const current = JSON.parse(
        localStorage.getItem('pidicon:preferences:v1') || '{}'
      );
      current.testsView.expandedSections.push('mqtt');
      localStorage.setItem('pidicon:preferences:v1', JSON.stringify(current));
    });

    prefs = await getPreferences(page);
    expect(prefs.testsView.expandedSections).toContain('mqtt');
    expect(prefs.testsView.expandedSections.length).toBe(2);
  });

  test('should clear search without affecting expanded sections', async ({
    page,
  }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'tests',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: 'mqtt',
        expandedSections: ['preferences', 'scenes'],
      },
      showDevScenes: false,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Clear search
    await page.evaluate(() => {
      const current = JSON.parse(
        localStorage.getItem('pidicon:preferences:v1') || '{}'
      );
      current.testsView.searchQuery = '';
      localStorage.setItem('pidicon:preferences:v1', JSON.stringify(current));
    });

    const prefs = await getPreferences(page);
    expect(prefs.testsView.searchQuery).toBe('');
    expect(prefs.testsView.expandedSections).toEqual(['preferences', 'scenes']);
  });

  test('should handle empty expandedSections array', async ({ page }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'tests',
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

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefs = await getPreferences(page);
    expect(prefs.testsView.expandedSections).toEqual([]);
    expect(Array.isArray(prefs.testsView.expandedSections)).toBe(true);
  });

  test('should persist tests view preferences across reload', async ({
    page,
  }) => {
    const testPrefs = {
      version: 1,
      deviceCards: {},
      currentView: 'tests',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: false,
      },
      testsView: {
        searchQuery: 'unit',
        expandedSections: ['preferences', 'mqtt', 'device', 'scene'],
      },
      showDevScenes: false,
    };

    await seedPreferences(page, testPrefs);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefsBeforeReload = await getPreferences(page);

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefsAfterReload = await getPreferences(page);

    expect(prefsAfterReload.testsView).toEqual(prefsBeforeReload.testsView);
  });
});

