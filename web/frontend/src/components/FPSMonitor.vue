<template>
  <div v-if="showMonitor" class="fps-monitor">
    <v-chip
      :color="fpsColor"
      size="small"
      variant="tonal"
      class="fps-chip"
    >
      <v-icon icon="mdi-speedometer" size="small" class="mr-1" />
      {{ fps }} FPS
    </v-chip>
    <v-chip
      v-if="frametime > 0"
      color="info"
      size="small"
      variant="tonal"
      class="mt-1"
    >
      <v-icon icon="mdi-timer-outline" size="small" class="mr-1" />
      {{ frametime }}ms
    </v-chip>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useApi } from '../composables/useApi';

const props = defineProps({
  deviceIp: {
    type: String,
    required: true,
  },
  animated: {
    type: Boolean,
    default: false,
  },
  interval: {
    type: Number,
    default: 2000, // Update every 2 seconds
  },
});

const api = useApi();
const fps = ref(0);
const frametime = ref(0);
const showMonitor = computed(() => props.animated && fps.value > 0);

const fpsColor = computed(() => {
  if (fps.value >= 4) return 'success';
  if (fps.value >= 2) return 'warning';
  return 'error';
});

let updateInterval = null;

async function updateMetrics() {
  if (!props.animated) return;

  try {
    const metrics = await api.getDeviceMetrics(props.deviceIp);
    if (metrics && metrics.fps !== undefined) {
      fps.value = Math.round(metrics.fps * 10) / 10; // Round to 1 decimal
      frametime.value = metrics.frametime || 0;
    }
  } catch (err) {
    // Silently fail - FPS monitoring is non-critical
    console.debug('Failed to fetch FPS metrics:', err.message);
  }
}

// Watch for changes to animated prop
watch(
  () => props.animated,
  (newVal) => {
    if (newVal) {
      updateMetrics();
      if (!updateInterval) {
        updateInterval = setInterval(updateMetrics, props.interval);
      }
    } else {
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
      fps.value = 0;
      frametime.value = 0;
    }
  },
);

onMounted(() => {
  if (props.animated) {
    updateMetrics();
    updateInterval = setInterval(updateMetrics, props.interval);
  }
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
</script>

<style scoped>
.fps-monitor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fps-chip {
  min-width: 90px;
  justify-content: center;
}
</style>

