/**
 * API composable for backend communication
 * Handles all HTTP requests to Express backend
 */
import { ref } from 'vue';

const BASE_URL = '/api';

export function useApi() {
  const loading = ref(false);
  const error = ref(null);

  async function request(url, options = {}) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
        body:
          options.body &&
          typeof options.body === 'object' &&
          !(options.body instanceof FormData)
            ? JSON.stringify(options.body)
            : options.body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Device APIs
  async function getDevices() {
    const data = await request('/devices');
    return data.devices;
  }

  async function getDeviceInfo(ip) {
    return await request(`/devices/${ip}`);
  }

  async function getDeviceMetrics(ip) {
    return await request(`/devices/${ip}/metrics`);
  }

  async function switchScene(ip, scene, options = {}) {
    return await request(`/devices/${ip}/scene`, {
      method: 'POST',
      body: JSON.stringify({ scene, ...options }),
    });
  }

  async function pauseScene(ip) {
    return await request(`/devices/${ip}/scene/pause`, {
      method: 'POST',
    });
  }

  async function resumeScene(ip) {
    return await request(`/devices/${ip}/scene/resume`, {
      method: 'POST',
    });
  }

  async function stopScene(ip) {
    return await request(`/devices/${ip}/scene/stop`, {
      method: 'POST',
    });
  }

  async function setDisplayPower(ip, on) {
    return await request(`/devices/${ip}/display`, {
      method: 'POST',
      body: JSON.stringify({ on }),
    });
  }

  async function setDisplayBrightness(ip, brightness) {
    return await request(`/devices/${ip}/brightness`, {
      method: 'POST',
      body: JSON.stringify({ brightness }),
    });
  }

  async function resetDevice(ip) {
    return await request(`/devices/${ip}/reset`, {
      method: 'POST',
    });
  }

  async function rebootDevice(ip) {
    return await request(`/devices/${ip}/reboot`, {
      method: 'POST',
    });
  }

  async function setDeviceLogging(ip, level) {
    return await request(`/devices/${ip}/logging`, {
      method: 'POST',
      body: JSON.stringify({ level }),
    });
  }

  async function switchDriver(ip, driver) {
    return await request(`/devices/${ip}/driver`, {
      method: 'POST',
      body: JSON.stringify({ driver }),
    });
  }

  // Scene APIs
  async function getScenes() {
    const data = await request('/scenes');
    return data.scenes;
  }

  // System APIs
  async function getSystemStatus() {
    return await request('/status');
  }

  async function restartDaemon() {
    return await request('/daemon/restart', {
      method: 'POST',
    });
  }

  async function connectMqtt() {
    return await request('/system/mqtt/connect', {
      method: 'POST',
    });
  }

  async function disconnectMqtt() {
    return await request('/system/mqtt/disconnect', {
      method: 'POST',
    });
  }

  return {
    loading,
    error,
    request,
    // Device methods
    getDevices,
    getDeviceInfo,
    getDeviceMetrics,
    switchScene,
    pauseScene,
    resumeScene,
    stopScene,
    setDisplayPower,
    setDisplayBrightness,
    resetDevice,
    rebootDevice,
    setDeviceLogging,
    switchDriver,
    // Scene methods
    getScenes,
    // System methods
    getSystemStatus,
    restartDaemon,
    connectMqtt,
    disconnectMqtt,
  };
}
