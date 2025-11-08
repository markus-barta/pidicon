import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Scene Manager Advanced Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should persist selected device filter in scene manager', async ({
    page,
  }) => {
    // Navigate to Scene Manager (if it exists as a view)
    const sceneManagerButton = page.locator(
      'button:has-text("Scene Manager"), button:has-text("Scenes")'
    );

    if ((await sceneManagerButton.count()) === 0) {
      test.skip('Scene Manager view not found');
    }

    await sceneManagerButton.click();
    await page.waitForTimeout(1000);

    // Select a device filter (if available)
    const deviceFilter = page.locator(
      'select[name*="device" i], [data-testid="device-filter"]'
    );

    if ((await deviceFilter.count()) > 0) {
      await deviceFilter.selectOption({ index: 1 });
      await waitForPreferencesSave(page);

      const prefs = await getPreferences(page);
      expect(prefs.sceneManager.selectedDeviceIp).toBeTruthy();

      // Reload and verify
      await page.reload();
      await page.waitForLoadState('networkidle');

      const prefsAfter = await getPreferences(page);
      expect(prefsAfter.sceneManager.selectedDeviceIp).toBe(
        prefs.sceneManager.selectedDeviceIp
      );
    }
  });

  test('should persist search query in scene manager', async ({ page }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'scenes',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: 'clock',
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

    // Check if search query is restored
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[name*="search" i]'
    );

    if ((await searchInput.count()) > 0) {
      const value = await searchInput.inputValue();
      expect(value).toBe('clock');
    }
  });

  test('should persist sort order preference', async ({ page }) => {
    const sceneManagerButton = page.locator(
      'button:has-text("Scene Manager"), button:has-text("Scenes")'
    );

    if ((await sceneManagerButton.count()) === 0) {
      test.skip('Scene Manager not available');
    }

    await sceneManagerButton.click();
    await page.waitForTimeout(1000);

    // Find sort dropdown
    const sortSelect = page.locator(
      'select[name*="sort" i], [data-testid="sort-select"]'
    );

    if ((await sortSelect.count()) > 0) {
      // Change sort order
      await sortSelect.selectOption('name');
      await waitForPreferencesSave(page);

      let prefs = await getPreferences(page);
      expect(prefs.sceneManager.sortBy).toBe('name');

      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');

      prefs = await getPreferences(page);
      expect(prefs.sceneManager.sortBy).toBe('name');
    }
  });

  test('should persist bulk mode toggle', async ({ page }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'scenes',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: null,
        sortBy: 'sortOrder',
        searchQuery: '',
        bulkMode: true,
      },
      testsView: {
        searchQuery: '',
        expandedSections: [],
      },
      showDevScenes: false,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify bulk mode is enabled (if UI shows this)
    const bulkModeToggle = page.locator(
      'button:has-text("Bulk"), input[type="checkbox"][name*="bulk" i]'
    );

    if ((await bulkModeToggle.count()) > 0) {
      // Check if toggle reflects saved state
      const isChecked = await bulkModeToggle.isChecked().catch(() => false);
      expect(isChecked).toBe(true);
    }
  });

  test('should clear search and filters independently', async ({ page }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'scenes',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: '192.168.1.100',
        sortBy: 'name',
        searchQuery: 'test-scene',
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

    // Clear search
    const searchInput = page.locator('input[placeholder*="search" i]');
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('');
      await waitForPreferencesSave(page);

      const prefs = await getPreferences(page);
      expect(prefs.sceneManager.searchQuery).toBe('');
      expect(prefs.sceneManager.selectedDeviceIp).toBe('192.168.1.100'); // Still set
    }
  });

  test('should handle all scene manager preferences together', async ({
    page,
  }) => {
    const fullPrefs = {
      version: 1,
      deviceCards: {},
      currentView: 'scenes',
      settingsTab: 'devices',
      sceneManager: {
        selectedDeviceIp: '192.168.1.189',
        sortBy: 'modified',
        searchQuery: 'clock',
        bulkMode: true,
      },
      testsView: {
        searchQuery: '',
        expandedSections: [],
      },
      showDevScenes: true,
    };

    await seedPreferences(page, fullPrefs);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all preferences restored
    const prefs = await getPreferences(page);
    expect(prefs.sceneManager).toEqual(fullPrefs.sceneManager);
  });
});

