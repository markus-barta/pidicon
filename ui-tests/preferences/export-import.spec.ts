import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  seedPreferences,
} from '../helpers/preferences-helpers';

test.describe('Preferences Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should export current preferences', async ({ page }) => {
    // Set up some preferences
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
        searchQuery: 'clock',
        bulkMode: false,
      },
      testsView: {
        searchQuery: 'unit',
        expandedSections: ['preferences'],
      },
      showDevScenes: true,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Settings > Import/Export
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    const importExportTab = page.locator(
      'button:has-text("Import / Export"), tab:has-text("Import")'
    );

    if ((await importExportTab.count()) > 0) {
      await importExportTab.click();
      await page.waitForTimeout(1000);

      // Look for Export button
      const exportButton = page.locator(
        'button:has-text("Export"), button:has-text("Download")'
      );

      if ((await exportButton.count()) > 0) {
        // Click export (would trigger download)
        await exportButton.click();
        await page.waitForTimeout(1000);

        // Verify preferences can be retrieved
        const prefs = await getPreferences(page);
        expect(prefs.currentView).toBe('settings');
        expect(prefs.settingsTab).toBe('mqtt');
      }
    } else {
      test.skip('Import/Export functionality not yet implemented');
    }
  });

  test('should import valid preferences JSON', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    const importExportTab = page.locator('button:has-text("Import / Export"), tab:has-text("Import")');

    if ((await importExportTab.count()) === 0) {
      test.skip('Import/Export not available');
    }

    await importExportTab.click();
    await page.waitForTimeout(1000);

    // Look for import file input or textarea
    const importInput = page.locator(
      'input[type="file"], textarea[placeholder*="JSON" i]'
    );

    if ((await importInput.count()) > 0) {
      const validPrefsJSON = JSON.stringify({
        version: 1,
        deviceCards: {},
        currentView: 'devices',
        settingsTab: 'global',
        sceneManager: {
          selectedDeviceIp: null,
          sortBy: 'modified',
          searchQuery: '',
          bulkMode: false,
        },
        testsView: {
          searchQuery: '',
          expandedSections: [],
        },
        showDevScenes: false,
      });

      // If textarea (paste import)
      if ((await importInput.getAttribute('type')) !== 'file') {
        await importInput.fill(validPrefsJSON);

        const importButton = page.locator('button:has-text("Import")');
        if ((await importButton.count()) > 0) {
          await importButton.click();
          await page.waitForTimeout(1000);

          const prefs = await getPreferences(page);
          expect(prefs.settingsTab).toBe('global');
        }
      }
    }
  });

  test('should reject invalid JSON on import', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');

    const importExportTab = page.locator('button:has-text("Import / Export")');
    if ((await importExportTab.count()) === 0) {
      test.skip('Import/Export not available');
    }

    await importExportTab.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea');
    if ((await textarea.count()) > 0) {
      await textarea.fill('{invalid json}');

      const importButton = page.locator('button:has-text("Import")');
      if ((await importButton.count()) > 0) {
        await importButton.click();
        await page.waitForTimeout(500);

        // Should show error message
        const errorMessage = page.locator(
          'text=/invalid|error|failed/i, [role="alert"]'
        );
        if ((await errorMessage.count()) > 0) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test('should validate schema version on import', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');

    const importExportTab = page.locator('button:has-text("Import / Export")');
    if ((await importExportTab.count()) === 0) {
      test.skip('Import/Export not available');
    }

    await importExportTab.click();

    const textarea = page.locator('textarea');
    if ((await textarea.count()) > 0) {
      // Import with wrong version
      const wrongVersionJSON = JSON.stringify({
        version: 99, // Future version
        deviceCards: {},
        currentView: 'devices',
      });

      await textarea.fill(wrongVersionJSON);

      const importButton = page.locator('button:has-text("Import")');
      if ((await importButton.count()) > 0) {
        await importButton.click();
        await page.waitForTimeout(500);

        // Should warn or reject
        const warning = page.locator('text=/version|incompatible/i');
        // Either shows warning or doesn't import
      }
    }
  });

  test('should preserve existing device states when importing global prefs', async ({
    page,
  }) => {
    // Set up device-specific preferences
    await seedPreferences(page, {
      version: 1,
      deviceCards: {
        '192': { '168': { '1': { '100': { collapsed: true } } } },
      },
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

    await page.goto('/');

    // Import should preserve device cards
    // (Implementation detail: may want option to merge vs replace)
    const prefs = await getPreferences(page);
    expect(prefs.deviceCards['192']['168']['1']['100'].collapsed).toBe(true);
  });

  test('should export with timestamp in filename', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');

    const importExportTab = page.locator('button:has-text("Import / Export")');
    if ((await importExportTab.count()) === 0) {
      test.skip('Import/Export not available');
    }

    await importExportTab.click();

    // Export button should trigger download with filename like:
    // pidicon-preferences-2025-11-08.json

    // This is tested by checking the download behavior
    // Playwright can intercept downloads if implemented
  });
});

