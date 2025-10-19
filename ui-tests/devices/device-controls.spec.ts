import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';
const API_DEVICES = `${BASE_URL}/api/devices`;
const API_SCENES = `${BASE_URL}/api/scenes`;

async function fetchDevices(page) {
  const response = await page.request.get(API_DEVICES);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).devices;
}

async function fetchSceneNames(page) {
  const response = await page.request.get(API_SCENES);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).scenes.map((scene) => scene.name);
}

test.describe('Devices view controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect.poll(async () => page.locator('.device-card').count(), {
      timeout: 30_000,
    }).toBeGreaterThan(0);
  });

  test('driver switch persists via API', async ({ page }) => {
    const deviceCard = page.locator('.device-card').first();
    const realButton = deviceCard.getByRole('button', { name: /^Real$/i });
    const mockButton = deviceCard.getByRole('button', { name: /^Mock$/i });

    const initial = (await fetchDevices(page))[0];
    const targetDriver = initial.driver === 'real' ? 'mock' : 'real';
    const targetButton = targetDriver === 'real' ? realButton : mockButton;

    await targetButton.click();
    await page.getByRole('button', { name: new RegExp(`Switch to ${targetDriver}`, 'i') }).click();

    await expect.poll(async () => (await fetchDevices(page))[0].driver, {
      timeout: 15_000,
    }).toBe(targetDriver);

    const restoreButton = targetDriver === 'real' ? mockButton : realButton;
    await restoreButton.click();
    await page.getByRole('button', { name: new RegExp(`Switch to ${initial.driver}`, 'i') }).click();

    await expect.poll(async () => (await fetchDevices(page))[0].driver, {
      timeout: 15_000,
    }).toBe(initial.driver);
  });

  test('brightness slider updates hardware state', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const sliderInput = deviceCard.locator('[data-test="brightness-slider"] input[type="range"]').first();

    await expect(sliderInput).toBeVisible({ timeout: 15_000 });

    const initial = (await fetchDevices(page))[0].hardware?.brightness ?? 100;
    const target = initial > 40 ? 20 : 80;

    await sliderInput.evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, target);

    await expect.poll(async () => (await fetchDevices(page))[0].hardware?.brightness, {
      timeout: 20_000,
    }).toBe(target);

    if (initial !== target) {
      await sliderInput.evaluate((input, value) => {
        input.value = String(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, initial);

      await expect.poll(async () => (await fetchDevices(page))[0].hardware?.brightness, {
        timeout: 20_000,
      }).toBe(initial);
    }
  });

  test('scene selector switches scene', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const sceneSelect = deviceCard.locator('[data-test="scene-selector"]');

    const sceneNames = await fetchSceneNames(page);
    const devices = await fetchDevices(page);
    const current = devices[0].currentScene || 'startup';
    const candidate = sceneNames.find((name) => name !== current) ?? current;

    await sceneSelect.click();
    const option = page.locator('.v-overlay-container .v-list-item-title', {
      hasText: new RegExp(candidate, 'i'),
    }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();

    await expect.poll(async () => (await fetchDevices(page))[0].currentScene, {
      timeout: 20_000,
    }).toBe(candidate);

    if (candidate !== current) {
      await sceneSelect.click();
      const restore = page.locator('.v-overlay-container .v-list-item-title', {
        hasText: new RegExp(current, 'i'),
      }).first();
      await expect(restore).toBeVisible({ timeout: 10_000 });
      await restore.click();

      await expect.poll(async () => (await fetchDevices(page))[0].currentScene, {
        timeout: 20_000,
      }).toBe(current);
    }
  });
});

