/* eslint-env browser */
// Pixoo Control Panel JavaScript - Enhanced UX

// API base URL (same origin)
const API_BASE = '/api';

// Refresh intervals
const REFRESH_INTERVAL_SLOW = 5000; // 5 seconds for general data
const REFRESH_INTERVAL_FAST = 1000; // 1 second for FPS/frametime

// State
let devices = [];
let scenes = [];
let systemStatus = {};
let selectedDevice = null;
let currentSceneIndex = 0;
let fpsInterval = null;

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
    showToast(`Error: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type (success, error, info)
 */
function showToast(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Add visual toast notifications
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

    // Auto-select first device if none selected
    if (!selectedDevice && devices.length > 0) {
      selectedDevice = devices[0].ip;
    }

    renderDevices();

    // Start FPS monitoring for animated scenes
    updateFPSDisplay();
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
    renderSceneDropdown();
  } catch (err) {
    document.getElementById('scene-dropdown').innerHTML =
      '<option value="">Failed to load scenes</option>';
  }
}

/**
 * Load all data
 */
async function loadAll() {
  await Promise.all([loadSystemStatus(), loadDevices(), loadScenes()]);
}

/**
 * Update FPS/frametime display
 */
async function updateFPSDisplay() {
  if (!selectedDevice) return;

  const device = devices.find((d) => d.ip === selectedDevice);
  if (!device || !device.currentScene) return;

  // Find scene to check if it's animated
  const scene = scenes.find((s) => s.name === device.currentScene);
  const fpsDisplay = document.getElementById('fps-display');

  if (scene && scene.wantsLoop) {
    // Show FPS display for animated scenes
    fpsDisplay.style.display = 'block';

    try {
      const data = await apiRequest(`/devices/${selectedDevice}/frametime`);
      const fps = parseFloat(data.fps) || 0;
      const frametime = data.frametime || 0;

      const fpsValue = document.getElementById('fps-value');
      const frametimeValue = document.getElementById('frametime-value');

      fpsValue.textContent = fps.toFixed(1);
      fpsValue.className = fps < 3 ? 'fps-value low' : 'fps-value';
      frametimeValue.textContent = `${frametime.toFixed(0)} ms`;
    } catch {
      // Silently fail - don't spam errors
    }
  } else {
    // Hide FPS display for static scenes
    fpsDisplay.style.display = 'none';
  }
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
  const isSelected = device.ip === selectedDevice;
  return `
    <div class="device-card ${isSelected ? 'selected' : ''}" data-ip="${device.ip}">
      <div class="device-header">
        <div class="device-ip">${device.ip} ${isSelected ? '(Selected)' : ''}</div>
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
        <button class="btn btn-sm btn-primary" onclick="selectDevice('${device.ip}')">
          Select
        </button>
        <button class="btn btn-sm btn-warning" onclick="setDisplayPower('${device.ip}', false)">
          🌙 OFF
        </button>
        <button class="btn btn-sm btn-success" onclick="setDisplayPower('${device.ip}', true)">
          ☀️ ON
        </button>
        <button class="btn btn-sm btn-danger" onclick="resetDevice('${device.ip}')">
          🔄 Reset
        </button>
      </div>
    </div>
  `;
}

/**
 * Render scene dropdown
 */
function renderSceneDropdown() {
  const dropdown = document.getElementById('scene-dropdown');

  if (scenes.length === 0) {
    dropdown.innerHTML = '<option value="">No scenes available</option>';
    return;
  }

  // Group scenes by category
  const grouped = {};
  scenes.forEach((scene) => {
    const category = scene.category || 'General';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(scene);
  });

  let html = '';
  for (const [category, categoryScenes] of Object.entries(grouped)) {
    html += `<optgroup label="${category}">`;
    categoryScenes.forEach((scene) => {
      const animated = scene.wantsLoop ? ' 🎬' : '';
      html += `<option value="${scene.name}">${scene.name}${animated}</option>`;
    });
    html += `</optgroup>`;
  }

  dropdown.innerHTML = html;

  // Select current scene for selected device
  if (selectedDevice) {
    const device = devices.find((d) => d.ip === selectedDevice);
    if (device && device.currentScene) {
      dropdown.value = device.currentScene;
      currentSceneIndex = scenes.findIndex(
        (s) => s.name === device.currentScene,
      );
      updateSceneDescription();
    }
  }

  // Auto-select first scene if none selected
  if (dropdown.value === '' && scenes.length > 0) {
    dropdown.value = scenes[0].name;
    currentSceneIndex = 0;
    updateSceneDescription();
  }
}

/**
 * Update scene description
 */
function updateSceneDescription() {
  const dropdown = document.getElementById('scene-dropdown');
  const sceneName = dropdown.value;
  const scene = scenes.find((s) => s.name === sceneName);

  const descEl = document.getElementById('scene-description');
  if (scene) {
    const animatedBadge = scene.wantsLoop
      ? '<span class="scene-badge animated">Animated</span>'
      : '<span class="scene-badge">Static</span>';
    descEl.innerHTML = `
      <div class="scene-info">
        <strong>${scene.name}</strong>
        ${animatedBadge}
      </div>
      <div>${scene.description}</div>
    `;
  } else {
    descEl.textContent = 'Select a scene to see its description';
  }
}

// ============================================================================
// DEVICE ACTIONS
// ============================================================================

/**
 * Select a device
 * @param {string} deviceIp - Device IP
 */
function selectDevice(deviceIp) {
  selectedDevice = deviceIp;
  showToast(`Device ${deviceIp} selected`, 'success');
  loadDevices(); // Re-render to show selection
  renderSceneDropdown(); // Update dropdown to show current scene
}

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

    showToast(`Display turned ${on ? 'ON' : 'OFF'} for ${deviceIp}`, 'success');
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
  if (!confirm(`Reset device ${deviceIp}?`)) {
    return;
  }

  try {
    await apiRequest(`/devices/${deviceIp}/reset`, {
      method: 'POST',
    });

    showToast(`Device ${deviceIp} reset successfully`, 'success');
    await loadDevices();
  } catch {
    // Error already shown by apiRequest
  }
}

// ============================================================================
// SCENE ACTIONS
// ============================================================================

/**
 * Switch to selected scene
 */
async function switchToScene() {
  const dropdown = document.getElementById('scene-dropdown');
  const sceneName = dropdown.value;

  if (!selectedDevice) {
    showToast('Please select a device first', 'error');
    return;
  }

  if (!sceneName) {
    showToast('Please select a scene', 'error');
    return;
  }

  try {
    const switchBtn = document.getElementById('switch-scene-btn');
    switchBtn.disabled = true;
    switchBtn.textContent = 'Switching...';

    await apiRequest(`/devices/${selectedDevice}/scene`, {
      method: 'POST',
      body: JSON.stringify({ scene: sceneName, clear: true }),
    });

    showToast(`Switched to ${sceneName}`, 'success');
    await loadDevices();

    switchBtn.disabled = false;
    switchBtn.textContent = 'Switch';
  } catch {
    const switchBtn = document.getElementById('switch-scene-btn');
    switchBtn.disabled = false;
    switchBtn.textContent = 'Switch';
  }
}

/**
 * Navigate to previous scene
 */
function prevScene() {
  if (scenes.length === 0) return;
  currentSceneIndex = (currentSceneIndex - 1 + scenes.length) % scenes.length;
  const dropdown = document.getElementById('scene-dropdown');
  dropdown.value = scenes[currentSceneIndex].name;
  updateSceneDescription();
}

/**
 * Navigate to next scene
 */
function nextScene() {
  if (scenes.length === 0) return;
  currentSceneIndex = (currentSceneIndex + 1) % scenes.length;
  const dropdown = document.getElementById('scene-dropdown');
  dropdown.value = scenes[currentSceneIndex].name;
  updateSceneDescription();
}

// ============================================================================
// SYSTEM ACTIONS
// ============================================================================

/**
 * Restart daemon
 */
async function restartDaemon() {
  if (
    !confirm('Restart the daemon? This will disconnect the web UI temporarily.')
  ) {
    return;
  }

  try {
    await apiRequest('/daemon/restart', {
      method: 'POST',
    });

    showToast(
      'Daemon is restarting... The page will reconnect automatically.',
      'info',
    );

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
      showToast('Daemon reconnected!', 'success');
      loadAll();
    } catch {
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, 2000);
      } else {
        showToast(
          'Failed to reconnect. Please refresh the page manually.',
          'error',
        );
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
  // Attach event handlers
  document
    .getElementById('restart-daemon-btn')
    .addEventListener('click', restartDaemon);
  document
    .getElementById('switch-scene-btn')
    .addEventListener('click', switchToScene);
  document
    .getElementById('prev-scene-btn')
    .addEventListener('click', prevScene);
  document
    .getElementById('next-scene-btn')
    .addEventListener('click', nextScene);
  document
    .getElementById('scene-dropdown')
    .addEventListener('change', updateSceneDescription);

  // Make functions globally accessible for onclick handlers
  window.selectDevice = selectDevice;
  window.setDisplayPower = setDisplayPower;
  window.resetDevice = resetDevice;

  // Load initial data
  await loadAll();

  // Auto-refresh general data every 5 seconds
  setInterval(loadAll, REFRESH_INTERVAL_SLOW);

  // Auto-refresh FPS/frametime every 1 second
  fpsInterval = setInterval(updateFPSDisplay, REFRESH_INTERVAL_FAST);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
