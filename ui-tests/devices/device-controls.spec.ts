import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';
const API_DEVICES = `${BASE_URL}/api/devices`;
const API_SCENES = `${BASE_URL}/api/scenes`;

async function fetchDevices(page) {
  const response = await page.request.get(API_DEVICES);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).devices;
}

async function fetchScenes(page) {
  const response = await page.request.get(API_SCENES);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).scenes.map((s) => s.name);
}

test.describe('Devices view controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect.poll(async () => page.locator('[data-test="device-card"]').count(), {
      timeout: 30_000,
    }).toBeGreaterThan(0);
  });

  test('driver switch persists via API', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const real = deviceCard.locator('[data-test="device-driver-real"]');
    const mock = deviceCard.locator('[data-test="device-driver-mock"]');

    const initial = (await fetchDevices(page))[0];
    const targetDriver = initial.driver === 'real' ? 'mock' : 'real';

    const targetButton = targetDriver === 'real' ? real : mock;
    await targetButton.click();

    await expect.poll(async () => (await fetchDevices(page))[0].driver, {
      timeout: 15_000,
    }).toBe(targetDriver);

    const restoreButton = targetDriver === 'real' ? mock : real;
    await restoreButton.click();
    await expect.poll(async () => (await fetchDevices(page))[0].driver, {
      timeout: 15_000,
    }).toBe(initial.driver);
  });

  test('brightness slider updates hardware state', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const slider = deviceCard.locator('[data-test="brightness-slider"] input');

    const initial = (await fetchDevices(page))[0].hardware?.brightness ?? 100;
    const target = initial > 40 ? 20 : 80;

    await slider.evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, target);

    await expect.poll(async () => (await fetchDevices(page))[0].hardware?.brightness, {
      timeout: 15_000,
    }).toBe(target);

    // Restore brightness
    await slider.evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, initial);
    await expect.poll(async () => (await fetchDevices(page))[0].hardware?.brightness, {
      timeout: 15_000,
    }).toBe(initial);
  });

  test('scene selector switches scene', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const sceneSelect = deviceCard.locator('[data-test="scene-selector"]');

    const scenes = await fetchScenes(page);
    const devices = await fetchDevices(page);
    const current = devices[0].currentScene || 'startup';
    const candidate = scenes.find((name) => name !== current) ?? current;

    await sceneSelect.click();
    await page.getByRole('option', { name: new RegExp(candidate, 'i') }).first().click();

    await expect.poll(async () => (await fetchDevices(page))[0].currentScene, {
      timeout: 15_000,
    }).toBe(candidate);

    if (candidate !== current) {
      await sceneSelect.click();
      await page.getByRole('option', { name: new RegExp(current, 'i') }).first().click();
      await expect.poll(async () => (await fetchDevices(page))[0].currentScene, {
        timeout: 15_000,
      }).toBe(current);
    }
  });
});

