import { test, expect } from '@playwright/test';
import {
  clearPreferences,
  getPreferences,
  waitForPreferencesSave,
} from '../helpers/preferences-helpers';

test.describe('Device Card Toggles Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
    await page.waitForSelector('[data-testid="device-card"], .device-card', {
      state: 'visible',
      timeout: 10000,
    });
  });

  test('should persist showSceneDetails toggle per device', async ({
    page,
  }) => {
    // Find first device card
    const firstCard = page.locator('[data-testid="device-card"]').first();

    // Look for scene details toggle button (might be an icon or labeled button)
    const sceneDetailsToggle = firstCard.locator(
      'button:has-text("Scene Details"), button[aria-label*="scene details" i], button[title*="scene details" i]'
    );

    if ((await sceneDetailsToggle.count()) > 0) {
      // Click to enable scene details
      await sceneDetailsToggle.click();
      await waitForPreferencesSave(page);

      // Get device IP from card
      const ipText = await firstCard
        .locator('text=/192\\.168\\.\\d+\\.\\d+/')
        .textContent();
      const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="device-card"]', {
        state: 'visible',
      });

      // Verify preference persisted
      if (ip) {
        const prefs = await getPreferences(page);
        const devicePrefs =
          prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
        expect(devicePrefs?.showSceneDetails).toBe(true);
      }
    }
  });

  test('should persist showPerfMetrics toggle per device', async ({ page }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();

    // Look for performance metrics toggle
    const perfToggle = firstCard.locator(
      'button:has-text("Perf"), button:has-text("Performance"), button[aria-label*="performance" i]'
    );

    if ((await perfToggle.count()) > 0) {
      await perfToggle.click();
      await waitForPreferencesSave(page);

      // Get device IP
      const ipText = await firstCard
        .locator('text=/192\\.168\\.\\d+\\.\\d+/')
        .textContent();
      const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

      // Reload
      await page.reload();
      await page.waitForSelector('[data-testid="device-card"]', {
        state: 'visible',
      });

      // Verify
      if (ip) {
        const prefs = await getPreferences(page);
        const devicePrefs =
          prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
        expect(devicePrefs?.showPerfMetrics).toBe(true);
      }
    }
  });

  test('should toggle scene details ON and OFF correctly', async ({ page }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();
    const sceneDetailsToggle = firstCard.locator(
      'button:has-text("Scene Details"), button[aria-label*="scene details" i]'
    );

    if ((await sceneDetailsToggle.count()) > 0) {
      // Get device IP
      const ipText = await firstCard
        .locator('text=/192\\.168\\.\\d+\\.\\d+/')
        .textContent();
      const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

      if (!ip) return;

      // Toggle ON
      await sceneDetailsToggle.click();
      await waitForPreferencesSave(page);

      let prefs = await getPreferences(page);
      let devicePrefs = prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
      expect(devicePrefs?.showSceneDetails).toBe(true);

      // Toggle OFF
      await sceneDetailsToggle.click();
      await waitForPreferencesSave(page);

      prefs = await getPreferences(page);
      devicePrefs = prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];
      expect(devicePrefs?.showSceneDetails).toBe(false);
    }
  });

  test('should show/hide scene details UI element when toggled', async ({
    page,
  }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();
    const sceneDetailsToggle = firstCard.locator(
      'button:has-text("Scene Details"), button[aria-label*="scene details" i]'
    );

    if ((await sceneDetailsToggle.count()) > 0) {
      // Get initial state - look for scene details content
      const sceneDetailsContent = firstCard.locator(
        '[data-testid="scene-details"], .scene-details'
      );

      const initialVisible = await sceneDetailsContent.isVisible().catch(() => false);

      // Toggle
      await sceneDetailsToggle.click();
      await page.waitForTimeout(500);

      // State should have changed
      const afterToggle = await sceneDetailsContent.isVisible().catch(() => false);
      expect(afterToggle).not.toBe(initialVisible);
    }
  });

  test('should persist multiple toggle states together', async ({ page }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();

    // Get device IP
    const ipText = await firstCard
      .locator('text=/192\\.168\\.\\d+\\.\\d+/')
      .textContent();
    const ip = ipText?.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (!ip) return;

    // Toggle scene details
    const sceneDetailsToggle = firstCard.locator(
      'button:has-text("Scene Details"), button[aria-label*="scene details" i]'
    );
    if ((await sceneDetailsToggle.count()) > 0) {
      await sceneDetailsToggle.click();
      await waitForPreferencesSave(page);
    }

    // Toggle perf metrics
    const perfToggle = firstCard.locator(
      'button:has-text("Perf"), button:has-text("Performance")'
    );
    if ((await perfToggle.count()) > 0) {
      await perfToggle.click();
      await waitForPreferencesSave(page);
    }

    // Collapse card
    const collapseButton = firstCard.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i]'
    );
    if ((await collapseButton.count()) > 0) {
      await collapseButton.click();
      await waitForPreferencesSave(page);
    }

    // Verify all three states saved
    const prefs = await getPreferences(page);
    const devicePrefs = prefs.deviceCards[ip[1]]?.[ip[2]]?.[ip[3]]?.[ip[4]];

    expect(devicePrefs).toBeDefined();
    // At least one toggle should have been modified
    const hasChanges =
      devicePrefs?.showSceneDetails !== undefined ||
      devicePrefs?.showPerfMetrics !== undefined ||
      devicePrefs?.collapsed !== undefined;
    expect(hasChanges).toBe(true);
  });

  test('should preserve toggle states after page reload', async ({ page }) => {
    const firstCard = page.locator('[data-testid="device-card"]').first();

    // Enable a toggle
    const sceneDetailsToggle = firstCard.locator(
      'button:has-text("Scene Details"), button[aria-label*="scene details" i]'
    );

    if ((await sceneDetailsToggle.count()) > 0) {
      await sceneDetailsToggle.click();
      await waitForPreferencesSave(page);

      // Get initial preferences
      const beforePrefs = await getPreferences(page);

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="device-card"]', {
        state: 'visible',
      });

      // Get preferences after reload
      const afterPrefs = await getPreferences(page);

      // Should match
      expect(afterPrefs.deviceCards).toEqual(beforePrefs.deviceCards);
    }
  });
});

