/**
 * Playwright test helpers for UI preferences
 * Provides utilities to seed, clear, and verify preferences in tests
 */

import { Page } from '@playwright/test';

const STORAGE_KEY = 'pidicon:preferences:v1';

/**
 * Seed preferences in localStorage before test
 */
export async function seedPreferences(
  page: Page,
  preferences: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    (prefs) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    },
    preferences,
  );
}

/**
 * Clear all preferences from localStorage
 */
export async function clearPreferences(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem(STORAGE_KEY);
    // Also clear legacy key if present
    localStorage.removeItem('pidicon:showDevScenes');
  });
}

/**
 * Get current preferences from localStorage
 */
export async function getPreferences(page: Page): Promise<Record<string, unknown> | null> {
  return await page.evaluate(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
}

/**
 * Corrupt preferences in localStorage (for testing error handling)
 */
export async function corruptPreferences(
  page: Page,
  invalidJson: string = '{ invalid json }',
): Promise<void> {
  await page.evaluate(
    (json) => {
      localStorage.setItem(STORAGE_KEY, json);
    },
    invalidJson,
  );
}

/**
 * Simulate storage event (for testing multi-tab sync)
 * Note: This doesn't actually trigger a real storage event,
 * but can be used to test preference loading
 */
export async function simulateStorageEvent(
  page: Page,
  preferences: Record<string, unknown>,
): Promise<void> {
  // Set preferences and manually trigger preference reload
  await seedPreferences(page, preferences);
  // Note: Real storage events are browser-generated and can't be simulated
  // This helper is mainly for setting up test state
}

/**
 * Wait for preferences to be saved (useful after UI interactions)
 */
export async function waitForPreferencesSave(
  page: Page,
  timeout: number = 1000,
): Promise<void> {
  // Preferences are debounced (300ms), so wait a bit longer
  await page.waitForTimeout(timeout);
}

