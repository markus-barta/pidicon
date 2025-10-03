/**
 * Device state management
 * Handles device list, metrics, and per-device state
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useDeviceStore = defineStore('devices', () => {
  // State
  const devices = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const realDevices = computed(() =>
    devices.value.filter((d) => d.driver === 'real'),
  );
  const mockDevices = computed(() =>
    devices.value.filter((d) => d.driver === 'mock'),
  );
  const deviceCount = computed(() => devices.value.length);

  // Actions
  function setDevices(newDevices) {
    devices.value = newDevices;
  }

  function updateDevice(deviceIp, updates) {
    const index = devices.value.findIndex((d) => d.ip === deviceIp);
    if (index !== -1) {
      devices.value[index] = { ...devices.value[index], ...updates };
    }
  }

  function setLoading(value) {
    loading.value = value;
  }

  function setError(value) {
    error.value = value;
  }

  function clearError() {
    error.value = null;
  }

  return {
    devices,
    loading,
    error,
    realDevices,
    mockDevices,
    deviceCount,
    setDevices,
    updateDevice,
    setLoading,
    setError,
    clearError,
  };
});
