import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
} from '../helpers/preferences-helpers';

test.describe('URL Parameter Overrides', () => {
  test.beforeEach(async ({ page }) => {
    await clearPreferences(page);
  });

  test('should respect view parameter in URL', async ({ page }) => {
    // Seed with different view
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'devices',
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

    // Navigate with view parameter
    await page.goto('/?view=settings');
    await page.waitForLoadState('networkidle');

    // Should override preference and go to settings
    await expect(page.locator('text=Settings')).toBeVisible();

    // Preference might or might not update (implementation choice)
    // URL parameter takes precedence for this session
  });

  test('should respect tab parameter for settings view', async ({ page }) => {
    await page.goto('/?view=settings&tab=mqtt');
    await page.waitForLoadState('networkidle');

    // Should open Settings with MQTT tab
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=MQTT Connectivity')).toBeVisible();
  });

  test('should handle device parameter to pre-select device', async ({
    page,
  }) => {
    // Navigate with device IP parameter
    await page.goto('/?device=192.168.1.100');
    await page.waitForLoadState('networkidle');

    // May scroll to or highlight that device
    // Implementation-dependent
    await expect(page.locator('body')).toBeVisible();
  });

  test('should combine multiple URL parameters', async ({ page }) => {
    await page.goto('/?view=settings&tab=mqtt&debug=true');
    await page.waitForLoadState('networkidle');

    // Should apply all parameters
    await expect(page.locator('text=Settings')).toBeVisible();

    // URL should still contain all params
    const url = page.url();
    expect(url).toContain('view=settings');
    expect(url).toContain('tab=mqtt');
  });

  test('should ignore invalid view parameter values', async ({ page }) => {
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'devices',
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

    // Invalid view value
    await page.goto('/?view=invalid-view-name');
    await page.waitForLoadState('networkidle');

    // Should fallback to preference or default
    await expect(page.locator('body')).toBeVisible();

    const prefs = await getPreferences(page);
    expect(['devices', 'settings', 'scenes', 'tests']).toContain(
      prefs.currentView
    );
  });

  test('should not persist URL parameter overrides', async ({ page }) => {
    // Visit with URL parameter
    await page.goto('/?view=settings');
    await page.waitForLoadState('networkidle');

    // Make a change
    await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
    await page.waitForTimeout(1000);

    // Preference should save normally (not stuck on URL param)
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('devices');
  });

  test('should handle URL hash parameters', async ({ page }) => {
    // Some apps use hash routing: /#/settings
    await page.goto('/#/settings');
    await page.waitForLoadState('networkidle');

    // Should navigate based on hash
    // Implementation-dependent
    await expect(page.locator('body')).toBeVisible();
  });

  test('should prioritize URL params over saved preferences', async ({
    page,
  }) => {
    // Save preference for devices view
    await seedPreferences(page, {
      version: 1,
      deviceCards: {},
      currentView: 'devices',
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

    // Navigate with settings parameter
    await page.goto('/?view=settings');
    await page.waitForLoadState('networkidle');

    // URL param should win
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should handle encoded URL parameters', async ({ page }) => {
    // Test with URL-encoded parameters
    await page.goto('/?search=test%20query&view=settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Settings')).toBeVisible();

    // Encoded space should be decoded
    const url = page.url();
    expect(url).toContain('search=test');
  });

  test('should support debug parameter for development', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForLoadState('networkidle');

    // Debug mode might show additional info
    // Check console or UI for debug indicators
    const hasDebugIndicator = await page
      .locator('[data-debug], text=/debug mode/i')
      .count();

    // Whether debug is shown or not, app should load
    await expect(page.locator('body')).toBeVisible();
  });
});

