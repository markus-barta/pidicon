<template>
  <v-app-bar color="primary" prominent>
    <template v-slot:prepend>
      <v-icon icon="mdi-palette" size="large" class="ml-4" />
    </template>

    <v-app-bar-title> Pixoo Control Panel </v-app-bar-title>

    <template v-slot:append>
      <v-chip
        v-if="buildNumber"
        color="success"
        size="small"
        variant="flat"
        class="mr-2"
      >
        <v-icon icon="mdi-package-variant" size="small" class="mr-1" />
        Build #{{ buildNumber }}
      </v-chip>

      <v-chip
        :color="statusColor"
        size="small"
        variant="flat"
        class="mr-2"
      >
        <v-icon :icon="statusIcon" size="x-small" class="mr-1 pulse" />
        {{ status }}
      </v-chip>

      <v-chip
        v-if="uptime"
        color="info"
        size="small"
        variant="tonal"
        class="mr-2"
      >
        <v-icon icon="mdi-clock-outline" size="small" class="mr-1" />
        {{ uptime }}
      </v-chip>

      <v-btn
        icon="mdi-restart"
        variant="flat"
        color="warning"
        size="small"
        :loading="restarting"
        @click="handleRestart"
      >
        <v-icon>mdi-restart</v-icon>
        <v-tooltip activator="parent" location="bottom">
          Restart Daemon
        </v-tooltip>
      </v-btn>
    </template>
  </v-app-bar>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';

const api = useApi();
const toast = useToast();

const buildNumber = ref(null);
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

