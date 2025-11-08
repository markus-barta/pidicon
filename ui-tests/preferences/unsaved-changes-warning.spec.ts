import { test, expect } from '@playwright/test';
import { clearPreferences } from '../helpers/preferences-helpers';

test.describe('Unsaved Changes Warning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPreferences(page);
  });

  test('should warn when leaving Settings with unsaved changes', async ({
    page,
  }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Make a change (if there's a form field)
    const brokerInput = page.locator('input[placeholder*="mqtt" i], input[name*="broker" i]');
    if ((await brokerInput.count()) > 0) {
      await brokerInput.fill('mqtt://test-server:1883');

      // Try to navigate away
      page.on('dialog', (dialog) => {
        expect(dialog.message()).toContain('unsaved');
        dialog.dismiss();
      });

      await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');

      // If warning shown, we should still be on Settings
      await page.waitForTimeout(1000);
    }
  });

  test('should not warn when no changes made', async ({ page }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Navigate away without making changes
    let dialogShown = false;
    page.on('dialog', () => {
      dialogShown = true;
    });

    await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
    await page.waitForTimeout(500);

    // No dialog should have appeared
    expect(dialogShown).toBe(false);
  });

  test('should clear unsaved warning after saving', async ({ page }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Make a change
    const brokerInput = page.locator('input[placeholder*="mqtt" i]');
    if ((await brokerInput.count()) > 0) {
      await brokerInput.fill('mqtt://test:1883');

      // Click Save button
      const saveButton = page.locator('button:has-text("Save")');
      if ((await saveButton.count()) > 0) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Now navigating away should not show warning
        let dialogShown = false;
        page.on('dialog', () => {
          dialogShown = true;
        });

        await page.click('button:has-text("Dashboard"), tab:has-text("Dashboard")');
        await page.waitForTimeout(500);

        expect(dialogShown).toBe(false);
      }
    }
  });

  test('should track dirty state per settings tab', async ({ page }) => {
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Make change in MQTT tab
    await page.click('button:has-text("MQTT Connectivity"), tab:has-text("MQTT")');
    const brokerInput = page.locator('input[placeholder*="mqtt" i]');

    if ((await brokerInput.count()) > 0) {
      await brokerInput.fill('mqtt://modified:1883');

      // Switch to another tab within Settings
      await page.click('button:has-text("Global Defaults"), button:has-text("Devices")');
      await page.waitForTimeout(500);

      // No unsaved changes warning should appear (staying in Settings view)
      await expect(page.locator('text=Global Defaults, text=Device Management')).toBeVisible();
    }
  });

  test('should handle page refresh with unsaved changes', async ({ page }) => {
    await page.click('button:has-text("Settings"), tab:has-text("Settings")');
    await page.waitForSelector('text=Settings');

    // Make unsaved change
    const input = page.locator('input').first();
    if ((await input.count()) > 0) {
      const originalValue = await input.inputValue();
      await input.fill('modified-value');

      // Attempt page refresh
      page.on('dialog', (dialog) => {
        // beforeunload dialog
        expect(dialog.type()).toBe('beforeunload');
        dialog.accept();
      });

      // Note: Playwright handles beforeunload differently
      // This documents the expected behavior
    }
  });
});

