<template>
  <v-card elevation="1" class="device-card">
    <!-- Device Header -->
    <v-card-title class="pb-2">
      <div class="d-flex align-center justify-space-between w-100">
        <div class="d-flex align-center">
          <h3 class="text-h5 font-weight-bold mr-3">
            {{ deviceName }}
          </h3>
          <v-chip
            :color="statusColor"
            size="small"
            variant="flat"
            prepend-icon="mdi-circle"
            class="mr-2"
          >
            {{ statusText }}
          </v-chip>
          <v-chip
            :color="device.driver === 'real' ? 'info' : 'warning'"
            size="small"
            variant="flat"
          >
            {{ device.driver === 'real' ? 'Hardware' : 'Mock' }}
          </v-chip>
        </div>
        <div class="d-flex align-center">
          <v-chip
            :color="device.status === 'running' ? 'success' : 'grey'"
            size="small"
            variant="flat"
            class="mr-2"
          >
            {{ device.status === 'running' ? 'Active' : 'Stopped' }}
          </v-chip>
          <v-btn icon="mdi-chevron-up" variant="text" size="small"></v-btn>
        </div>
      </div>
    </v-card-title>

    <v-card-subtitle class="pt-0 pb-4">
      <div class="d-flex align-center text-medium-emphasis">
        <v-icon size="small" class="mr-1">mdi-wifi</v-icon>
        {{ device.ip }}
        <span class="ml-4">Last seen: {{ lastSeen }}</span>
      </div>
    </v-card-subtitle>

    <v-card-text class="pt-0">
      <!-- Power / Mock Mode / Reset Controls -->
      <div class="d-flex align-center mb-6">
        <v-icon icon="mdi-power" size="small" class="mr-2" />
        <span class="text-body-2 font-weight-medium mr-3">Power</span>
        <v-switch
          v-model="displayOn"
          color="success"
          hide-details
          density="compact"
          :loading="toggleLoading"
          @change="toggleDisplay"
          class="mr-6"
        ></v-switch>

        <span class="text-body-2 font-weight-medium mr-3">Mock Mode</span>
        <v-switch
          :model-value="device.driver === 'mock'"
          color="warning"
          hide-details
          density="compact"
          :loading="driverLoading"
          @change="toggleDriver"
          class="mr-6"
        ></v-switch>

        <v-btn
          color="error"
          variant="outlined"
          size="small"
          prepend-icon="mdi-restart"
          :loading="resetLoading"
          @click="handleReset"
        >
          Reset
        </v-btn>
      </div>

      <!-- Scene Control -->
      <div class="scene-control-section mb-4">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">Scene Control</h4>
        <div class="d-flex align-center mb-3">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            size="small"
            @click="previousScene"
            :disabled="loading"
          ></v-btn>

          <div class="scene-selector-wrapper flex-grow-1 mx-2">
            <scene-selector
              v-model="selectedScene"
              :disabled="loading"
              :loading="loading"
              @change="handleSceneChange"
            />
          </div>

          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            size="small"
            @click="nextScene"
            :disabled="loading"
          ></v-btn>
        </div>

        <!-- Current Scene Description -->
        <div v-if="currentSceneInfo" class="scene-description-card pa-4">
          <div class="d-flex align-center">
            <v-icon
              :icon="currentSceneInfo.wantsLoop ? 'mdi-play-circle' : 'mdi-image'"
              :color="currentSceneInfo.wantsLoop ? 'success' : 'info'"
              size="small"
              class="mr-2"
            ></v-icon>
            <div>
              <div class="text-subtitle-2 font-weight-bold">
                {{ currentSceneInfo.name }}
                <v-chip
                  v-if="currentSceneInfo.category"
                  size="x-small"
                  :color="categoryColor(currentSceneInfo.category)"
                  variant="flat"
                  class="ml-2"
                >
                  {{ currentSceneInfo.category }}
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ currentSceneInfo.description || 'No description' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="performance-metrics">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">
          Performance Metrics
        </h4>
        <v-row>
          <!-- Performance (FPS) -->
          <v-col cols="6" sm="6" md="3">
            <div class="metric-card metric-card-performance">
              <div class="metric-header">
                <v-icon icon="mdi-chart-line" size="small" class="mr-1" />
                Performance
              </div>
              <div class="metric-value">{{ fps }}</div>
              <div class="metric-label">FPS</div>
              <div class="metric-sublabel">
                Frame Time {{ frametime }}ms
              </div>
            </div>
          </v-col>

          <!-- Uptime -->
          <v-col cols="6" sm="6" md="3">
            <div class="metric-card metric-card-uptime">
              <div class="metric-header">
                <v-icon icon="mdi-clock-outline" size="small" class="mr-1" />
                Uptime
              </div>
              <div class="metric-value">{{ uptimeDisplay }}</div>
              <div class="metric-sublabel">Since startup</div>
            </div>
          </v-col>

          <!-- Frame Count -->
          <v-col cols="6" sm="6" md="3">
            <div class="metric-card metric-card-frames">
              <div class="metric-header">
                <v-icon icon="mdi-lightning-bolt" size="small" class="mr-1" />
                Frame Count
              </div>
              <div class="metric-value">{{ frameCount }}</div>
              <div class="metric-sublabel">Total frames sent</div>
            </div>
          </v-col>

          <!-- Errors -->
          <v-col cols="6" sm="6" md="3">
            <div class="metric-card metric-card-errors">
              <div class="metric-header">
                <v-icon icon="mdi-alert-circle" size="small" class="mr-1" />
                Errors
              </div>
              <div class="metric-value">{{ errorCount }}</div>
              <div class="metric-sublabel">Communication errors</div>
            </div>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDeviceStore } from '../store/devices';
import { useSceneStore } from '../store/scenes';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';
import SceneSelector from './SceneSelector.vue';

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['refresh']);

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const api = useApi();
const toast = useToast();

const selectedScene = ref(props.device.currentScene || '');
const loading = ref(false);
const toggleLoading = ref(false);
const resetLoading = ref(false);
const driverLoading = ref(false);
const displayOn = ref(true);

// Metrics
const fps = ref(0);
const frametime = ref(0);
const frameCount = ref(0);
const errorCount = ref(0);
const startTime = ref(Date.now());

let metricsInterval = null;

// Computed
const deviceName = computed(() => {
  // Generate friendly name from IP
  if (props.device.ip.includes('150')) return 'Office Display';
  if (props.device.ip.includes('151')) return 'Conference Room';
  return `Device ${props.device.ip.split('.').pop()}`;
});

const statusColor = computed(() => {
  return props.device.driver === 'real' ? 'success' : 'warning';
});

const statusText = computed(() => {
  return props.device.driver === 'real' ? 'Online' : 'Idle';
});

const lastSeen = computed(() => {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
});

const uptimeDisplay = computed(() => {
  const diff = Date.now() - startTime.value;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const currentSceneInfo = computed(() => {
  return sceneStore.getSceneByName(selectedScene.value);
});

// Watch for external changes
watch(
  () => props.device.currentScene,
  (newScene) => {
    if (newScene && newScene !== selectedScene.value) {
      selectedScene.value = newScene;
    }
  },
);

function categoryColor(category) {
  const colors = {
    Utility: 'purple',
    Data: 'blue',
    Custom: 'green',
    General: 'grey',
  };
  return colors[category] || 'grey';
}

async function loadMetrics() {
  try {
    const data = await api.getDeviceMetrics(props.device.ip);
    if (data) {
      fps.value = Math.round(data.fps || 0);
      frametime.value = data.frametime ? data.frametime.toFixed(1) : '0.0';
      frameCount.value = data.pushCount || 0;
      errorCount.value = data.errorCount || 0;
    }
  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
}

async function handleSceneChange(sceneName) {
  if (!sceneName || loading.value) return;

  loading.value = true;
  try {
    await api.switchScene(props.device.ip, sceneName, { clear: true });
    toast.success(`Switched to ${sceneName}`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to switch scene: ${err.message}`);
    selectedScene.value = props.device.currentScene || '';
  } finally {
    loading.value = false;
  }
}

function previousScene() {
  const scenes = sceneStore.scenes;
  const currentIndex = scenes.findIndex((s) => s.name === selectedScene.value);
  if (currentIndex > 0) {
    handleSceneChange(scenes[currentIndex - 1].name);
  }
}

function nextScene() {
  const scenes = sceneStore.scenes;
  const currentIndex = scenes.findIndex((s) => s.name === selectedScene.value);
  if (currentIndex < scenes.length - 1) {
    handleSceneChange(scenes[currentIndex + 1].name);
  }
}

async function toggleDisplay() {
  toggleLoading.value = true;
  try {
    const newState = displayOn.value;
    await api.setDisplayPower(props.device.ip, newState);
    toast.success(`Display turned ${newState ? 'on' : 'off'}`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to toggle display: ${err.message}`);
    displayOn.value = !displayOn.value;
  } finally {
    toggleLoading.value = false;
  }
}

async function handleReset() {
  const confirmed = confirm(
    `Reset device ${props.device.ip}? This will restart the scene.`,
  );
  if (!confirmed) return;

  resetLoading.value = true;
  try {
    await api.resetDevice(props.device.ip);
    toast.success('Device reset successfully', 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to reset device: ${err.message}`);
  } finally {
    resetLoading.value = false;
  }
}

async function toggleDriver() {
  const newDriver = props.device.driver === 'real' ? 'mock' : 'real';
  const confirmed = confirm(
    `Switch ${props.device.ip} to ${newDriver} driver?`,
  );
  if (!confirmed) return;

  driverLoading.value = true;
  try {
    await api.switchDriver(props.device.ip, newDriver);
    toast.success(`Switched to ${newDriver} driver`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to switch driver: ${err.message}`);
  } finally {
    driverLoading.value = false;
  }
}

onMounted(() => {
  loadMetrics();
  metricsInterval = setInterval(() => {
    loadMetrics();
  }, 2000);
});

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
});
</script>

<style scoped>
.device-card {
  border-radius: 16px !important;
  border: 1px solid #e5e7eb;
}

.scene-description-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 12px;
  border: 1px solid #d1fae5;
}

.scene-control-section {
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.performance-metrics {
  padding-top: 16px;
}

.metric-card {
  padding: 20px;
  border-radius: 12px;
  height: 140px;
  position: relative;
  overflow: hidden;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.metric-card-performance {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
}

.metric-card-uptime {
  background: linear-gradient(135deg, #6ee7b7 0%, #34d399 100%);
}

.metric-card-frames {
  background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
}

.metric-card-errors {
  background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%);
}

.metric-header {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 36px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}

.metric-sublabel {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
}

.scene-selector-wrapper {
  max-width: 400px;
}
</style>
