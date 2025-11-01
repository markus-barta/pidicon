/**
 * UI Preferences Composable
 * Centralized localStorage-based preference management with schema versioning,
 * migration support, and multi-tab synchronization.
 *
 * @description Manages all UI layout preferences (collapsed cards, view state, filters)
 * separate from daemon-managed device state (brightness, scenes, play state).
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from './useToast';

const STORAGE_KEY = 'pidicon:preferences:v1';
const LEGACY_KEY = 'pidicon:showDevScenes';
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 300; // Debounce rapid writes

// Default preference structure
const DEFAULT_PREFERENCES = {
  version: SCHEMA_VERSION,
  deviceCards: {}, // { [deviceIp]: { collapsed, showDetails, showMetrics } }
  currentView: 'devices',
  settingsTab: 'devices',
  sceneManager: {
    selectedDeviceIp: null,
    sortBy: 'sortOrder',
    searchQuery: '',
    bulkMode: false,
  },
  testsView: {
    searchQuery: '',
    expandedSections: [], // Array of section IDs
  },
  showDevScenes: false,
};

// In-memory fallback when localStorage unavailable
let inMemoryStorage = null;
let isStorageAvailable = true;
let debounceTimer = null;
let isInitialized = false;

// Shared reactive preferences state
const preferencesRef = ref(null);

/**
 * Check if localStorage is available
 */
function checkStorageAvailability() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Load preferences from storage (localStorage or in-memory fallback)
 */
function loadPreferences() {
  if (!isStorageAvailable) {
    if (!inMemoryStorage) {
      inMemoryStorage = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
    }
    return inMemoryStorage;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    return parsed;
  } catch (error) {
    console.warn('[usePreferences] Failed to parse stored preferences:', error);
    return null;
  }
}

/**
 * Save preferences to storage
 */
function savePreferences(preferences) {
  if (!isStorageAvailable) {
    inMemoryStorage = JSON.parse(JSON.stringify(preferences));
    console.warn(
      '[usePreferences] localStorage unavailable, using in-memory fallback'
    );
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('[usePreferences] Failed to save preferences:', error);
    throw error;
  }
}

/**
 * Validate preference schema
 */
function validateSchema(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check required top-level keys
  const requiredKeys = ['version', 'deviceCards', 'currentView', 'settingsTab'];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      return false;
    }
  }

  // Validate version
  if (typeof data.version !== 'number' || data.version !== SCHEMA_VERSION) {
    return false;
  }

  // Validate deviceCards structure
  if (
    !data.deviceCards ||
    typeof data.deviceCards !== 'object' ||
    Array.isArray(data.deviceCards)
  ) {
    return false;
  }

  return true;
}

/**
 * Migrate legacy preferences
 */
function migrateLegacy(preferences) {
  if (!isStorageAvailable) {
    return preferences;
  }

  try {
    const legacyValue = window.localStorage.getItem(LEGACY_KEY);
    if (legacyValue !== null) {
      // Migrate showDevScenes from legacy key
      try {
        const parsed = JSON.parse(legacyValue);
        if (typeof parsed === 'boolean') {
          preferences.showDevScenes = parsed;
        }
      } catch (e) {
        // Legacy key exists but invalid, use default
        console.warn(
          '[usePreferences] Invalid legacy key format, using default'
        );
      }
    }
  } catch (error) {
    console.warn(
      '[usePreferences] Failed to migrate legacy preferences:',
      error
    );
  }

  return preferences;
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj, path, defaultValue) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return defaultValue;
    }
    current = current[key];
    if (current === undefined) {
      return defaultValue;
    }
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Set nested value in object using dot notation path
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

/**
 * Main composable function
 */
function ensureInitialized() {
  if (isInitialized) {
    return;
  }

  isStorageAvailable = checkStorageAvailability();

  // Load and initialize preferences
  let currentPreferences = loadPreferences();

  // Handle corruption or missing data
  if (!currentPreferences || !validateSchema(currentPreferences)) {
    console.warn(
      '[usePreferences] Invalid or missing preferences, resetting to defaults'
    );
    currentPreferences = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));

    // Try to migrate legacy preferences
    currentPreferences = migrateLegacy(currentPreferences);

    // Save defaults
    savePreferences(currentPreferences);
  } else {
    // Migrate legacy even if new schema exists (in case legacy key still present)
    currentPreferences = migrateLegacy(currentPreferences);
  }

  preferencesRef.value = currentPreferences;
  isInitialized = true;
}

export function usePreferences() {
  const toast = useToast();
  ensureInitialized();

  /**
   * Debounced save function
   */
  function savePreferencesDebounced() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      savePreferences(preferencesRef.value);
      debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  /**
   * Get preference value by path
   */
  function getPreference(path, defaultValue) {
    return getNestedValue(preferencesRef.value, path, defaultValue);
  }

  /**
   * Set preference value by path
   */
  function setPreference(path, value) {
    setNestedValue(preferencesRef.value, path, value);
    savePreferencesDebounced();
  }

  /**
   * Clear all preferences and reset to defaults
   */
  function clearAll() {
    preferencesRef.value = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
    savePreferences(preferencesRef.value);
    toast.info('All preferences reset to defaults');
  }

  /**
   * Export preferences as JSON
   */
  function exportPreferences() {
    return JSON.stringify(preferencesRef.value, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  function importPreferences(json) {
    try {
      const imported = JSON.parse(json);
      if (!validateSchema(imported)) {
        throw new Error('Invalid preference schema');
      }

      // Merge with existing (preserve unknown keys)
      const merged = deepMerge(preferencesRef.value, imported);
      preferencesRef.value = merged;
      savePreferences(preferencesRef.value);
      toast.success('Preferences imported successfully');
      return true;
    } catch (error) {
      console.error('[usePreferences] Failed to import preferences:', error);
      toast.error(`Failed to import preferences: ${error.message}`);
      return false;
    }
  }

  /**
   * Get device card preference
   */
  function getDeviceCardPref(deviceIp, key, defaultValue) {
    const path = `deviceCards.${deviceIp}.${key}`;
    return getPreference(path, defaultValue);
  }

  /**
   * Set device card preference
   */
  function setDeviceCardPref(deviceIp, key, value) {
    const path = `deviceCards.${deviceIp}.${key}`;
    setPreference(path, value);
  }

  /**
   * Get scene manager preference
   */
  function getSceneManagerPref(key, defaultValue = null) {
    return getPreference(`sceneManager.${key}`, defaultValue);
  }

  /**
   * Set scene manager preference
   */
  function setSceneManagerPref(key, value) {
    setPreference(`sceneManager.${key}`, value);
  }

  /**
   * Get tests view preference
   */
  function getTestsViewPref(key, defaultValue = null) {
    return getPreference(`testsView.${key}`, defaultValue);
  }

  /**
   * Set tests view preference
   */
  function setTestsViewPref(key, value) {
    setPreference(`testsView.${key}`, value);
  }

  /**
   * Handle storage events from other tabs
   */
  function handleStorageEvent(event) {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const newPrefs = JSON.parse(event.newValue);
        if (validateSchema(newPrefs)) {
          preferencesRef.value = newPrefs;
        }
      } catch (error) {
        console.warn(
          '[usePreferences] Failed to sync from storage event:',
          error
        );
      }
    }
  }

  // Setup storage event listener for multi-tab sync
  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      savePreferences(preferencesRef.value); // Flush pending saves
    }
  });

  // Handle URL parameter for emergency reset
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_preferences') === '1') {
      clearAll();
      // Remove parameter from URL
      params.delete('reset_preferences');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }

  return {
    preferences: computed(() => preferencesRef.value),
    getPreference,
    setPreference,
    clearAll,
    exportPreferences,
    importPreferences,
    // Device card helpers
    getDeviceCardPref,
    setDeviceCardPref,
    // Scene manager helpers
    getSceneManagerPref,
    setSceneManagerPref,
    // Tests view helpers
    getTestsViewPref,
    setTestsViewPref,
  };
}
