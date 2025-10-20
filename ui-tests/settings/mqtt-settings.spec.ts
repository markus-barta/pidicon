import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';
const PASSWORD_PLACEHOLDER = '********';

async function fetchMqttConfig(request) {
  const response = await request.get(`${BASE_URL}/api/system/mqtt-config`);
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

async function updateMqttConfig(request, patch) {
  const response = await request.post(`${BASE_URL}/api/system/mqtt-config`, {
    data: patch,
  });
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

test.describe('Global MQTT settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/#/settings`);
    await page.getByRole('tab', { name: /Global Settings/i }).click();
    await expect(page.getByText('MQTT Connectivity')).toBeVisible({ timeout: 10_000 });
  });

  test('updates persist via API and UI refresh', async ({ page, request }) => {
    const originalResponse = await fetchMqttConfig(request);
    const original = originalResponse.config;

    const form = {
      brokerUrl: 'mqtt://miniserver24:1884',
      username: 'playwright-user',
      password: 'playwright-pass',
      clientId: 'playwright-suite',
      keepalive: 45,
      tls: true,
    };

    await page.getByTestId('mqtt-broker-url').fill(form.brokerUrl);
    await page.getByTestId('mqtt-username').fill(form.username);
    await page.getByTestId('mqtt-password').fill(form.password);
    await page.getByTestId('mqtt-client-id').fill(form.clientId);
    await page.getByTestId('mqtt-keepalive').fill(String(form.keepalive));
    await page.getByTestId('mqtt-tls-toggle').setChecked(form.tls);

    await page.getByTestId('save-mqtt-settings').click();
    await expect(page.getByText(/MQTT settings saved/i)).toBeVisible({ timeout: 10_000 });

    const savedResponse = await fetchMqttConfig(request);
    const saved = savedResponse.config;
    const savedStatus = savedResponse.status;
    expect(saved.brokerUrl).toBe(form.brokerUrl);
    expect(saved.username).toBe(form.username);
    expect(saved.clientId).toBe(form.clientId);
    expect(saved.keepalive).toBe(form.keepalive);
    expect(saved.tls).toBe(true);
    expect(saved.hasPassword).toBe(true);
    expect(savedStatus.connected === true || savedStatus.connected === false).toBeTruthy();

    await page.reload();
    await page.getByRole('tab', { name: /Global Settings/i }).click();

    await expect(page.getByTestId('mqtt-broker-url')).toHaveValue(form.brokerUrl);
    await expect(page.getByTestId('mqtt-username')).toHaveValue(form.username);
    await expect(page.getByTestId('mqtt-password')).toHaveValue(PASSWORD_PLACEHOLDER);
    await expect(page.getByTestId('mqtt-client-id')).toHaveValue(form.clientId);
    await expect(page.getByTestId('mqtt-keepalive')).toHaveValue(String(form.keepalive));

    await page.getByTestId('mqtt-tls-toggle').setChecked(form.tls);

    await updateMqttConfig(request, original);
  });
});
