<template>
  <v-app-bar color="white" elevation="0" height="80" class="border-b">
    <v-container fluid class="d-flex align-center px-8">
      <!-- Left: Avatar + Title -->
      <div class="d-flex align-center">
        <v-avatar color="primary" size="48" class="mr-4">
          <v-icon color="white" size="28">mdi-television</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold primary--text">
            PIDICON: Pixel Display Controller
          </div>
          <div class="text-caption d-flex align-center">
            <span class="d-inline-flex align-center">
              <span :style="{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, marginRight: '6px' }"></span>
              <span style="color: #6b7280;">Daemon: {{ statusLabel }}</span>
            </span>
            <span class="mx-2" style="color: #d1d5db;">•</span>
            <v-tooltip location="bottom" :open-on-hover="true" :open-on-focus="true">
              <template #activator="{ props }">
                <span
                  class="d-inline-flex align-center mqtt-status-trigger"
                  tabindex="0"
                  v-bind="props"
                >
                  <span :style="{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: mqttStatusColor, marginRight: '6px' }"></span>
                  <span style="color: #6b7280;">MQTT: {{ mqttStatus }}</span>
                </span>
              </template>
              <div class="mqtt-tooltip">
                <div class="tooltip-row">
                  <span class="tooltip-label">Connection</span>
                  <span class="tooltip-value">{{ mqttStatusDetails.connected ? 'Connected' : 'Disconnected' }}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">Broker URL</span>
                  <span class="tooltip-value">{{ mqttStatusDetails.brokerUrl || 'Not configured' }}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">Retry Count</span>
                  <span class="tooltip-value">{{ mqttStatusDetails.retryCount }}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">Next Retry</span>
                  <span class="tooltip-value">{{ nextRetryLabel }}</span>
                </div>
                <div class="tooltip-row" v-if="mqttStatusDetails.lastError">
                  <span class="tooltip-label">Last Error</span>
                  <span class="tooltip-value tooltip-error">{{ mqttStatusDetails.lastError }}</span>
                </div>
              </div>
            </v-tooltip>
            <span class="mx-2" style="color: #d1d5db;">•</span>
            <span style="color: #9ca3af;">Uptime: {{ uptime }}</span>
            <span class="mx-2" style="color: #d1d5db;">•</span>
            <span style="color: #9ca3af;">{{ hostname }}</span>
            <span class="mx-2" style="color: #d1d5db;">•</span>
            <span style="color: #9ca3af;">Node {{ nodeVersion }}</span>
          </div>
        </div>
      </div>

      <v-spacer></v-spacer>

      <!-- Right: Settings + Daemon Restart Buttons -->
      <div class="d-flex align-center" style="gap: 8px;">
        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          @click="emit('navigate', 'devices')"
          class="settings-btn"
          data-test="nav-devices"
        >
          <v-icon size="small" class="mr-1">mdi-view-dashboard</v-icon>
          <span class="text-caption">Devices</span>
          <v-tooltip activator="parent" location="bottom">
            View devices
          </v-tooltip>
        </v-btn>

        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          @click="emit('navigate', 'settings')"
          class="settings-btn"
          data-test="nav-settings"
        >
          <v-icon size="small" class="mr-1">mdi-cog</v-icon>
          <span class="text-caption">Settings</span>
          <v-tooltip activator="parent" location="bottom">
            Configure devices and settings
          </v-tooltip>
        </v-btn>

        <v-btn
          size="small"
          variant="outlined"
          color="grey"
          @click="handleRestart"
          :loading="restarting"
          class="daemon-restart-btn"
          data-test="daemon-restart"
        >
          <v-icon size="small" color="warning" class="mr-1">mdi-restart-alert</v-icon>
          <span class="text-caption">Daemon</span>
          <v-tooltip activator="parent" location="bottom">
            Restart entire daemon
          </v-tooltip>
        </v-btn>
      </div>
    </v-container>
  </v-app-bar>
  
  <!-- Confirm Dialog -->
  <confirm-dialog ref="confirmDialog" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';
import ConfirmDialog from './ConfirmDialog.vue';

const emit = defineEmits(['navigate']);

const api = useApi();
const toast = useToast();

const buildNumber = ref(null);
const gitCommit = ref(null);
const hostname = ref('');
const nodeVersion = ref('Unknown');
const mqttBroker = ref('localhost');
const mqttConnected = ref(true);
const mqttStatusDetails = ref({
  connected: true,
  lastError: null,
  retryCount: 0,
  nextRetryInMs: null,
  brokerUrl: null,
});
const status = ref('running');
const startTime = ref(null);
const trackedStartTime = ref(null);
const lastHeartbeat = ref(null);
const uptime = ref('');
const statusDetail = ref('');
const restarting = ref(false);
const confirmDialog = ref(null); // Ref to ConfirmDialog component
const lastSuccessfulLoad = ref(Date.now());
const connectionFailed = ref(false);

const statusColor = computed(() => {
  if (connectionFailed.value) return '#ef4444'; // red - daemon not responding
  if (status.value === 'running') return '#10b981'; // green
  if (status.value === 'restarting') return '#f59e0b'; // yellow
  return '#ef4444'; // red
});

const statusLabel = computed(() => {
  if (connectionFailed.value) return 'unresponsive';
  if (status.value === 'restarting') return 'restarting';
  return 'running';
});

const mqttStatusColor = computed(() => {
  return mqttConnected.value ? '#10b981' : '#ef4444';
});

const mqttStatus = computed(() => {
  if (!mqttConnected.value) {
    return mqttStatusDetails.value.lastError
      ? `offline (${mqttStatusDetails.value.lastError})`
      : 'disconnected';
  }
  return 'connected';
});

const nextRetryLabel = computed(() => {
  const ms = mqttStatusDetails.value.nextRetryInMs;
  if (ms === null || ms === undefined) return '—';
  if (ms >= 60000) {
    const mins = Math.round(ms / 60000);
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }
  if (ms >= 1000) {
    const secs = Math.round(ms / 1000);
    return `${secs}s`;
  }
  return `${ms}ms`;
});

let uptimeInterval = null;

function updateUptime() {
  if (!trackedStartTime.value) return;

  const now = Date.now();
  const diff = now - trackedStartTime.value;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    uptime.value = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    uptime.value = `${minutes}m ${seconds}s`;
  } else {
    uptime.value = `${seconds}s`;
  }
}

async function loadStatus() {
  try {
    const data = await api.getSystemStatus();
    
    // Successful load - update last successful time
    lastSuccessfulLoad.value = Date.now();
    
    // Only clear connection failed if we've had stable connection
    if (connectionFailed.value) {
      // Wait a bit to ensure connection is stable before clearing error
      setTimeout(() => {
        if (Date.now() - lastSuccessfulLoad.value < 1000) {
          connectionFailed.value = false;
        }
      }, 500);
    } else {
      connectionFailed.value = false;
    }
    
    buildNumber.value = data.buildNumber;
    gitCommit.value = data.gitCommit;
    hostname.value = data.hostname || 'Unknown';
    nodeVersion.value = data.nodeVersion || 'Unknown';
    mqttBroker.value = data.mqttBroker || 'localhost';
    const mqttStatusData = data.mqttStatus || {};
    mqttStatusDetails.value = {
      connected: mqttStatusData.connected !== false,
      lastError: mqttStatusData.lastError || null,
      retryCount: mqttStatusData.retryCount || 0,
      nextRetryInMs: mqttStatusData.nextRetryInMs ?? null,
      brokerUrl: mqttStatusData.brokerUrl || data.mqttBroker || null,
    };
    mqttConnected.value = mqttStatusDetails.value.connected;
    
    // Only update status if not manually restarting
    if (!restarting.value) {
      status.value = data.status?.toLowerCase() || 'running';
    }

    const start = data.daemonStartTime
      ? new Date(data.daemonStartTime).getTime()
      : data.startTime
        ? new Date(data.startTime).getTime()
        : Date.now() - (data.uptimeTrackedSeconds || data.uptime || 0) * 1000;
    trackedStartTime.value = start;

    if (data.daemonLastHeartbeat) {
      lastHeartbeat.value = new Date(data.daemonLastHeartbeat).getTime();
    }

    statusDetail.value = data.daemonHeartbeatStale
      ? 'Heartbeat stale'
      : 'Healthy';

    if (data.daemonHeartbeatStale) {
      const offlineSeconds = Math.max(
        0,
        Math.floor(
          (Date.now() - (lastHeartbeat.value || trackedStartTime.value)) / 1000,
        ),
      );
      const minutes = Math.floor(offlineSeconds / 60);
      const seconds = offlineSeconds % 60;
      uptime.value =
        minutes > 0
          ? `offline for ${minutes}m ${seconds}s`
          : `offline for ${seconds}s`;
      return;
    }

    updateUptime();
  } catch (err) {
    // Check if we've been down for more than 5 seconds
    const downtime = Date.now() - lastSuccessfulLoad.value;
    
    if (downtime > 5000 && !restarting.value) {
      // More than 5 seconds - show as unresponsive (unless we're restarting)
      const wasConnected = !connectionFailed.value;
      connectionFailed.value = true;
      
      // Only log once per failure
      if (wasConnected) {
        console.error('Daemon unresponsive:', err);
      }
    }
    // Otherwise, just silently wait (could be a restart or brief network issue)
  }
}

async function handleRestart() {
  // Use Vue confirm dialog instead of browser confirm
  const confirmed = await confirmDialog.value?.show({
    title: 'Restart Daemon',
    message: 'This will restart the Pixoo daemon process. All displays will briefly show the startup scene during the restart.',
    confirmText: 'Restart Daemon',
    cancelText: 'Cancel',
    confirmColor: 'warning',
    icon: 'mdi-restart',
    iconColor: 'warning'
  });

  if (!confirmed) return;

  try {
    restarting.value = true;
    status.value = 'restarting';
    await api.restartDaemon();
    toast.warning('Daemon restarting... Will reconnect in ~5 seconds', 8000);

    // Wait a bit before trying to reconnect
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  } catch (err) {
    toast.error(`Failed to restart: ${err.message}`);
    restarting.value = false;
    status.value = 'running';
  }
}

onMounted(() => {
  loadStatus();
  // Update uptime every second
  uptimeInterval = setInterval(updateUptime, 1000);
  // Refresh status every 30 seconds
  setInterval(loadStatus, 30000);
});

onUnmounted(() => {
  if (uptimeInterval) {
    clearInterval(uptimeInterval);
  }
});
</script>

<style scoped>
/* Daemon restart button styling */
.daemon-restart-btn {
  /* Remove custom height - let Vuetify handle it to match other buttons */
  transition: all 0.15s ease !important;
}

.mqtt-tooltip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.tooltip-label {
  color: #1e293b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tooltip-value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
}

.tooltip-error {
  color: #b91c1c;
}

.daemon-restart-btn:hover {
  transform: translateY(-1px);
}

.daemon-restart-btn:active {
  transform: translateY(0);
}
</style>

