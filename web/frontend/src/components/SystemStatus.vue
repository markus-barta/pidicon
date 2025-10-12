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
            Pixoo Control Center
          </div>
          <div class="text-caption d-flex align-center">
            <span class="d-inline-flex align-center">
              <span :style="{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, marginRight: '6px' }"></span>
              <span style="color: #6b7280;">Daemon: {{ statusLabel }}</span>
            </span>
            <span class="mx-2" style="color: #d1d5db;">•</span>
            <span class="d-inline-flex align-center">
              <span :style="{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: mqttStatusColor, marginRight: '6px' }"></span>
              <span style="color: #6b7280;">MQTT: {{ mqttStatus }}</span>
            </span>
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

      <!-- Right: Daemon Restart Button -->
      <div class="d-flex align-center">
        <v-btn
          size="small"
          variant="outlined"
          color="grey"
          @click="handleRestart"
          :loading="restarting"
          class="daemon-restart-btn"
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

const api = useApi();
const toast = useToast();

const buildNumber = ref(null);
const gitCommit = ref(null);
const hostname = ref('');
const nodeVersion = ref('Unknown');
const mqttBroker = ref('localhost');
const mqttConnected = ref(true);
const status = ref('running');
const startTime = ref(null);
const uptime = ref('');
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
  return mqttConnected.value ? 'connected' : 'disconnected';
});

let uptimeInterval = null;

function updateUptime() {
  if (!startTime.value) return;

  const now = Date.now();
  const diff = now - startTime.value;

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
    mqttConnected.value = data.mqttConnected !== false; // Default to true
    
    // Only update status if not manually restarting
    if (!restarting.value) {
      status.value = data.status?.toLowerCase() || 'running';
    }

    if (data.startTime) {
      startTime.value = new Date(data.startTime).getTime();
    } else {
      // Fallback: calculate from uptime
      startTime.value = Date.now() - (data.uptime || 0) * 1000;
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
  min-width: 80px !important;
  height: 32px !important;
  padding: 0 12px !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

.daemon-restart-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15) !important;
}

.daemon-restart-btn:active {
  transform: translateY(0);
}
</style>

