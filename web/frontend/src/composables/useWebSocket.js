/**
 * @fileoverview WebSocket Composable - Real-time connection to backend
 * @description Provides WebSocket connection management and state updates
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { useDeviceStore } from '../store/devices';
import { useSceneStore } from '../store/scenes';

let ws = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

export function useWebSocket() {
  const connected = ref(false);
  const connecting = ref(false);
  const error = ref(null);

  const deviceStore = useDeviceStore();
  const sceneStore = useSceneStore();

  function connect() {
    if (connecting.value || (ws && ws.readyState === WebSocket.OPEN)) {
      return;
    }

    connecting.value = true;
    error.value = null;

    // Determine WebSocket URL (handle localhost and different ports)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port =
      window.location.port ||
      (window.location.protocol === 'https:' ? 443 : 80);
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    console.log(`[WebSocket] Connecting to ${wsUrl}...`);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected!');
        connected.value = true;
        connecting.value = false;
        reconnectAttempts = 0;
        error.value = null;

        // Send initial ping
        ws.send(JSON.stringify({ type: 'ping' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error(
            '[WebSocket] Failed to parse message:',
            err,
            event.data,
          );
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        connected.value = false;
        connecting.value = false;
        ws = null;

        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 3);
          console.log(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          );

          reconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        } else {
          error.value = 'Failed to connect after multiple attempts';
          console.error('[WebSocket] Max reconnection attempts reached');
        }
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        error.value = 'WebSocket connection error';
        connecting.value = false;
      };
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err);
      error.value = err.message;
      connecting.value = false;
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }

    connected.value = false;
    connecting.value = false;
  }

  function handleMessage(message) {
    console.log('[WebSocket] Message received:', message.type);

    switch (message.type) {
      case 'init':
        // Initial state on connection
        if (message.data.devices) {
          deviceStore.setDevices(message.data.devices);
        }
        if (message.data.scenes) {
          sceneStore.setScenes(message.data.scenes);
        }
        console.log('[WebSocket] Initial state loaded');
        break;

      case 'devices_update':
        // Full devices list update
        if (message.data) {
          deviceStore.setDevices(message.data);
          console.log('[WebSocket] Devices updated');
        }
        break;

      case 'device_update':
        // Single device update
        if (message.data && message.deviceIp) {
          deviceStore.updateDevice(message.deviceIp, message.data);
          console.log(`[WebSocket] Device ${message.deviceIp} updated`);
        }
        break;

      case 'scene_switch':
        // Scene switch notification
        if (message.deviceIp && message.scene) {
          deviceStore.updateDevice(message.deviceIp, {
            currentScene: message.scene,
          });
          console.log(
            `[WebSocket] Device ${message.deviceIp} switched to ${message.scene}`,
          );
        }
        break;

      case 'metrics_update':
        // Real-time metrics update
        if (message.deviceIp && message.metrics) {
          deviceStore.updateDevice(message.deviceIp, {
            metrics: message.metrics,
          });
          console.log(`[WebSocket] Metrics updated for ${message.deviceIp}`);
        }
        break;

      case 'pong':
        // Keepalive response
        console.log('[WebSocket] Pong received');
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', message.type);
    }
  }

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
  };
}

// Global WebSocket instance (singleton pattern)
let globalWs = null;

export function useGlobalWebSocket() {
  if (!globalWs) {
    globalWs = useWebSocket();
  }
  return globalWs;
}
