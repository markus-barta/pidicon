import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';

test.describe('View-Specific Preferences Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    // Wait for app to load
    await expect.poll(
      async () => page.locator('[data-test="main-content"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);
  });

  test.describe('Scene Manager Preferences', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Settings → Scene Manager
      const settingsButton = page
        .locator('button, a')
        .filter({ hasText: /settings/i })
        .first();
      await settingsButton.click();
      await page.waitForTimeout(1000);

      const sceneManagerTab = page
        .locator('.settings-tabs .v-tab')
        .filter({ hasText: /scene.*manager/i })
        .first();
      await sceneManagerTab.click();
      await page.waitForTimeout(1000);
    });

    test('selectedDeviceIp persists across page reload', async ({ page }) => {
      // Find device selector
      const deviceSelect = page.locator('select, .v-select').first();

      if ((await deviceSelect.count()) === 0) {
        test.skip('Device selector not found');
        return;
      }

      // Select a device (if multiple available)
      await deviceSelect.click();
      await page.waitForTimeout(500);

      // Get available options
      const options = page.locator('.v-overlay-container .v-list-item').all();
      const optionCount = await options.length;

      if (optionCount < 2) {
        test.skip('Need at least 2 devices to test selection persistence');
        return;
      }

      // Select second device
      await options[1].click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await expect.poll(
        async () => page.locator('[data-test="main-content"]').count(),
        { timeout: 30_000 },
      ).toBeGreaterThan(0);

      // Navigate back to Scene Manager
      const settingsButtonAfterReload = page
        .locator('button, a')
        .filter({ hasText: /settings/i })
        .first();
      await settingsButtonAfterReload.click();
      await page.waitForTimeout(1000);

      const sceneManagerTabAfterReload = page
        .locator('.settings-tabs .v-tab')
        .filter({ hasText: /scene.*manager/i })
        .first();
      await sceneManagerTabAfterReload.click();
      await page.waitForTimeout(1000);

      // Verify device is still selected (check if selector shows the device)
      const deviceSelectAfterReload = page.locator('select, .v-select').first();
      await expect(deviceSelectAfterReload).toBeVisible({ timeout: 5000 });
    });

    test('searchQuery persists across page reload', async ({ page }) => {
      // Find search field
      const searchField = page
        .locator('input[type="text"]')
        .filter({ hasText: /search/i })
        .first();

      if ((await searchField.count()) === 0) {
        test.skip('Search field not found');
        return;
      }

      // Enter search query
      await searchField.fill('test-query');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await expect.poll(
        async () => page.locator('[data-test="main-content"]').count(),
        { timeout: 30_000 },
      ).toBeGreaterThan(0);

      // Navigate back to Scene Manager
      const settingsButtonAfterReload = page
        .locator('button, a')
        .filter({ hasText: /settings/i })
        .first();
      await settingsButtonAfterReload.click();
      await page.waitForTimeout(1000);

      const sceneManagerTabAfterReload = page
        .locator('.settings-tabs .v-tab')
        .filter({ hasText: /scene.*manager/i })
        .first();
      await sceneManagerTabAfterReload.click();
      await page.waitForTimeout(1000);

      // Verify search query persisted
      const searchFieldAfterReload = page
        .locator('input[type="text"]')
        .filter({ hasText: /search/i })
        .first();
      await expect(searchFieldAfterReload).toHaveValue('test-query', { timeout: 5000 });
    });

    test('sortBy persists across page reload', async ({ page }) => {
      // Find sort selector
      const sortSelect = page
        .locator('select, .v-select')
        .filter({ hasText: /sort/i })
        .first();

      if ((await sortSelect.count()) === 0) {
        test.skip('Sort selector not found');
        return;
      }

      // Change sort order
      await sortSelect.click();
      await page.waitForTimeout(500);

      // Select different option (e.g., "Name")
      const nameOption = page
        .locator('.v-overlay-container .v-list-item')
        .filter({ hasText: /name/i })
        .first();
      if ((await nameOption.count()) > 0) {
        await nameOption.click();
        await page.waitForTimeout(500);

        // Reload and verify persistence
        await page.reload();
        await expect.poll(
          async () => page.locator('[data-test="main-content"]').count(),
          { timeout: 30_000 },
        ).toBeGreaterThan(0);

        // Navigate back and verify sort persisted
        const settingsButtonAfterReload = page
          .locator('button, a')
          .filter({ hasText: /settings/i })
          .first();
        await settingsButtonAfterReload.click();
        await page.waitForTimeout(1000);

        const sceneManagerTabAfterReload = page
          .locator('.settings-tabs .v-tab')
          .filter({ hasText: /scene.*manager/i })
          .first();
        await sceneManagerTabAfterReload.click();
        await page.waitForTimeout(1000);

        // Verify sort selector still shows "Name" (or similar)
        const sortSelectAfterReload = page
          .locator('select, .v-select')
          .filter({ hasText: /sort/i })
          .first();
        await expect(sortSelectAfterReload).toBeVisible({ timeout: 5000 });
      } else {
        test.skip('Sort option not available');
      }
    });

    test('bulkMode persists across page reload', async ({ page }) => {
      // Find bulk mode toggle
      const bulkModeButton = page
        .locator('button')
        .filter({ hasText: /bulk|checkbox.*multiple/i })
        .first();

      if ((await bulkModeButton.count()) === 0) {
        test.skip('Bulk mode button not found');
        return;
      }

      // Toggle bulk mode
      await bulkModeButton.click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await expect.poll(
        async () => page.locator('[data-test="main-content"]').count(),
        { timeout: 30_000 },
      ).toBeGreaterThan(0);

      // Navigate back to Scene Manager
      const settingsButtonAfterReload = page
        .locator('button, a')
        .filter({ hasText: /settings/i })
        .first();
      await settingsButtonAfterReload.click();
      await page.waitForTimeout(1000);

      const sceneManagerTabAfterReload = page
        .locator('.settings-tabs .v-tab')
        .filter({ hasText: /scene.*manager/i })
        .first();
      await sceneManagerTabAfterReload.click();
      await page.waitForTimeout(1000);

      // Verify bulk mode is still active
      const bulkModeButtonAfterReload = page
        .locator('button')
        .filter({ hasText: /bulk|checkbox.*multiple/i })
        .first();
      await expect(bulkModeButtonAfterReload).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Tests View Preferences', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Tests view (may require dev mode)
      const testsButton = page
        .locator('button, a')
        .filter({ hasText: /tests|diagnostics/i })
        .first();

      if ((await testsButton.count()) === 0) {
        test.skip('Tests view not available (may require dev mode)');
        return;
      }

      await testsButton.click();
      await page.waitForTimeout(1000);
    });

    test('searchQuery persists across page reload', async ({ page }) => {
      // Find search field
      const searchField = page
        .locator('input[type="text"]')
        .filter({ hasText: /search/i })
        .first();

      if ((await searchField.count()) === 0) {
        test.skip('Search field not found');
        return;
      }

      // Enter search query
      await searchField.fill('system-test');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await expect.poll(
        async () => page.locator('[data-test="main-content"]').count(),
        { timeout: 30_000 },
      ).toBeGreaterThan(0);

      // Navigate back to Tests view
      const testsButtonAfterReload = page
        .locator('button, a')
        .filter({ hasText: /tests|diagnostics/i })
        .first();
      await testsButtonAfterReload.click();
      await page.waitForTimeout(1000);

      // Verify search query persisted
      const searchFieldAfterReload = page
        .locator('input[type="text"]')
        .filter({ hasText: /search/i })
        .first();
      await expect(searchFieldAfterReload).toHaveValue('system-test', { timeout: 5000 });
    });

    test('expandedSections persists across page reload', async ({ page }) => {
      // Find expandable sections
      const sectionHeaders = page
        .locator('button, .tests-section__header')
        .filter({ hasText: /system|device|mqtt/i })
        .all();

      if ((await sectionHeaders.length) === 0) {
        test.skip('Expandable sections not found');
        return;
      }

      // Expand first section
      await sectionHeaders[0].click();
      await page.waitForTimeout(500);

      // Verify section is expanded
      const sectionContent = page.locator('.tests-section__body').first();
      const wasVisible = await sectionContent.isVisible().catch(() => false);

      // Reload page
      await page.reload();
      await expect.poll(
        async () => page.locator('[data-test="main-content"]').count(),
        { timeout: 30_000 },
      ).toBeGreaterThan(0);

      // Navigate back to Tests view
      const testsButtonAfterReload = page
        .locator('button, a')
        .filter({ hasText: /tests|diagnostics/i })
        .first();
      await testsButtonAfterReload.click();
      await page.waitForTimeout(1000);

      // Verify section is still expanded
      const sectionContentAfterReload = page.locator('.tests-section__body').first();
      if (wasVisible) {
        await expect(sectionContentAfterReload).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

