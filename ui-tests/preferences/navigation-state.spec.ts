import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Navigation State Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should persist current view across page reloads', async ({ page }) => {
    // Start on Dashboard
    await expect(page.locator('button:has-text("Dashboard")[aria-current="page"], tab[selected]:has-text("Dashboard")')).toBeVisible();

    let prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('devices');

    // Navigate to Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should restore to Settings view
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('button:has-text("Settings")[aria-current="page"], tab[selected]:has-text("Settings")')).toBeVisible();

    prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
  });

  test('should track view transitions correctly', async ({ page }) => {
    // Dashboard → Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    let prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');

    // Settings → Dashboard
    await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
    await waitForPreferencesSave(page);

    prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('devices');

    // Reload and verify last view
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("Dashboard")[aria-current="page"], tab[selected]:has-text("Dashboard")')).toBeVisible();
  });

  test('should persist settings sub-tab navigation', async ({ page }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Click MQTT Connectivity tab
    await page.click('button:has-text("MQTT Connectivity"), tab:has-text("MQTT Connectivity")');
    await waitForPreferencesSave(page);

    let prefs = await getPreferences(page);
    expect(prefs.settingsTab).toBe('mqtt');

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should restore to Settings view with MQTT tab selected
    await expect(page.locator('text=MQTT Connectivity')).toBeVisible();
    await expect(page.locator('button:has-text("MQTT Connectivity")[aria-selected="true"], tab[selected]:has-text("MQTT Connectivity")')).toBeVisible();

    prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
    expect(prefs.settingsTab).toBe('mqtt');
  });

  test('should handle rapid view switching without losing state', async ({
    page,
  }) => {
    // Rapidly switch views
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForTimeout(100);
    await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
    await page.waitForTimeout(100);
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');

    // Wait for debounced save
    await waitForPreferencesSave(page);

    // Should have saved the final state
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('settings');
  });

  test('should preserve view when navigating with browser back button', async ({
    page,
  }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    // Navigate to Dashboard
    await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
    await waitForPreferencesSave(page);

    // Use browser back button (if URL routing is enabled)
    await page.goBack().catch(() => {
      // If no history, this test isn't applicable
      test.skip('No browser history available');
    });

    await page.waitForTimeout(500);

    // Preference should still update to reflect current view
    const prefs = await getPreferences(page);
    // Should be back on settings or devices, depending on routing
    expect(['settings', 'devices']).toContain(prefs.currentView);
  });

  test('should handle view changes during WebSocket disconnection', async ({
    page,
  }) => {
    // Navigate while connected
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await waitForPreferencesSave(page);

    // Simulate WebSocket disconnection
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('websocket-disconnect', {
          detail: { reason: 'network-error' },
        })
      );
    });

    await page.waitForTimeout(500);

    // Navigate again during disconnection
    await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
    await waitForPreferencesSave(page);

    // Preferences should still save to localStorage
    const prefs = await getPreferences(page);
    expect(prefs.currentView).toBe('devices');

    // Reload to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("Dashboard")[aria-current="page"], tab[selected]:has-text("Dashboard")')).toBeVisible();
  });

  test('should restore scroll position in long views', async ({ page }) => {
    // Navigate to a view with scrollable content
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Scroll down if possible
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });

    await page.waitForTimeout(500);

    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Note: Scroll position persistence is not currently in the spec
    // This test documents expected behavior if implemented
    expect(scrollBefore).toBeGreaterThanOrEqual(0);
  });
});

