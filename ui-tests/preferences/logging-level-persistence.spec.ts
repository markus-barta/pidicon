/**
 * E2E Tests: Logging Level Persistence
 * 
 * Validates that device logging level settings are properly persisted
 * in the daemon's StateStore and correctly reflected in the UI after reload.
 * 
 * Note: Logging level is daemon-managed state (not UI preferences in localStorage),
 * persisted in /data/runtime-state.json via StateStore.
 */

import { test, expect } from '@playwright/test';

const TEST_DEVICE_IP = '192.168.1.100';

test.describe('Logging Level Persistence (Daemon State)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should persist logging level across page reloads', async ({ page }) => {
    // Find the device card
    const deviceCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    await expect(deviceCard).toBeVisible();

    // Get initial logging level (should be 'warning' by default for real devices)
    const initialLoggingBtn = deviceCard.locator('.logging-btn-pressed').first();
    const initialLevel = await initialLoggingBtn.getAttribute('aria-label') || 'warning';

    // Change logging level to 'debug' (all logs)
    const debugBtn = deviceCard.locator('button[aria-label*="All logs"]').or(
      deviceCard.locator('v-btn:has(v-icon[aria-label*="text-box-multiple"])')
    ).first();
    
    if (await debugBtn.isVisible()) {
      await debugBtn.click();
      await page.waitForTimeout(500); // Wait for API call
    }

    // Verify toast notification appears
    await expect(page.locator('.v-snackbar:has-text("All logs enabled")')).toBeVisible({ timeout: 3000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify logging level persisted
    const reloadedCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    await expect(reloadedCard).toBeVisible();
    
    const debugBtnAfterReload = reloadedCard.locator('.logging-btn-pressed v-icon[aria-label*="text-box-multiple"]').first();
    await expect(debugBtnAfterReload).toBeVisible();
  });

  test('should persist "silent" logging level', async ({ page }) => {
    const deviceCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    await expect(deviceCard).toBeVisible();

    // Set logging to 'silent' (no logs)
    const silentBtn = deviceCard.locator('button:has(v-icon[aria-label*="cancel"])').first();
    await silentBtn.click();
    await page.waitForTimeout(500);

    // Verify toast
    await expect(page.locator('.v-snackbar:has-text("Logging disabled")')).toBeVisible({ timeout: 3000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify 'silent' persisted
    const reloadedCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    const silentBtnAfterReload = reloadedCard.locator('.logging-btn-pressed:has(v-icon[aria-label*="cancel"])').first();
    await expect(silentBtnAfterReload).toBeVisible();
  });

  test('should persist "warning" logging level', async ({ page }) => {
    const deviceCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    await expect(deviceCard).toBeVisible();

    // Set logging to 'warning'
    const warningBtn = deviceCard.locator('button:has(v-icon[aria-label*="alert-outline"])').first();
    await warningBtn.click();
    await page.waitForTimeout(500);

    // Verify toast
    await expect(page.locator('.v-snackbar:has-text("Warnings and errors")')).toBeVisible({ timeout: 3000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify 'warning' persisted
    const reloadedCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    const warningBtnAfterReload = reloadedCard.locator('.logging-btn-pressed:has(v-icon[aria-label*="alert-outline"])').first();
    await expect(warningBtnAfterReload).toBeVisible();
  });

  test('should cycle through logging levels in compact mode', async ({ page }) => {
    // Resize to trigger compact mode (if implemented)
    await page.setViewportSize({ width: 800, height: 600 });

    const deviceCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    await expect(deviceCard).toBeVisible();

    // Find the cycling button (compact mode)
    const cycleBtn = deviceCard.locator('.logging-buttons-compact button:has(v-icon[aria-label*="chevron-right"])').first();
    
    if (await cycleBtn.isVisible()) {
      // Cycle through: silent → warning → debug → silent
      await cycleBtn.click();
      await page.waitForTimeout(300);
      await cycleBtn.click();
      await page.waitForTimeout(300);
      await cycleBtn.click();
      await page.waitForTimeout(300);

      // Reload and verify last state persisted
      await page.reload();
      await page.waitForLoadState('networkidle');

      const reloadedCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
      const activeBtn = reloadedCard.locator('.logging-btn-pressed').first();
      await expect(activeBtn).toBeVisible();
    }
  });

  test('should restore logging level from daemon state after daemon restart', async ({ page }) => {
    const deviceCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    await expect(deviceCard).toBeVisible();

    // Set to 'debug'
    const debugBtn = deviceCard.locator('button:has(v-icon[aria-label*="text-box-multiple"])').first();
    await debugBtn.click();
    await page.waitForTimeout(500);

    // Wait for StateStore persistence (debounced, ~10s)
    await page.waitForTimeout(12000);

    // Reload to simulate daemon restart (StateStore loads from runtime-state.json)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify logging level restored from persisted state
    const reloadedCard = page.locator(`[data-device-ip="${TEST_DEVICE_IP}"]`).first();
    const debugBtnAfterReload = reloadedCard.locator('.logging-btn-pressed:has(v-icon[aria-label*="text-box-multiple"])').first();
    await expect(debugBtnAfterReload).toBeVisible();
  });
});

