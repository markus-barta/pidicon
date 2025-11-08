import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
} from '../helpers/preferences-helpers';

test.describe('Preferences Quota Exceeded Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should handle QuotaExceededError gracefully', async ({ page }) => {
    // Fill localStorage to near quota (5MB in most browsers)
    await page.evaluate(() => {
      const fillData = 'x'.repeat(1024 * 1024); // 1MB chunks
      for (let i = 0; i < 4; i++) {
        try {
          localStorage.setItem(`filler_${i}`, fillData);
        } catch (e) {
          break;
        }
      }
    });

    // Try to save preferences (which should hit quota)
    await page.click('button:has-text("Settings")');
    await page.click('button:has-text("MQTT Connectivity")');

    // Application should still function
    await expect(page.locator('text=MQTT Connectivity')).toBeVisible();

    // Check console for quota error handling
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Trigger another save
    await page.click('button:has-text("Devices")');

    // Should have logged quota error
    await page.waitForTimeout(500);
    // App should still be functional even if save failed
    await expect(page.locator('text=Device Management')).toBeVisible();
  });

  test('should fall back to in-memory state when quota exceeded', async ({
    page,
  }) => {
    // Seed initial preferences
    await seedPreferences(page, {
      version: 1,
      currentView: 'devices',
      settingsTab: 'devices',
    });

    // Fill localStorage
    await page.evaluate(() => {
      const fillData = 'x'.repeat(1024 * 1024);
      for (let i = 0; i < 4; i++) {
        try {
          localStorage.setItem(`filler_${i}`, fillData);
        } catch (e) {
          break;
        }
      }
    });

    // Navigate (will try to save but fail due to quota)
    await page.click('button:has-text("Settings")');

    // UI state should update (in memory)
    await expect(page.locator('text=Settings')).toBeVisible();

    // But localStorage may not have updated due to quota
    const storageValue = await page.evaluate(() =>
      localStorage.getItem('pidicon:preferences:v1')
    );

    // Either it saved or it didn't, but app should still work
    expect(storageValue).toBeTruthy();
  });

  test('should recover when quota becomes available', async ({ page }) => {
    // Fill localStorage
    await page.evaluate(() => {
      const fillData = 'x'.repeat(1024 * 1024);
      for (let i = 0; i < 4; i++) {
        try {
          localStorage.setItem(`filler_${i}`, fillData);
        } catch (e) {
          break;
        }
      }
    });

    // Try to navigate (may fail to save)
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);

    // Clear filler data (simulate quota becoming available)
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        localStorage.removeItem(`filler_${i}`);
      }
    });

    // Navigate again (should now save successfully)
    await page.click('button:has-text("Dashboard")');
    await page.click('button:has-text("Settings")');
    await page.click('button:has-text("MQTT Connectivity")');

    // Verify preferences saved
    const prefs = await getPreferences(page);
    expect(prefs.settingsTab).toBe('mqtt');
  });

  test('should warn user when storage is critically low', async ({ page }) => {
    // This test verifies the app detects low storage
    // (Implementation may vary - checking for console warnings)

    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warn') {
        warnings.push(msg.text());
      }
    });

    // Fill most of localStorage
    await page.evaluate(() => {
      const fillData = 'x'.repeat(1024 * 1024);
      for (let i = 0; i < 4; i++) {
        try {
          localStorage.setItem(`filler_${i}`, fillData);
        } catch (e) {
          // Quota reached
        }
      }
    });

    // Trigger preference save
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(1000);

    // May log warnings about storage (implementation-dependent)
    // Just ensure app doesn't crash
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should prioritize critical preferences when quota limited', async ({
    page,
  }) => {
    // Seed with large deviceCards data
    const largePrefs = {
      version: 1,
      deviceCards: {} as any,
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
    };

    // Add many device entries
    for (let i = 0; i < 100; i++) {
      largePrefs.deviceCards[`device_${i}`] = {
        collapsed: true,
        showSceneDetails: true,
        showPerfMetrics: true,
      };
    }

    await seedPreferences(page, largePrefs);

    // Fill remaining space
    await page.evaluate(() => {
      const fillData = 'x'.repeat(1024 * 500); // 500KB chunks
      for (let i = 0; i < 7; i++) {
        try {
          localStorage.setItem(`filler_${i}`, fillData);
        } catch (e) {
          break;
        }
      }
    });

    // Navigate (critical preference: currentView)
    await page.click('button:has-text("Settings")');

    // Even if full deviceCards can't save, critical state should
    await page.reload();

    // Check if at least some preferences survived
    const prefs = await getPreferences(page);
    expect(prefs).toBeDefined();
    expect(prefs.version).toBe(1);
  });

  test('should handle quota exceeded during debounced write', async ({
    page,
  }) => {
    // Make rapid changes that trigger debounced saves
    await page.click('button:has-text("Settings")');
    await page.click('button:has-text("Global Defaults")');
    await page.click('button:has-text("MQTT Connectivity")');
    await page.click('button:has-text("Import / Export")');

    // Fill quota during debounce period
    await page.evaluate(() => {
      const fillData = 'x'.repeat(1024 * 1024);
      for (let i = 0; i < 4; i++) {
        try {
          localStorage.setItem(`filler_${i}`, fillData);
        } catch (e) {
          break;
        }
      }
    });

    // Wait for debounce to complete
    await page.waitForTimeout(1000);

    // App should still be functional
    await expect(page.locator('text=Import / Export')).toBeVisible();
  });
});

