import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';

async function fetchScenes(request) {
  const response = await request.get(`${BASE_URL}/api/scenes`);
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

test.describe('Dev scenes toggle', () => {
  test('shows dev scenes only when toggle enabled', async ({ page, request }) => {
    const sceneResponse = await fetchScenes(request);
    const scenes = sceneResponse.scenes || [];
    const devScene = scenes.find((scene) => scene.isDevScene);
    test.skip(!devScene, 'No development scene available in API response');

    await page.goto(`${BASE_URL}/#/settings`);
    await page.getByRole('tab', { name: /Global Settings/i }).click();
    await expect(page.getByText('Global Defaults')).toBeVisible();

    await page.getByRole('tab', { name: /Devices/i }).click();
    const deviceCard = page.locator('[data-test="device-card"]').first();
    await expect(deviceCard).toBeVisible();

    const sceneSelect = deviceCard.locator('[data-test="scene-selector"]');
    await sceneSelect.click();
    const overlay = page.locator('.v-overlay-container');
    await expect(overlay).toBeVisible();
    await expect(
      overlay.locator('.v-list-item-title', {
        hasText: devScene.name,
      }),
    ).not.toBeVisible();
    await page.keyboard.press('Escape');

    const footerToggle = page.locator('[data-test="dev-scenes-toggle"]');
    const toggleEnabled = await footerToggle.isEnabled();
    test.skip(!toggleEnabled, 'Dev scenes toggle disabled (no dev scenes available)');

    await footerToggle.click();
    await expect(sceneSelect).toBeVisible();
    await sceneSelect.click();
    const devOption = overlay.locator('.v-list-item-title', {
      hasText: devScene.name,
    });
    await expect(devOption).toBeVisible();
  });
});

