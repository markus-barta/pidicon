import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PIDICON_BASE_URL || 'http://miniserver24:10829';

test.describe('Device Card Preferences Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    // Wait for device cards to load
    await expect.poll(
      async () => page.locator('[data-test="device-card"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);
  });

  test('collapsed state persists across page reload', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const collapseButton = deviceCard.locator('.collapse-btn');

    // Get initial state (might be collapsed or expanded)
    const initiallyCollapsed = await deviceCard
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);

    // Toggle collapse state
    await collapseButton.click();
    await page.waitForTimeout(500); // Allow state to persist

    // Verify state changed
    const afterToggle = await deviceCard
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    expect(afterToggle).not.toBe(initiallyCollapsed);

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="device-card"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Verify state persisted
    const afterReload = await deviceCard
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    expect(afterReload).toBe(afterToggle);
  });

  test('show scene details toggle persists across page reload', async ({
    page,
  }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();

    // Expand card if collapsed
    const collapseButton = deviceCard.locator('.collapse-btn');
    const isCollapsed = await deviceCard
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    if (isCollapsed) {
      await collapseButton.click();
      await page.waitForTimeout(300);
    }

    // Find info button (scene details toggle)
    const infoButton = deviceCard
      .locator('.info-btn')
      .filter({ has: page.locator('svg') })
      .first();

    // Get initial state
    const initiallyVisible = await deviceCard
      .locator('.scene-description-card')
      .isVisible()
      .catch(() => false);

    // Toggle scene details
    await infoButton.click();
    await page.waitForTimeout(500);

    // Verify state changed
    const afterToggle = await deviceCard
      .locator('.scene-description-card')
      .isVisible()
      .catch(() => false);
    expect(afterToggle).not.toBe(initiallyVisible);

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="device-card"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Expand card again after reload
    const collapseButtonAfterReload = page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.collapse-btn');
    const isCollapsedAfterReload = await page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    if (isCollapsedAfterReload) {
      await collapseButtonAfterReload.click();
      await page.waitForTimeout(300);
    }

    // Verify toggle state persisted
    const afterReload = await page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.scene-description-card')
      .isVisible()
      .catch(() => false);
    expect(afterReload).toBe(afterToggle);
  });

  test('show performance metrics toggle persists across page reload', async ({
    page,
  }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();

    // Expand card if collapsed
    const collapseButton = deviceCard.locator('.collapse-btn');
    const isCollapsed = await deviceCard
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    if (isCollapsed) {
      await collapseButton.click();
      await page.waitForTimeout(300);
    }

    // Find perf button (metrics toggle) - look for chart icon
    const perfButtons = deviceCard.locator('.info-btn');
    let perfButton = null;
    const buttonCount = await perfButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      const button = perfButtons.nth(i);
      const tooltip = await button.getAttribute('title');
      if (tooltip && tooltip.toLowerCase().includes('performance')) {
        perfButton = button;
        break;
      }
    }

    if (!perfButton) {
      test.skip('Performance metrics button not found');
      return;
    }

    // Get initial state
    const initiallyVisible = await deviceCard
      .locator('.metrics-section')
      .isVisible()
      .catch(() => false);

    // Toggle performance metrics
    await perfButton.click();
    await page.waitForTimeout(500);

    // Verify state changed
    const afterToggle = await deviceCard
      .locator('.metrics-section')
      .isVisible()
      .catch(() => false);
    expect(afterToggle).not.toBe(initiallyVisible);

    // Reload page
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="device-card"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    // Expand card again after reload
    const collapseButtonAfterReload = page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.collapse-btn');
    const isCollapsedAfterReload = await page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    if (isCollapsedAfterReload) {
      await collapseButtonAfterReload.click();
      await page.waitForTimeout(300);
    }

    // Verify toggle state persisted
    const afterReload = await page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.metrics-section')
      .isVisible()
      .catch(() => false);
    expect(afterReload).toBe(afterToggle);
  });

  test('per-device preferences are independent', async ({ page }) => {
    const deviceCards = page.locator('[data-test="device-card"]');
    const cardCount = await deviceCards.count();

    if (cardCount < 2) {
      test.skip('Need at least 2 devices to test per-device preferences');
      return;
    }

    const card1 = deviceCards.first();
    const card2 = deviceCards.nth(1);

    // Get initial states
    const card1InitiallyCollapsed = await card1
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    const card2InitiallyCollapsed = await card2
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);

    // Toggle card1
    await card1.locator('.collapse-btn').click();
    await page.waitForTimeout(500);

    // Verify card1 changed, card2 unchanged
    const card1AfterToggle = await card1
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    const card2AfterToggle = await card2
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);

    expect(card1AfterToggle).not.toBe(card1InitiallyCollapsed);
    expect(card2AfterToggle).toBe(card2InitiallyCollapsed);

    // Reload and verify both states persisted independently
    await page.reload();
    await expect.poll(
      async () => page.locator('[data-test="device-card"]').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(2);

    const card1AfterReload = await page
      .locator('[data-test="device-card"]')
      .first()
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);
    const card2AfterReload = await page
      .locator('[data-test="device-card"]')
      .nth(1)
      .locator('.device-badges')
      .isVisible()
      .catch(() => false);

    expect(card1AfterReload).toBe(card1AfterToggle);
    expect(card2AfterReload).toBe(card2AfterToggle);
  });

  test('preferences stored in localStorage', async ({ page }) => {
    const deviceCard = page.locator('[data-test="device-card"]').first();
    const deviceIp = await deviceCard.getAttribute('data-device-ip');

    // Toggle collapse
    await deviceCard.locator('.collapse-btn').click();
    await page.waitForTimeout(500);

    // Check localStorage
    const preferences = await page.evaluate(() => {
      return localStorage.getItem('pidicon:preferences:v1');
    });

    expect(preferences).not.toBeNull();
    const prefs = JSON.parse(preferences);
    expect(prefs).toHaveProperty('deviceCards');
    expect(prefs.deviceCards).toHaveProperty(deviceIp);
    expect(prefs.deviceCards[deviceIp]).toHaveProperty('collapsed');
  });
});

