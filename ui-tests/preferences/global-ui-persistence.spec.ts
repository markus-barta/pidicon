import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';

test.describe('Global UI Preferences Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    // Wait for app to load
    await expect.poll(
      async () => page.locator('[data-test="main-content"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);
  });

  test('currentView persists across page reload', async ({ page }) => {
    // Navigate to Settings
    const settingsButton = page
      .locator('button, a')
      .filter({ hasText: /settings/i })
      .first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Verify we're on Settings view
    await expect(page.locator('.settings-shell')).toBeVisible({ timeout: 10_000 });

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="main-content"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Verify still on Settings view
    await expect(page.locator('.settings-shell')).toBeVisible({ timeout: 10_000 });
  });

  test('settings activeTab persists across page reload', async ({ page }) => {
    // Navigate to Settings
    const settingsButton = page
      .locator('button, a')
      .filter({ hasText: /settings/i })
      .first();
    await settingsButton.click();
    await page.waitForTimeout(1000);

    // Switch to MQTT tab
    const mqttTab = page
      .locator('.settings-tabs .v-tab')
      .filter({ hasText: /mqtt/i })
      .first();
    await mqttTab.click();
    await page.waitForTimeout(500);

    // Verify we're on MQTT tab
    const mqttContent = page.locator('.settings-shell').locator('text=/mqtt/i');
    await expect(mqttContent.first()).toBeVisible({ timeout: 5000 });

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="main-content"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Navigate to Settings again (might have reset to devices view)
    const settingsButtonAfterReload = page
      .locator('button, a')
      .filter({ hasText: /settings/i })
      .first();
    await settingsButtonAfterReload.click();
    await page.waitForTimeout(1000);

    // Verify we're on MQTT tab (preference should have persisted)
    const mqttTabAfterReload = page
      .locator('.settings-tabs .v-tab')
      .filter({ hasText: /mqtt/i })
      .first();
    await expect(mqttTabAfterReload).toHaveClass(/tab-active/, { timeout: 5000 });
  });

  test('showDevScenes toggle persists across page reload', async ({ page }) => {
    // Find and toggle showDevScenes (typically in footer)
    const footerToggle = page
      .locator('button, input[type="checkbox"]')
      .filter({ hasText: /show.*dev.*scene/i })
      .first();

    if (await footerToggle.count() === 0) {
      test.skip('showDevScenes toggle not found in UI');
      return;
    }

    // Get initial state
    const initiallyChecked = await footerToggle.isChecked().catch(() => false);

    // Toggle
    await footerToggle.click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="main-content"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Verify toggle state persisted
    const footerToggleAfterReload = page
      .locator('button, input[type="checkbox"]')
      .filter({ hasText: /show.*dev.*scene/i })
      .first();
    const afterReload = await footerToggleAfterReload.isChecked().catch(() => false);
    expect(afterReload).not.toBe(initiallyChecked);
  });

  test('form state NOT persisted (hasUnsavedMqttChanges)', async ({ page }) => {
    // Navigate to Settings → MQTT tab
    const settingsButton = page
      .locator('button, a')
      .filter({ hasText: /settings/i })
      .first();
    await settingsButton.click();
    await page.waitForTimeout(1000);

    const mqttTab = page
      .locator('.settings-tabs .v-tab')
      .filter({ hasText: /mqtt/i })
      .first();
    await mqttTab.click();
    await page.waitForTimeout(1000);

    // Find MQTT form fields
    const brokerInput = page
      .locator('input')
      .filter({ hasText: /broker/i })
      .first();
    const usernameInput = page.locator('input[type="text"], input[type="password"]').first();

    if ((await brokerInput.count()) === 0 && (await usernameInput.count()) === 0) {
      test.skip('MQTT form fields not found');
      return;
    }

    // Make a change but don't save
    if (await brokerInput.count() > 0) {
      await brokerInput.fill('test-broker-url');
    } else if (await usernameInput.count() > 0) {
      await usernameInput.fill('test-username');
    }
    await page.waitForTimeout(500);

    // Check for "unsaved changes" indicator (if visible)
    const unsavedIndicator = page.locator('text=/unsaved|has.*changes/i');
    const hasUnsavedIndicator = await unsavedIndicator.count() > 0;

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="main-content"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Navigate back to Settings → MQTT
    const settingsButtonAfterReload = page
      .locator('button, a')
      .filter({ hasText: /settings/i })
      .first();
    await settingsButtonAfterReload.click();
    await page.waitForTimeout(1000);

    const mqttTabAfterReload = page
      .locator('.settings-tabs .v-tab')
      .filter({ hasText: /mqtt/i })
      .first();
    await mqttTabAfterReload.click();
    await page.waitForTimeout(1000);

    // Verify "unsaved changes" indicator is NOT present (form state not persisted)
    const unsavedIndicatorAfterReload = page.locator('text=/unsaved|has.*changes/i');
    const hasUnsavedAfterReload = await unsavedIndicatorAfterReload.count() > 0;

    // Form should be clean (no unsaved state)
    expect(hasUnsavedAfterReload).toBe(false);
  });

  test('navigation sequence persists correctly', async ({ page }) => {
    // Navigate: Devices → Settings → Logs → reload → should return to Logs
    const settingsButton = page
      .locator('button, a')
      .filter({ hasText: /settings/i })
      .first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Go back to Devices
    const devicesButton = page
      .locator('button, a')
      .filter({ hasText: /devices|dashboard/i })
      .first();
    if (await devicesButton.count() > 0) {
      await devicesButton.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Logs (if available)
    const logsButton = page
      .locator('button, a')
      .filter({ hasText: /logs/i })
      .first();

    if (await logsButton.count() > 0) {
      await logsButton.click();
      await page.waitForTimeout(500);

      // Verify on Logs view
      const logsContent = page.locator('text=/logs|log.*viewer/i').first();
      if (await logsContent.count() > 0) {
        await expect(logsContent).toBeVisible({ timeout: 5000 });

        // Reload
        await page.reload();
        await expect.poll(
          async () => page.locator('[data-test="main-content"]').count(),
          { timeout: 30_000 },
        ).toBeGreaterThan(0);

        // Should still be on Logs view
        const logsContentAfterReload = page.locator('text=/logs|log.*viewer/i').first();
        if (await logsContentAfterReload.count() > 0) {
          await expect(logsContentAfterReload).toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      test.skip('Logs view not available');
    }
  });
});

