/* eslint-env browser */
// Pixoo Control Panel v2 - Professional & Concise

const API_BASE = '/api';
const REFRESH_SLOW = 5000; // 5s for general data
const REFRESH_FAST = 1000; // 1s for FPS

let devices = [];
let scenes = [];
let systemStatus = {};
let fpsIntervals = new Map();

// ============================================================================
// API & UTILITIES
// ============================================================================

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return await response.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadSystemStatus() {
  try {
    systemStatus = await apiRequest('/status');
    document.getElementById('build-number').textContent =
      systemStatus.buildNumber;
    document.getElementById('uptime').textContent =
      `Up: ${formatUptime(systemStatus.uptime)}`;
    document.getElementById('status-text').textContent = systemStatus.status;
    document.getElementById('version-info').textContent =
      `v${systemStatus.version} | Build #${systemStatus.buildNumber} | ${systemStatus.gitCommit}`;
  } catch (err) {
    console.error('Failed to load system status');
  }
}

async function loadDevices() {
  try {
    const data = await apiRequest('/devices');
    devices = data.devices;
    renderDevices();
  } catch (err) {
    document.getElementById('devices-grid').innerHTML =
      '<div class="error">Failed to load devices</div>';
  }
}

async function loadScenes() {
  try {
    const data = await apiRequest('/scenes');
    scenes = data.scenes;
  } catch (err) {
    console.error('Failed to load scenes');
  }
}

async function loadAll() {
  await Promise.all([loadSystemStatus(), loadDevices(), loadScenes()]);
}

// ============================================================================
// RENDERING
// ============================================================================

function renderDevices() {
  const grid = document.getElementById('devices-grid');
  if (devices.length === 0) {
    grid.innerHTML = '<div class="loading">No devices configured</div>';
    return;
  }
  grid.innerHTML = devices.map((d) => renderDevice(d)).join('');

  // Re-attach event listeners
  devices.forEach((d) => attachDeviceListeners(d.ip));

  // Start FPS monitoring
  devices.forEach((d) => {
    if (d.currentScene) {
      const scene = scenes.find((s) => s.name === d.currentScene);
      if (scene && scene.wantsLoop) {
        startFPSMonitoring(d.ip);
      }
    }
  });
}

function renderDevice(device) {
  const scene = scenes.find((s) => s.name === device.currentScene);
  const isAnimated = scene && scene.wantsLoop;

  return `
    <div class="device-card" data-ip="${device.ip}">
      <div class="device-header">
        <div class="device-title">
          <span class="device-ip">${device.ip}</span>
          <span class="device-badge">${device.driver}</span>
        </div>
      </div>

      <div class="device-status">
        <div class="status-item">
          <div class="status-label">Scene</div>
          <div class="status-value">${device.currentScene}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Status</div>
          <div class="status-value ${getStatusClass(device.status)}">${device.status}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Pushes</div>
          <div class="status-value">${device.metrics.pushes}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Errors</div>
          <div class="status-value ${device.metrics.errors > 0 ? 'danger' : 'success'}">
            ${device.metrics.errors}
          </div>
        </div>
      </div>

      <div class="scene-control">
        <div class="scene-header">
          <span class="scene-title">Scene</span>
          ${isAnimated ? '<span class="scene-info-badge">🎬 Animated</span>' : ''}
        </div>

        <div class="scene-selector">
          <select class="scene-dropdown" id="scene-${device.ip}" data-device="${device.ip}">
            ${renderSceneOptions(device.currentScene)}
          </select>
          <div class="scene-nav">
            <button class="btn btn-primary btn-sm btn-icon" onclick="prevScene('${device.ip}')">←</button>
            <button class="btn btn-primary btn-sm btn-icon" onclick="nextScene('${device.ip}')">→</button>
            <button class="btn btn-success btn-sm" onclick="switchScene('${device.ip}')">Switch</button>
          </div>
        </div>

        <div class="scene-description" id="desc-${device.ip}">
          ${scene ? scene.description : 'Select a scene'}
        </div>

        ${isAnimated ? renderFPSDisplay(device.ip) : ''}
      </div>

      <div class="device-actions">
        <button class="btn btn-warning btn-sm" onclick="setDisplayPower('${device.ip}', false)">
          🌙 OFF
        </button>
        <button class="btn btn-success btn-sm" onclick="setDisplayPower('${device.ip}', true)">
          ☀️ ON
        </button>
        <button class="btn btn-danger btn-sm" onclick="resetDevice('${device.ip}')">
          🔄 Reset
        </button>
        <button class="btn btn-primary btn-sm" onclick="toggleDriver('${device.ip}')">
          🔧 ${device.driver === 'mock' ? 'Real' : 'Mock'}
        </button>
      </div>
    </div>
  `;
}

function renderSceneOptions(currentScene) {
  const grouped = {};
  scenes.forEach((s) => {
    const cat = s.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  let html = '';
  for (const [cat, sceneList] of Object.entries(grouped)) {
    html += `<optgroup label="${cat}">`;
    sceneList.forEach((s) => {
      const selected = s.name === currentScene ? ' selected' : '';
      const emoji = s.wantsLoop ? ' 🎬' : '';
      html += `<option value="${s.name}"${selected}>${s.name}${emoji}</option>`;
    });
    html += `</optgroup>`;
  }
  return html;
}

function renderFPSDisplay(deviceIp) {
  return `
    <div class="fps-display" id="fps-${deviceIp}">
      <div class="fps-stats">
        <div class="fps-stat">
          <div class="fps-label">FPS</div>
          <div class="fps-value" id="fps-value-${deviceIp}">0.0</div>
        </div>
        <div class="fps-stat">
          <div class="fps-label">Frame Time</div>
          <div class="fps-value" id="frametime-value-${deviceIp}">0 ms</div>
        </div>
      </div>
    </div>
  `;
}

function getStatusClass(status) {
  if (status === 'running') return 'success';
  if (status === 'switching') return 'warning';
  return '';
}

function attachDeviceListeners(deviceIp) {
  const dropdown = document.getElementById(`scene-${deviceIp}`);
  if (dropdown) {
    dropdown.addEventListener('change', () => updateSceneDescription(deviceIp));
  }
}

function updateSceneDescription(deviceIp) {
  const dropdown = document.getElementById(`scene-${deviceIp}`);
  const sceneName = dropdown.value;
  const scene = scenes.find((s) => s.name === sceneName);
  const descEl = document.getElementById(`desc-${deviceIp}`);
  if (descEl && scene) {
    descEl.textContent = scene.description;
  }
}

// ============================================================================
// FPS MONITORING
// ============================================================================

function startFPSMonitoring(deviceIp) {
  // Clear existing interval
  if (fpsIntervals.has(deviceIp)) {
    clearInterval(fpsIntervals.get(deviceIp));
  }

  // Start new interval
  const intervalId = setInterval(() => updateFPS(deviceIp), REFRESH_FAST);
  fpsIntervals.set(deviceIp, intervalId);

  // Initial update
  updateFPS(deviceIp);
}

function stopFPSMonitoring(deviceIp) {
  if (fpsIntervals.has(deviceIp)) {
    clearInterval(fpsIntervals.get(deviceIp));
    fpsIntervals.delete(deviceIp);
  }
}

async function updateFPS(deviceIp) {
  try {
    const data = await apiRequest(`/devices/${deviceIp}/frametime`);
    const fps = parseFloat(data.fps) || 0;
    const frametime = data.frametime || 0;

    const fpsEl = document.getElementById(`fps-value-${deviceIp}`);
    const frametimeEl = document.getElementById(`frametime-value-${deviceIp}`);

    if (fpsEl) {
      fpsEl.textContent = fps.toFixed(1);
      fpsEl.className = fps > 0 && fps < 3 ? 'fps-value low' : 'fps-value';
    }

    if (frametimeEl) {
      frametimeEl.textContent = `${frametime.toFixed(0)} ms`;
    }
  } catch {
    // Silent fail
  }
}

// ============================================================================
// ACTIONS
// ============================================================================

async function switchScene(deviceIp) {
  const dropdown = document.getElementById(`scene-${deviceIp}`);
  const sceneName = dropdown.value;

  try {
    await apiRequest(`/devices/${deviceIp}/scene`, {
      method: 'POST',
      body: JSON.stringify({ scene: sceneName, clear: true }),
    });
    await loadDevices();
  } catch (err) {
    alert(`Failed to switch scene: ${err.message}`);
  }
}

function prevScene(deviceIp) {
  const dropdown = document.getElementById(`scene-${deviceIp}`);
  const currentIndex = Array.from(dropdown.options).findIndex(
    (o) => o.value === dropdown.value,
  );
  const newIndex =
    (currentIndex - 1 + dropdown.options.length) % dropdown.options.length;
  dropdown.selectedIndex = newIndex;
  updateSceneDescription(deviceIp);
}

function nextScene(deviceIp) {
  const dropdown = document.getElementById(`scene-${deviceIp}`);
  const currentIndex = Array.from(dropdown.options).findIndex(
    (o) => o.value === dropdown.value,
  );
  const newIndex = (currentIndex + 1) % dropdown.options.length;
  dropdown.selectedIndex = newIndex;
  updateSceneDescription(deviceIp);
}

async function setDisplayPower(deviceIp, on) {
  try {
    await apiRequest(`/devices/${deviceIp}/display`, {
      method: 'POST',
      body: JSON.stringify({ on }),
    });
    await loadDevices();
  } catch (err) {
    alert(`Failed to set display: ${err.message}`);
  }
}

async function resetDevice(deviceIp) {
  if (!confirm(`Reset device ${deviceIp}?`)) return;

  try {
    await apiRequest(`/devices/${deviceIp}/reset`, { method: 'POST' });
    await loadDevices();
  } catch (err) {
    alert(`Failed to reset: ${err.message}`);
  }
}

async function toggleDriver(deviceIp) {
  const device = devices.find((d) => d.ip === deviceIp);
  const newDriver = device.driver === 'mock' ? 'real' : 'mock';

  try {
    await apiRequest(`/devices/${deviceIp}/driver`, {
      method: 'POST',
      body: JSON.stringify({ driver: newDriver }),
    });
    await loadDevices();
  } catch (err) {
    alert(`Failed to switch driver: ${err.message}`);
  }
}

async function restartDaemon() {
  if (!confirm('Restart daemon? Web UI will reconnect automatically.')) return;

  try {
    await apiRequest('/daemon/restart', { method: 'POST' });
    setTimeout(pollReconnect, 5000);
  } catch (err) {
    alert(`Failed to restart: ${err.message}`);
  }
}

async function pollReconnect() {
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      await apiRequest('/status');
      alert('Daemon reconnected!');
      loadAll();
    } catch {
      if (attempts < 20) setTimeout(poll, 2000);
      else alert('Failed to reconnect. Refresh the page.');
    }
  };
  poll();
}

// ============================================================================
// INIT
// ============================================================================

async function init() {
  document
    .getElementById('restart-daemon-btn')
    .addEventListener('click', restartDaemon);

  // Make functions global for onclick
  window.switchScene = switchScene;
  window.prevScene = prevScene;
  window.nextScene = nextScene;
  window.setDisplayPower = setDisplayPower;
  window.resetDevice = resetDevice;
  window.toggleDriver = toggleDriver;

  await loadAll();
  setInterval(loadAll, REFRESH_SLOW);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
