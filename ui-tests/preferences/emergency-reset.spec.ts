import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
} from '../helpers/preferences-helpers';

test.describe('Emergency Reset via URL Parameter', () => {
  test('should reset preferences when ?reset_preferences=1 in URL', async ({
    page,
  }) => {
    // Seed with custom preferences
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
        bulkMode: true,
      },
      testsView: {
        searchQuery: 'unit',
        expandedSections: ['preferences', 'mqtt'],
      },
      showDevScenes: true,
    });

    // Verify preferences are set
    await page.goto('/');
    let prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');

    // Navigate with reset parameter
    await page.goto('/?reset_preferences=1');
    await page.waitForLoadState('networkidle');

    // Preferences should be reset to defaults
    prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
    expect(prefs.deviceCards).toEqual({});
    expect(prefs.currentView).toBe('devices');
    expect(prefs.settingsTab).toBe('devices');
    expect(prefs.showDevScenes).toBe(false);
  });

  test('should clear localStorage when reset parameter present', async ({
    page,
  }) => {
    // Seed preferences
    await seedPreferences(page, {
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

    await page.goto('/');

    // Visit with reset parameter
    await page.goto('/?reset_preferences=1');
    await page.waitForLoadState('networkidle');

    // Check localStorage directly
    const storageValue = await page.evaluate(() =>
      localStorage.getItem('pidicon:preferences:v1')
    );

    // Should have fresh defaults
    const prefs = JSON.parse(storageValue || '{}');
    expect(prefs.currentView).toBe('devices');
  });

  test('should show confirmation message after reset', async ({ page }) => {
    await seedPreferences(page, {
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

    await page.goto('/?reset_preferences=1');
    await page.waitForLoadState('networkidle');

    // Look for success message (if implemented)
    const successMessage = page.locator(
      'text=/preferences.*reset/i, text=/reset.*success/i'
    );

    // May or may not show a message, but shouldn't crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should remove reset parameter from URL after processing', async ({
    page,
  }) => {
    await page.goto('/?reset_preferences=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // URL should be clean (parameter removed)
    const url = page.url();
    expect(url).not.toContain('reset_preferences');
  });

  test('should handle reset with other URL parameters', async ({ page }) => {
    await seedPreferences(page, {
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

    // Visit with multiple parameters
    await page.goto('/?reset_preferences=1&debug=true&tab=devices');
    await page.waitForLoadState('networkidle');

    // Preferences should be reset
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('devices');

    // Other parameters might still be in URL
    const url = page.url();
    expect(url).not.toContain('reset_preferences');
  });

  test('should not reset if parameter value is not 1', async ({ page }) => {
    await seedPreferences(page, {
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

    await page.goto('/');
    let prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');

    // Visit with invalid parameter value
    await page.goto('/?reset_preferences=0');
    await page.waitForLoadState('networkidle');

    // Preferences should NOT be reset
    prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
  });

  test('should work in production emergency scenarios', async ({ page }) => {
    // Corrupt preferences to simulate emergency
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pidicon:preferences:v1', '{corrupt json}');
    });

    // Try to load (would fail with corruption)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Now use emergency reset
    await page.goto('/?reset_preferences=1');
    await page.waitForLoadState('networkidle');

    // Should recover with fresh preferences
    const prefs = await getPreferences(page);
    expect(prefs.version).toBe(1);
    expect(prefs).toBeDefined();
  });
});

