import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Multiple Device Preferences Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
    await page.waitForSelector('[data-testid="device-card"], .device-card', {
      state: 'visible',
      timeout: 10000,
    });
  });

  test('should maintain separate preferences for each device', async ({
    page,
  }) => {
    const deviceCards = page.locator('[data-testid="device-card"]');
    const deviceCount = await deviceCards.count();

    if (deviceCount < 2) {
      test.skip('Need at least 2 devices for this test');
    }

    // Collapse first device
    const firstCard = deviceCards.nth(0);
    const firstCollapse = firstCard.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i]'
    );
    await firstCollapse.click();
    await waitForPreferencesSave(page);

    // Ensure second device is expanded (don't collapse it)
    // Get both device IPs
    const firstIp = await firstCard
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();
    const secondCard = deviceCards.nth(1);
    const secondIp = await secondCard
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();

    // Verify preferences
    const prefs = await getPreferences(page);
    const firstMatch = firstIp?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
    const secondMatch = secondIp?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (firstMatch && secondMatch) {
      const firstPrefs =
        prefs.deviceCards[firstMatch[1]]?.[firstMatch[2]]?.[firstMatch[3]]?.[
          firstMatch[4]
        ];
      const secondPrefs =
        prefs.deviceCards[secondMatch[1]]?.[secondMatch[2]]?.[
          secondMatch[3]
        ]?.[secondMatch[4]];

      // First device should be collapsed
      expect(firstPrefs?.collapsed).toBe(true);

      // Second device should NOT have collapsed preference (or be explicitly false)
      expect(secondPrefs?.collapsed).not.toBe(true);
    }
  });

  test('should not affect other devices when changing one device preference', async ({
    page,
  }) => {
    const deviceCards = page.locator('[data-testid="device-card"]');
    const deviceCount = await deviceCards.count();

    if (deviceCount < 3) {
      test.skip('Need at least 3 devices for comprehensive isolation test');
    }

    // Modify first device
    await deviceCards.nth(0).locator('button').first().click();
    await waitForPreferencesSave(page);

    // Modify second device
    await deviceCards.nth(1).locator('button').first().click();
    await waitForPreferencesSave(page);

    // Third device should have no preferences
    const thirdIp = await deviceCards
      .nth(2)
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();
    const prefs = await getPreferences(page);
    const thirdMatch = thirdIp?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (thirdMatch) {
      const thirdPrefs =
        prefs.deviceCards[thirdMatch[1]]?.[thirdMatch[2]]?.[thirdMatch[3]]?.[
          thirdMatch[4]
        ];
      expect(thirdPrefs).toBeUndefined();
    }
  });

  test('should handle same IP on different network segments', async ({
    page,
  }) => {
    // This tests the nested structure: deviceCards[192][168][1][100] vs [192][168][2][100]
    // We can't create devices dynamically, so this validates the data structure

    const prefs = await getPreferences(page);

    // Manually seed test data to verify structure
    await page.evaluate(() => {
      const testPrefs = {
        version: 1,
        deviceCards: {
          '192': {
            '168': {
              '1': {
                '100': { collapsed: true },
                '101': { collapsed: false },
              },
              '2': {
                '100': { collapsed: false }, // Same last octet, different segment
              },
            },
          },
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
      };
      localStorage.setItem('pidicon:preferences:v1', JSON.stringify(testPrefs));
    });

    await page.reload();
    const newPrefs = await getPreferences(page);

    // Verify isolation
    expect(newPrefs.deviceCards['192']['168']['1']['100'].collapsed).toBe(true);
    expect(newPrefs.deviceCards['192']['168']['2']['100'].collapsed).toBe(
      false
    );
  });

  test('should reload each device with its individual preferences', async ({
    page,
  }) => {
    const deviceCards = page.locator('[data-testid="device-card"]');
    const deviceCount = await deviceCards.count();

    if (deviceCount < 2) {
      test.skip('Need at least 2 devices');
    }

    // Collapse first device
    await deviceCards
      .nth(0)
      .locator('button[aria-label*="collapse" i]')
      .click();
    await waitForPreferencesSave(page);

    // Get initial state
    const firstCardCollapsed = await deviceCards
      .nth(0)
      .locator('button[aria-label*="expand" i]')
      .count();
    const secondCardCollapsed = await deviceCards
      .nth(1)
      .locator('button[aria-label*="expand" i]')
      .count();

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="device-card"]', {
      state: 'visible',
    });

    // Verify states restored
    const firstCardCollapsedAfter = await deviceCards
      .nth(0)
      .locator('button[aria-label*="expand" i]')
      .count();
    const secondCardCollapsedAfter = await deviceCards
      .nth(1)
      .locator('button[aria-label*="expand" i]')
      .count();

    expect(firstCardCollapsedAfter).toBe(firstCardCollapsed);
    expect(secondCardCollapsedAfter).toBe(secondCardCollapsed);
  });

  test('should handle device IP changes gracefully', async ({ page }) => {
    // Simulate a device changing IP (manually modify preferences)
    await page.evaluate(() => {
      const prefs = {
        version: 1,
        deviceCards: {
          '192': {
            '168': {
              '1': {
                '100': { collapsed: true }, // Old IP
              },
            },
          },
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
      };
      localStorage.setItem('pidicon:preferences:v1', JSON.stringify(prefs));
    });

    await page.reload();
    await page.waitForSelector('[data-testid="device-card"]', {
      state: 'visible',
    });

    // App should load without errors even if device at 192.168.1.100 doesn't exist
    await expect(page.locator('[data-testid="device-card"]').first()).toBeVisible();

    // Preferences for non-existent device should be retained (for when it comes back)
    const prefs = await getPreferences(page);
    expect(prefs.deviceCards['192']?.['168']?.['1']?.['100']?.collapsed).toBe(
      true
    );
  });
});

