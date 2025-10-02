/* eslint-env browser */
// Pixoo Control Panel JavaScript

// API base URL (same origin)
const API_BASE = '/api';

// State
let devices = [];
let scenes = [];
let systemStatus = {};
let selectedDevice = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    alert(`Error: ${err.message}`);
    throw err;
  }
}

/**
 * Format uptime in human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Load system status
 */
async function loadSystemStatus() {
  try {
    systemStatus = await apiRequest('/status');
    renderSystemStatus();
  } catch (err) {
    document.getElementById('system-status').innerHTML =
      `<div class="error">Failed to load system status: ${err.message}</div>`;
  }
}

/**
 * Load devices
 */
async function loadDevices() {
  try {
    const data = await apiRequest('/devices');
    devices = data.devices;
    renderDevices();
  } catch (err) {
    document.getElementById('devices-list').innerHTML =
      `<div class="error">Failed to load devices: ${err.message}</div>`;
  }
}

/**
 * Load scenes
 */
async function loadScenes() {
  try {
    const data = await apiRequest('/scenes');
    scenes = data.scenes;
    renderScenes();
  } catch (err) {
    document.getElementById('scenes-list').innerHTML =
      `<div class="error">Failed to load scenes: ${err.message}</div>`;
  }
}

/**
 * Load all data
 */
async function loadAll() {
  await Promise.all([loadSystemStatus(), loadDevices(), loadScenes()]);
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render system status
 */
function renderSystemStatus() {
  const statusEl = document.getElementById('system-status');

  statusEl.innerHTML = `
    <div class="status-item">
      <div class="status-label">Version</div>
      <div class="status-value">${systemStatus.version}</div>
    </div>
    <div class="status-item">
      <div class="status-label">Build</div>
      <div class="status-value">#${systemStatus.buildNumber}</div>
    </div>
    <div class="status-item">
      <div class="status-label">Uptime</div>
      <div class="status-value">${formatUptime(systemStatus.uptime)}</div>
    </div>
    <div class="status-item">
      <div class="status-label">Memory (RSS)</div>
      <div class="status-value">${systemStatus.memory.rss} MB</div>
    </div>
    <div class="status-item">
      <div class="status-label">Node.js</div>
      <div class="status-value">${systemStatus.nodeVersion}</div>
    </div>
    <div class="status-item">
      <div class="status-label">Status</div>
      <div class="status-value">${systemStatus.status}</div>
    </div>
  `;

  document.getElementById('version-info').textContent =
    `v${systemStatus.version} | Build #${systemStatus.buildNumber} | ${systemStatus.gitCommit}`;

  document.getElementById('build-info').textContent =
    `v${systemStatus.version} | Build #${systemStatus.buildNumber}`;
}

/**
 * Render devices list
 */
function renderDevices() {
  const devicesEl = document.getElementById('devices-list');

  if (devices.length === 0) {
    devicesEl.innerHTML = '<div class="loading">No devices configured</div>';
    return;
  }

  devicesEl.innerHTML = devices.map((device) => renderDevice(device)).join('');
}

/**
 * Render a single device card
 * @param {Object} device - Device object
 * @returns {string} HTML string
 */
function renderDevice(device) {
  return `
    <div class="device-card" data-ip="${device.ip}">
      <div class="device-header">
        <div class="device-ip">${device.ip}</div>
        <div class="device-driver">${device.driver}</div>
      </div>
      <div class="device-status">
        <div class="device-status-item">
          <span>Scene:</span>
          <strong>${device.currentScene}</strong>
        </div>
        <div class="device-status-item">
          <span>Status:</span>
          <strong>${device.status}</strong>
        </div>
        <div class="device-status-item">
          <span>Pushes:</span>
          <strong>${device.metrics.pushes}</strong>
        </div>
        <div class="device-status-item">
          <span>Errors:</span>
          <strong>${device.metrics.errors}</strong>
        </div>
      </div>
      <div class="device-actions">
        <button class="btn btn-sm btn-warning" onclick="setDisplayPower('${device.ip}', false)">
          🌙 Display OFF
        </button>
        <button class="btn btn-sm btn-success" onclick="setDisplayPower('${device.ip}', true)">
          ☀️ Display ON
        </button>
        <button class="btn btn-sm btn-danger" onclick="resetDevice('${device.ip}')">
          🔄 Reset
        </button>
        <button class="btn btn-sm btn-primary" onclick="selectDeviceForScene('${device.ip}')">
          🎨 Change Scene
        </button>
      </div>
    </div>
  `;
}

/**
 * Render scenes list
 */
function renderScenes() {
  const scenesEl = document.getElementById('scenes-list');

  if (scenes.length === 0) {
    scenesEl.innerHTML = '<div class="loading">No scenes available</div>';
    return;
  }

  const currentScenes = devices.map((d) => d.currentScene);

  scenesEl.innerHTML = scenes
    .map((scene) => {
      const isActive = currentScenes.includes(scene);
      return `
        <div class="scene-item ${isActive ? 'scene-active' : ''}"
onclick="switchScene('${scene}')">
          <span class="scene-name">${scene}</span>
          <span>${isActive ? '●' : '○'}</span>
        </div>
      `;
    })
    .join('');
}

// ============================================================================
// DEVICE ACTIONS
// ============================================================================

/**
 * Set display power
 * @param {string} deviceIp - Device IP
 * @param {boolean} on - Turn on (true) or off (false)
 */
async function setDisplayPower(deviceIp, on) {
  try {
    await apiRequest(`/devices/${deviceIp}/display`, {
      method: 'POST',
      body: JSON.stringify({ on }),
    });

    alert(`Display turned ${on ? 'ON' : 'OFF'} for ${deviceIp}`);
    await loadDevices();
  } catch {
    // Error already shown by apiRequest
  }
}

/**
 * Reset device
 * @param {string} deviceIp - Device IP
 */
async function resetDevice(deviceIp) {
  // eslint-disable-next-line no-restricted-globals
  if (!confirm(`Reset device ${deviceIp}?`)) {
    return;
  }

  try {
    await apiRequest(`/devices/${deviceIp}/reset`, {
      method: 'POST',
    });

    alert(`Device ${deviceIp} reset successfully`);
    await loadDevices();
  } catch {
    // Error already shown by apiRequest
  }
}

/**
 * Select device for scene change
 * @param {string} deviceIp - Device IP
 */
function selectDeviceForScene(deviceIp) {
  selectedDevice = deviceIp;
  alert(`Device ${deviceIp} selected. Now click a scene to switch.`);
}

/**
 * Switch to a scene
 * @param {string} sceneName - Scene name
 */
async function switchScene(sceneName) {
  if (!selectedDevice && devices.length > 0) {
    selectedDevice = devices[0].ip;
  }

  if (!selectedDevice) {
    alert('No device selected. Please configure at least one device.');
    return;
  }

  try {
    await apiRequest(`/devices/${selectedDevice}/scene`, {
      method: 'POST',
      body: JSON.stringify({ scene: sceneName, clear: true }),
    });

    alert(`Switched ${selectedDevice} to ${sceneName}`);
    await loadDevices();
  } catch {
    // Error already shown by apiRequest
  }
}

// ============================================================================
// SYSTEM ACTIONS
// ============================================================================

/**
 * Restart daemon
 */
async function restartDaemon() {
  // eslint-disable-next-line no-restricted-globals
  if (
    !confirm('Restart the daemon? This will disconnect the web UI temporarily.')
  ) {
    return;
  }

  try {
    await apiRequest('/daemon/restart', {
      method: 'POST',
    });

    alert('Daemon is restarting... The page will reconnect automatically.');

    // Poll for daemon to come back
    setTimeout(() => {
      pollForReconnect();
    }, 5000);
  } catch {
    // Error already shown by apiRequest
  }
}

/**
 * Poll for daemon reconnection after restart
 */
async function pollForReconnect() {
  let attempts = 0;
  const MAX_ATTEMPTS = 20;

  const poll = async () => {
    attempts++;
    try {
      await apiRequest('/status');
      alert('Daemon reconnected!');
      loadAll();
    } catch {
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, 2000);
      } else {
        alert('Failed to reconnect. Please refresh the page manually.');
      }
    }
  };

  poll();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the app
 */
async function init() {
  // Attach global event handlers
  document
    .getElementById('restart-daemon-btn')
    .addEventListener('click', restartDaemon);

  // Make functions globally accessible for onclick handlers
  window.setDisplayPower = setDisplayPower;
  window.resetDevice = resetDevice;
  window.selectDeviceForScene = selectDeviceForScene;
  window.switchScene = switchScene;

  // Load initial data
  await loadAll();

  // Auto-refresh every 10 seconds
  setInterval(loadAll, 10000);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
