<template>
  <v-app-bar color="white" elevation="0" height="80" class="border-b">
    <v-container fluid class="d-flex align-center px-8">
      <!-- Left: App Icon + Title -->
      <div class="d-flex align-center">
        <v-avatar color="primary" size="48" class="mr-4">
          <v-icon color="white" size="28">mdi-television</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold primary--text">
            Pixoo Control Center
          </div>
          <div class="text-caption text-medium-emphasis">
            IoT Display Management
          </div>
        </div>
      </div>

      <!-- Center: Status Badges -->
      <div class="d-flex align-center ml-8">
        <v-chip
          size="small"
          color="success"
          variant="flat"
          prepend-icon="mdi-circle"
          class="mr-2"
        >
          Daemon Active
        </v-chip>
        <v-chip size="small" color="info" variant="text" class="mr-2">
          <v-icon size="x-small" class="mr-1">mdi-docker</v-icon>
          {{ hostname }}
        </v-chip>
        <v-chip size="small" color="grey" variant="text">
          <v-icon size="x-small" class="mr-1">mdi-nodejs</v-icon>
          {{ nodeVersion }}
        </v-chip>
      </div>

      <v-spacer></v-spacer>

      <!-- Right: Connection + Restart -->
      <div class="d-flex align-center">
        <v-chip
          size="small"
          prepend-icon="mdi-access-point-network"
          variant="text"
          color="success"
          class="mr-4"
        >
          MQTT Connected
        </v-chip>
        <v-btn
          color="error"
          variant="outlined"
          prepend-icon="mdi-restart"
          @click="handleRestart"
          :loading="restarting"
          size="small"
        >
          Restart
        </v-btn>
      </div>
    </v-container>
  </v-app-bar>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';

const api = useApi();
const toast = useToast();

const buildNumber = ref(null);
const gitCommit = ref(null);
const hostname = ref('');
const nodeVersion = ref('Unknown');
const status = ref('Running');
const startTime = ref(null);
const uptime = ref('');
const restarting = ref(false);

const statusColor = computed(() => {
  if (status.value === 'Running') return 'success';
  if (status.value === 'Restarting') return 'warning';
  return 'error';
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
  const confirmed = confirm(
    'Are you sure you want to restart the daemon? This will briefly interrupt all displays.',
  );

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
</style>

