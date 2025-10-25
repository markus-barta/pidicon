<template>
  <v-app-bar app color="white" elevation="0" class="status-bar">
    <v-container fluid class="status-container">
      <!-- Header Row: Title + Status + Daemon Restart -->
      <div class="header-row">
        <div class="header-title">
          <v-avatar color="primary" size="40" class="mr-3">
            <v-icon color="white" size="24">mdi-television</v-icon>
          </v-avatar>
          <div class="title-text">
            <div class="text-h6 font-weight-bold primary--text">
              PIDICON<span class="app-subtitle">: Pixel Display Controller</span>
            </div>
          </div>
        </div>

        <div class="header-status">
          <div class="status-meta text-caption d-flex align-center">
            <span class="d-inline-flex align-center">
              <span
                class="status-dot"
                :class="{ 'status-dot--heartbeat': status === 'running' && !connectionFailed }"
                :style="statusDotStyles(statusColor)"
                :key="lastHeartbeat"
              ></span>
              <span class="status-label">{{ statusLabel }}</span>
            </span>
            <span class="separator">•</span>
            <v-tooltip
              location="bottom"
              :open-on-hover="true"
              :open-on-focus="true"
              content-class="mqtt-tooltip-panel"
            >
              <template #activator="{ props }">
                <span
                  class="d-inline-flex align-center mqtt-status-trigger"
                  tabindex="0"
                  v-bind="props"
                >
                  <span
                    class="status-dot"
                    :class="{ 'status-dot--heartbeat': mqttConnected }"
                    :style="statusDotStyles(mqttStatusColor)"
                    :key="mqttStatusDetails.lastHeartbeatTs"
                  ></span>
                  <span class="status-label">
                    {{ mqttStatus }}
                    <template v-if="mqttStatusDetails.lastHeartbeatTs">
                      <span class="last-heartbeat" :title="formatTimestamp(mqttStatusDetails.lastHeartbeatTs)">
                        • {{ formatRelative(mqttStatusDetails.lastHeartbeatTs) }}
                      </span>
                    </template>
                  </span>
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
                <div class="tooltip-row">
                  <span class="tooltip-label">Last Heartbeat</span>
                  <span class="tooltip-value">{{ mqttStatusDetails.lastHeartbeatTs ? formatTimestamp(mqttStatusDetails.lastHeartbeatTs) : '—' }}</span>
                </div>
                <div class="tooltip-row" v-if="mqttStatusDetails.lastError">
                  <span class="tooltip-label">Last Error</span>
                  <span class="tooltip-value tooltip-error">{{ mqttStatusDetails.lastError }}</span>
                </div>
              </div>
            </v-tooltip>
            <span class="separator status-detail-separator">•</span>
            <span class="status-detail">{{ uptime }}</span>
            <span class="separator status-detail-separator">•</span>
            <span class="status-detail">{{ hostname }}</span>
            <span class="separator status-detail-separator">•</span>
            <span class="status-detail">Node {{ nodeVersion }}</span>
          </div>
        </div>

        <div class="header-actions">
          <v-btn
            size="small"
            variant="outlined"
            color="error"
            @click="handleRestart"
            :loading="restarting"
            class="daemon-restart-btn critical-action"
            data-test="daemon-restart"
          >
            <v-icon size="small" class="mr-1">mdi-restart-alert</v-icon>
            <span class="text-caption">Daemon</span>
            <v-tooltip activator="parent" location="bottom">
              Restart entire daemon
            </v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Divider -->
      <v-divider class="my-2" />

      <!-- Navigation Tabs -->
      <v-tabs
        v-model="activeNav"
        color="primary"
        class="nav-tabs"
        density="compact"
        show-arrows
        hide-slider
      >
        <v-tab
          v-for="item in filteredNavItems"
          :key="item.value"
          :value="item.value"
          :data-test="item.testId"
        >
          <v-icon size="small" class="mr-2">{{ item.icon }}</v-icon>
          {{ item.label }}
        </v-tab>
      </v-tabs>
    </v-container>
  </v-app-bar>

  <!-- Confirm Dialog -->
  <confirm-dialog ref="confirmDialog" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';
import ConfirmDialog from './ConfirmDialog.vue';
import { useDevModeStore } from '../store/dev-mode';

const emit = defineEmits(['navigate']);
const props = defineProps({
  activeView: {
    type: String,
    default: 'devices'
  }
});

const api = useApi();
const toast = useToast();
const devModeStore = useDevModeStore();

const activeNav = ref(props.activeView);
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

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
};

const formatRelative = (timestamp) => {
  if (!timestamp) return 'never';
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'just now';
  if (diff < 60_000) {
    const seconds = Math.floor(diff / 1000);
    return seconds <= 1 ? 'just now' : `${seconds}s ago`;
  }
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `${minutes}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / 86_400_000);
  return `${days}d ago`;
};

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

const navItems = computed(() => [
  {
    value: 'devices',
    label: 'Dashboard',
    icon: 'mdi-view-dashboard',
    tooltip: 'View devices overview',
    testId: 'nav-devices'
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'mdi-cog',
    tooltip: 'Configure defaults and connectivity',
    testId: 'nav-settings'
  },
  {
    value: 'tests',
    label: 'Diagnostics',
    icon: 'mdi-clipboard-check-outline',
    tooltip: 'Run diagnostic tests',
    testId: 'nav-tests',
    requiresDev: true
  },
  {
    value: 'logs',
    label: 'Logs',
    icon: 'mdi-file-document-outline',
    tooltip: 'Inspect daemon logs',
    testId: 'nav-logs',
    requiresDev: true
  }
]);

const devMode = computed(() => devModeStore.enabled);

const filteredNavItems = computed(() =>
  navItems.value.filter((item) => {
    if (item.requiresDev && !devMode.value) {
      return false;
    }
    return true;
  }),
);

const statusDotStyles = (color) => ({
  display: 'inline-block',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: '6px',
});

watch(
  () => props.activeView,
  (value) => {
    activeNav.value = value;
  },
  { immediate: true }
);

watch(activeNav, (value) => {
  if (value && value !== props.activeView) {
    emit('navigate', value);
  }
});

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
.status-bar {
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
  height: auto !important;
}

.status-bar :deep(.v-toolbar__content) {
  height: auto !important;
  padding: 0;
}

.status-container {
  padding: 16px 24px 8px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.title-text {
  min-width: 0;
  line-height: 1.2;
}

.header-status {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.header-actions {
  display: flex;
  align-items: center;
}

.status-meta {
  color: #6b7280;
  gap: 6px;
  flex-wrap: wrap;
}

.status-label,
.status-detail {
  color: #6b7280;
  font-size: 0.75rem;
}

.status-label .last-heartbeat {
  margin-left: 4px;
  font-size: 0.7rem;
  color: rgba(15, 23, 42, 0.6);
}

.separator {
  color: #d1d5db;
  margin: 0 6px;
}

.status-detail-separator {
  display: inline;
}

.nav-tabs {
  margin-top: 0;
  flex-shrink: 0;
}

.nav-tabs :deep(.v-tab) {
  min-height: 32px !important;
  height: 32px !important;
  padding: 0 12px;
}

.nav-tabs :deep(.v-tab--selected) {
  background-color: rgba(139, 92, 246, 0.08);
  border-radius: 8px 8px 0 0;
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

.mqtt-tooltip-panel {
  background-color: #1e293b !important;
  color: #f8fafc !important;
}

.mqtt-tooltip-panel .tooltip-label {
  color: #cbd5f5;
}

.mqtt-tooltip-panel .tooltip-value {
  color: #e2e8f0;
}

.mqtt-tooltip-panel .tooltip-error {
  color: #fca5a5;
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

.daemon-restart-btn {
  transition: all 0.15s ease !important;
}

.daemon-restart-btn:hover {
  transform: translateY(-1px);
}

.daemon-restart-btn:active {
  transform: translateY(0);
}

.critical-action {
  border: 2px solid rgba(220, 38, 38, 0.5) !important;
  color: #b91c1c !important;
}

.critical-action .v-icon {
  color: #b91c1c !important;
}

.critical-action:hover {
  background-color: rgba(254, 226, 226, 0.4) !important;
}

/* Status dot heartbeat animation */
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  transition: all 0.3s ease;
}

.status-dot--heartbeat {
  animation: heartbeat-pulse 2s ease-in-out infinite;
}

@keyframes heartbeat-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2), 0 0 8px 2px rgba(16, 185, 129, 0.3);
  }
}

/* Responsive breakpoints */
@media (max-width: 1024px) {
  .status-detail-separator,
  .status-detail {
    display: none;
  }
}

@media (max-width: 800px) {
  .app-subtitle {
    display: none;
  }

  .status-container {
    padding: 8px 16px 0;
  }

  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-status {
    justify-content: flex-start;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

