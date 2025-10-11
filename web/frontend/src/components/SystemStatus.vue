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
              <span style="color: #6b7280;">{{ status }}</span>
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

      <!-- Right: Connection + Restart -->
      <div class="d-flex align-center">
        <v-chip
          size="small"
          variant="outlined"
          class="mr-4"
          style="border-color: #d1d5db;"
        >
          <v-tooltip activator="parent" location="bottom">
            <span>Connected to MQTT broker</span>
          </v-tooltip>
          <span style="display: inline-flex; align-items: center;">
            <span 
              style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #10b981; margin-right: 6px;"
              title="Connected to MQTT broker"
            ></span>
            <span style="color: #6b7280;">MQTT: {{ mqttBroker }}</span>
          </span>
        </v-chip>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-restart"
          @click="handleRestart"
          :loading="restarting"
          size="small"
          class="action-button-danger"
        >
          <span style="color: #dc2626; font-weight: 600;">Daemon</span>
          <v-tooltip activator="parent" location="bottom">
            Restart daemon process (all displays briefly show startup)
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
const status = ref('Active');
const startTime = ref(null);
const uptime = ref('');
const restarting = ref(false);
const confirmDialog = ref(null); // Ref to ConfirmDialog component

const statusColor = computed(() => {
  if (status.value === 'Active' || status.value === 'Running') return '#10b981'; // green
  if (status.value === 'Restarting') return '#f59e0b'; // yellow
  return '#ef4444'; // red
});

const statusIcon = computed(() => {
  if (status.value === 'Running') return 'mdi-circle';
  if (status.value === 'Restarting') return 'mdi-refresh';
  return 'mdi-alert-circle';
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
    buildNumber.value = data.buildNumber;
    gitCommit.value = data.gitCommit;
    hostname.value = data.hostname || 'Unknown';
    nodeVersion.value = data.nodeVersion || 'Unknown';
    mqttBroker.value = data.mqttBroker || 'localhost';
    status.value = data.status || 'Running';

    if (data.startTime) {
      startTime.value = new Date(data.startTime).getTime();
    } else {
      // Fallback: calculate from uptime
      startTime.value = Date.now() - (data.uptime || 0) * 1000;
    }

    updateUptime();
  } catch (err) {
    console.error('Failed to load system status:', err);
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
    status.value = 'Restarting';
    await api.restartDaemon();
    toast.warning('Daemon restarting... Will reconnect in ~5 seconds', 8000);

    // Wait a bit before trying to reconnect
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  } catch (err) {
    toast.error(`Failed to restart: ${err.message}`);
    restarting.value = false;
    status.value = 'Running';
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
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Danger action buttons with hover effects */
.action-button-danger {
  background-color: #fee2e2 !important;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2) !important;
  transition: all 0.2s ease !important;
}

.action-button-danger:hover {
  background-color: #fecaca !important;
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3) !important;
  transform: translateY(-1px);
}

.action-button-danger:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2) !important;
}
</style>

