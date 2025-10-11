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
            :color="device.driver === 'real' ? 'success-darken-2' : undefined"
            size="small"
            :variant="device.driver === 'real' ? 'flat' : 'outlined'"
            :style="device.driver === 'real' ? { backgroundColor: '#0f5132 !important' } : { borderColor: '#d1d5db' }"
            class="mr-2 status-badge"
          >
            <span style="display: inline-flex; align-items: center;">
              <span :style="{ 
                display: 'inline-block', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: device.driver === 'real' ? '#fff' : '#10b981', 
                marginRight: '6px' 
              }"></span>
              <span :style="{ color: device.driver === 'real' ? '#fff' : '#6b7280' }">
                {{ device.driver === 'real' ? 'Online' : 'Idle' }}
              </span>
            </span>
          </v-chip>
          <v-chip
            :color="device.driver === 'real' ? 'info-darken-2' : undefined"
            size="small"
            :variant="device.driver === 'real' ? 'flat' : 'outlined'"
            :style="device.driver === 'real' ? { backgroundColor: '#0c4a6e !important' } : { borderColor: '#d1d5db' }"
            class="status-badge"
          >
            <span style="display: inline-flex; align-items: center;">
              <span :style="{ 
                display: 'inline-block', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: device.driver === 'real' ? '#fff' : '#f59e0b', 
                marginRight: '6px' 
              }"></span>
              <span :style="{ color: device.driver === 'real' ? '#fff' : '#6b7280' }">
                {{ device.driver === 'real' ? 'Hardware' : 'Mock Mode' }}
              </span>
            </span>
          </v-chip>
        </div>
        <div class="d-flex align-center">
          <v-btn
            :icon="isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
            variant="text"
            size="small"
            @click="isCollapsed = !isCollapsed"
          ></v-btn>
        </div>
      </div>
    </v-card-title>

    <v-card-subtitle v-if="!isCollapsed" class="pt-0 pb-4">
      <div class="d-flex align-center text-medium-emphasis">
        <v-icon size="small" class="mr-1">mdi-wifi</v-icon>
        {{ device.ip }}
        <span class="ml-4">Last seen: {{ lastSeen }}</span>
      </div>
    </v-card-subtitle>

    <v-card-text v-if="!isCollapsed" class="pt-0">
      <!-- Power / Mock Mode / Reset / Brightness Controls -->
      <div class="controls-row mb-6">
        <div class="control-item">
          <v-icon icon="mdi-power" size="small" class="mr-2" />
          <span class="text-body-2 font-weight-medium mr-3">Power</span>
          <v-switch
            v-model="displayOn"
            color="success"
            hide-details
            density="compact"
            :loading="toggleLoading"
            @change="toggleDisplay"
          ></v-switch>
        </div>

        <div class="control-item">
          <span class="text-body-2 font-weight-medium mr-3">Mock Mode</span>
          <v-switch
            :model-value="device.driver === 'mock'"
            color="warning"
            hide-details
            density="compact"
            :loading="driverLoading"
            @change="toggleDriver"
          ></v-switch>
        </div>

        <v-btn
          color="error"
          variant="tonal"
          size="small"
          prepend-icon="mdi-restart"
          :loading="resetLoading"
          @click="handleReset"
          class="action-button"
        >
          Reset Pixoo
        </v-btn>

        <v-spacer></v-spacer>

        <!-- Brightness Slider (right-aligned) -->
        <div class="brightness-slider-compact">
          <v-icon size="small" class="mr-2">mdi-brightness-6</v-icon>
          <v-slider
            v-model="brightness"
            :min="0"
            :max="100"
            :step="5"
            color="grey-darken-1"
            hide-details
            :loading="brightnessLoading"
            @end="setBrightness"
            style="width: 200px"
          ></v-slider>
          <span class="text-caption ml-2" style="width: 40px">
            {{ brightness }}%
          </span>
        </div>
      </div>

      <!-- Scene Control -->
      <div class="scene-control-section mb-4">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">Scene Control</h4>
        
        <!-- Scene Selector -->
        <div class="mb-3">
          <scene-selector
            v-model="selectedScene"
            :disabled="loading"
            :loading="loading"
            @change="handleSceneChange"
          />
        </div>

        <!-- Cassette Player Controls -->
        <div class="cassette-player-controls">
          <v-btn
            icon="mdi-skip-previous"
            :variant="isPressed('prior') ? 'tonal' : 'text'"
            :color="isPressed('prior') ? 'grey-darken-2' : 'grey'"
            size="large"
            @click="handlePrior"
            :disabled="loading"
            class="cassette-btn"
            title="Previous scene"
          />
          
          <v-btn
            icon="mdi-stop"
            :variant="isPressed('stop') ? 'tonal' : 'text'"
            :color="isPressed('stop') ? 'grey-darken-2' : 'grey'"
            size="large"
            @click="handleStop"
            :disabled="loading"
            class="cassette-btn"
            title="Stop scene"
          />

          <v-btn
            icon="mdi-play"
            :variant="isPressed('play') ? 'tonal' : 'text'"
            :color="isPressed('play') ? 'success' : 'grey'"
            size="large"
            @click="handlePlay"
            :disabled="loading"
            class="cassette-btn"
            title="Play scene"
          />

          <v-btn
            icon="mdi-pause"
            :variant="isPressed('pause') ? 'tonal' : 'text'"
            :color="isPressed('pause') ? 'warning' : 'grey'"
            size="large"
            @click="handlePause"
            :disabled="loading || !currentSceneInfo?.wantsLoop"
            class="cassette-btn"
            title="Pause scene"
          />

          <v-btn
            icon="mdi-restart"
            :variant="isPressed('restart') ? 'tonal' : 'text'"
            :color="isPressed('restart') ? 'grey-darken-2' : 'grey'"
            size="large"
            @click="handleRestart"
            :disabled="loading"
            class="cassette-btn"
            title="Restart scene"
          />

          <v-btn
            icon="mdi-skip-next"
            :variant="isPressed('next') ? 'tonal' : 'text'"
            :color="isPressed('next') ? 'grey-darken-2' : 'grey'"
            size="large"
            @click="handleNext"
            :disabled="loading"
            class="cassette-btn"
            title="Next scene"
          />
        </div>

        <!-- Scene Description Card -->
        <div v-if="currentSceneInfo" class="scene-description-card pa-4">
          <div class="d-flex align-start">
            <v-icon
              :icon="currentSceneInfo.wantsLoop ? 'mdi-play-circle' : 'mdi-image'"
              :color="currentSceneInfo.wantsLoop ? 'success' : 'info'"
              size="small"
              class="mr-3 mt-1"
            ></v-icon>
            <div class="flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="d-flex align-center">
                  <span class="text-subtitle-2 font-weight-bold mr-2">
                    {{ formatSceneName(currentSceneInfo.name) }}
                  </span>
                  <!-- Scene State Indicator (UI-510) - stays on left -->
                  <v-chip
                    :color="sceneStateColor"
                    size="small"
                    variant="flat"
                  >
                    <v-icon start size="x-small">{{ sceneStateIcon }}</v-icon>
                    {{ sceneStateLabel }}
                  </v-chip>
                </div>

                <!-- Scene badges moved to right -->
                <div class="d-flex align-center">
                  <span
                    v-if="currentSceneInfo.category"
                    class="scene-tag"
                    :style="{ '--tag-color': categoryColor(currentSceneInfo.category) }"
                  >
                    {{ currentSceneInfo.category }}
                  </span>
                  <span
                    v-if="currentSceneInfo.wantsLoop"
                    class="scene-tag ml-1"
                    style="--tag-color: #10b981"
                  >
                    Animated
                  </span>
                </div>
              </div>
              <p class="text-body-2" style="color: #6b7280;" mb-0>
                {{ currentSceneInfo.description || 'No description available for this scene.' }}
              </p>

              <!-- Scene Metadata/Payload Viewer -->
              <v-expansion-panels v-if="selectedSceneMetadata" class="mt-3" variant="accordion">
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-caption">
                    <v-icon class="mr-2" size="small">mdi-code-json</v-icon>
                    <span class="font-weight-medium">Scene Configuration</span>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <SceneMetadataViewer :metadata="selectedSceneMetadata" />
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="metrics-section">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">
          Performance Metrics
        </h4>
        <div class="metrics-grid">
          <!-- Performance Card (FPS + Frametime + Frame Count) -->
          <v-card class="metric-card metric-card-performance" elevation="0" style="border-left: 4px solid #3b82f6;">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="metric-header" style="color: #3b82f6;">Performance</div>
                <v-icon size="large" style="opacity: 0.2; color: #3b82f6;">mdi-speedometer</v-icon>
              </div>
              <div class="metric-value mb-1" style="color: #1e293b;">{{ fpsDisplay }} FPS</div>
              <div class="text-caption" style="color: #64748b;">
                {{ frametime }}ms frametime
              </div>
              <div class="text-caption" style="color: #94a3b8;">
                {{ frameCount.toLocaleString() }} frames sent
              </div>
            </v-card-text>
          </v-card>

          <!-- Uptime Card -->
          <v-card class="metric-card metric-card-uptime" elevation="0" style="border-left: 4px solid #10b981;">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="metric-header" style="color: #10b981;">Uptime</div>
                <v-icon size="large" style="opacity: 0.2; color: #10b981;">mdi-clock-outline</v-icon>
              </div>
              <div class="metric-value mb-1" style="color: #1e293b;">{{ uptimeDisplay }}</div>
              <div class="text-caption" style="color: #64748b;">
                Since daemon start
              </div>
            </v-card-text>
          </v-card>

          <!-- Scene Time Card -->
          <v-card class="metric-card metric-card-scene" elevation="0" style="border-left: 4px solid #8b5cf6;">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="metric-header" style="color: #8b5cf6;">Scene Time</div>
                <v-icon size="large" style="opacity: 0.2; color: #8b5cf6;">mdi-play-circle-outline</v-icon>
              </div>
              <div class="metric-value mb-1" style="color: #1e293b;">{{ sceneTimeDisplay }}</div>
              <div class="text-caption" style="color: #64748b;">
                {{ sceneStatusText }}
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Frametime Chart Card (Full Width) - Hidden in mock mode -->
        <v-row v-if="device.driver !== 'mock'" dense class="mt-4">
          <v-col cols="12">
            <v-card class="metric-card metric-card-chart" elevation="0">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="metric-header">Frametime History</div>
                  <v-icon size="large" style="opacity: 0.15;">mdi-chart-line</v-icon>
                </div>
                <div style="height: 80px; position: relative;">
                  <v-chart 
                    v-if="chartOptions"
                    :option="chartOptions" 
                    autoresize 
                    style="height: 100%; width: 100%;"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>

  <!-- Confirm Dialog (UI-512) -->
  <confirm-dialog ref="confirmDialog" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { useDeviceStore } from '../store/devices';
import { useSceneStore } from '../store/scenes';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';

// Register ECharts components
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);
import SceneSelector from './SceneSelector.vue';
import SceneMetadataViewer from './SceneMetadataViewer.vue';
import ConfirmDialog from './ConfirmDialog.vue';

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
const brightnessLoading = ref(false);
const displayOn = ref(true);
const brightness = ref(75);
const previousBrightness = ref(75); // Store brightness before power off
const isCollapsed = ref(props.device.driver === 'mock'); // Collapse mock devices by default
const confirmDialog = ref(null); // Ref to ConfirmDialog component

// Metrics
const fps = ref(0);
const frametime = ref(0);
const frameCount = ref(0);
const errorCount = ref(0);
const pushCount = ref(0);
const startTime = ref(Date.now());
const daemonStartTime = ref(Date.now());
const frametimeHistory = ref([]);
const lastFrameCount = ref(0); // Track last frame count for chart optimization (UI-513)
const sceneStartTime = ref(Date.now());
const sceneTimeDisplay = ref('0s');
let uptimeInterval = null;
let sceneTimeInterval = null;

let metricsInterval = null;

// Computed
const deviceName = computed(() => {
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

const fpsDisplay = computed(() => {
  // Check if scene is static (non-looping)
  if (!currentSceneInfo.value?.wantsLoop) {
    return 'static';
  }
  
  // If FPS is 0 or frametime is 0, show dash
  if (fps.value === 0 || frametime.value === 0) {
    return '-';
  }
  
  // For animated scenes: Show 1 decimal place (e.g., 4.2, 20.3, 5.7)
  return fps.value.toFixed(1);
});

const uptimeDisplay = ref('0s');

function updateUptime() {
  const diff = Date.now() - daemonStartTime.value;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (hours > 0) {
    uptimeDisplay.value = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    uptimeDisplay.value = `${minutes}m ${seconds}s`;
  } else {
    uptimeDisplay.value = `${seconds}s`;
  }
}

function updateSceneTime() {
  // Check if scene is completed
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted) {
    sceneTimeDisplay.value = 'Complete';
    if (sceneTimeInterval) {
      clearInterval(sceneTimeInterval);
      sceneTimeInterval = null;
    }
    return;
  }
  
  // Check if scene is not running (stopped)
  if (sceneState?.isRunning === false && !currentSceneInfo.value?.wantsLoop) {
    sceneTimeDisplay.value = 'Stopped';
    if (sceneTimeInterval) {
      clearInterval(sceneTimeInterval);
      sceneTimeInterval = null;
    }
    return;
  }
  
  // For static scenes, show time since loaded but don't keep incrementing
  // (Timer will pause after first render)
  if (!currentSceneInfo.value?.wantsLoop) {
    const diff = Date.now() - sceneStartTime.value;
    if (diff < 1000) {
      sceneTimeDisplay.value = 'Just now';
    } else {
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) {
        sceneTimeDisplay.value = `${seconds}s ago`;
      } else {
        const minutes = Math.floor(seconds / 60);
        sceneTimeDisplay.value = `${minutes}m ago`;
      }
    }
    return;
  }
  
  // For animated scenes, show running time
  const diff = Date.now() - sceneStartTime.value;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (hours > 0) {
    sceneTimeDisplay.value = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    sceneTimeDisplay.value = `${minutes}m ${seconds}s`;
  } else {
    sceneTimeDisplay.value = `${seconds}s`;
  }
}

const currentSceneInfo = computed(() => {
  return sceneStore.getSceneByName(selectedScene.value);
});

// Get scene metadata/payload for the selected scene
const selectedSceneMetadata = computed(() => {
  if (!selectedScene.value || !props.device) return null;
  
  // For the currently active scene, check if there's payload in the device state
  // This would be set when switching scenes via MQTT with payload
  const devicePayload = props.device?.payload;
  
  // If the selected scene is the active scene and has payload, use it
  if (selectedScene.value === props.device.currentScene && devicePayload && Object.keys(devicePayload).length > 0) {
    return devicePayload;
  }
  
  // Otherwise, show scene's default config/metadata if available
  const sceneInfo = sceneStore.getSceneByName(selectedScene.value);
  return sceneInfo?.config || sceneInfo?.metadata || null;
});

const sceneStatusText = computed(() => {
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted) {
    return 'Complete';
  }
  if (sceneState?.isRunning === false) {
    return 'Stopped';
  }
  return currentSceneInfo.value?.wantsLoop ? 'Running' : 'Static';
});

// Scene state display (UI-510)
const sceneStateLabel = computed(() => {
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted) return 'Complete';
  if (sceneState?.isRunning === false) return 'Stopped';
  if (!currentSceneInfo.value?.wantsLoop) return 'Static';
  return 'Looping';
});

const sceneStateColor = computed(() => {
  const label = sceneStateLabel.value;
  const colors = {
    Starting: 'blue',
    Looping: 'green',
    Stopped: 'grey',
    Complete: 'success',
    Static: 'info',
  };
  return colors[label] || 'grey';
});

const sceneStateIcon = computed(() => {
  const label = sceneStateLabel.value;
  const icons = {
    Starting: 'mdi-play-circle-outline',
    Looping: 'mdi-sync',
    Stopped: 'mdi-stop-circle',
    Complete: 'mdi-check-circle',
    Static: 'mdi-image',
  };
  return icons[label] || 'mdi-help-circle';
});

const successRate = computed(() => {
  const total = pushCount.value + errorCount.value;
  if (total === 0) return 100;
  return Math.round((pushCount.value / total) * 100);
});

// Cassette player button states
const playState = computed(() => props.device?.playState || 'stopped');

function isPressed(button) {
  const state = playState.value;
  
  switch (button) {
    case 'play':
      return state === 'playing' || state === 'paused';
    case 'pause':
      return state === 'paused';
    case 'stop':
      return state === 'stopped';
    case 'prior':
    case 'next':
    case 'restart':
      return false; // Momentary actions, never stay pressed
    default:
      return false;
  }
}

// ECharts configuration - reactively updates when frametimeHistory changes
const chartOptions = computed(() => {
  if (frametimeHistory.value.length === 0) return null;
  
  const data = frametimeHistory.value;
  const latestFrametime = data[data.length - 1];
  const color = getFrametimeColor(latestFrametime);
  
  return {
    grid: {
      left: 5,
      right: 45,  // Increased from 35 for better Y-axis label spacing
      top: 5,
      bottom: 15,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      show: true,
      data: data.map((_, i) => i),
      axisLine: {
        show: true,  // Show X-axis line
        lineStyle: {
          color: '#e5e7eb',
          width: 1
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      show: true,
      position: 'right',
      min: (value) => Math.floor(value.min * 0.9),
      max: (value) => Math.ceil(value.max * 1.1),
      axisLine: {
        show: true,
        lineStyle: {
          color: '#e5e7eb',
          width: 1
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        formatter: '{value}ms',
        fontSize: 9,
        color: '#9ca3af',
        margin: 8  // Add spacing between axis and labels
      },
      splitLine: {
        lineStyle: {
          color: '#e5e7eb',
          width: 1,
          type: 'solid',
          opacity: 0.3
        }
      }
    },
    series: [
      {
        data: data,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: color,
          width: 2
        },
        areaStyle: {
          color: color.replace('rgb', 'rgba').replace(')', ', 0.05)')
        }
      }
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        return `${params[0].value}ms`;
      }
    },
    animation: false
  };
});

// Watch for external changes
watch(
  () => props.device.currentScene,
  (newScene, oldScene) => {
    if (newScene && newScene !== selectedScene.value) {
      selectedScene.value = newScene;
    }
    // Reset scene timer when scene changes
    if (newScene !== oldScene) {
      sceneStartTime.value = Date.now();
      updateSceneTime();
      
      // Restart metrics polling if it was stopped
      if (!metricsInterval) {
        console.log('[DEBUG] Scene changed - restarting metrics polling');
        metricsInterval = setInterval(() => {
          loadMetrics();
        }, 200);
      }
      
      // Restart scene time interval if it was stopped
      if (!sceneTimeInterval) {
        sceneTimeInterval = setInterval(updateSceneTime, 1000);
      }
    }
  },
);

// Watch device metrics for changes (when parent refreshes)
watch(
  () => props.device.metrics,
  (newMetrics) => {
    console.log('[DEBUG] Device metrics changed:', newMetrics);
    if (newMetrics && !isCollapsed.value) {
      loadMetrics();
    }
  },
  { deep: true }
);

// Watch for scene completion to stop timer immediately (UI-506)
watch(
  () => props.device.sceneState,
  (newState) => {
    console.log('[DEBUG] sceneState watch triggered:', newState);
    if (newState?.testCompleted || newState?.isRunning === false) {
      console.log('[DEBUG] Scene completed/stopped - stopping ALL timers');
      
      // Stop scene time counter
      if (sceneTimeInterval) {
        clearInterval(sceneTimeInterval);
        sceneTimeInterval = null;
      }
      
      // Stop metrics/chart polling
      if (metricsInterval) {
        clearInterval(metricsInterval);
        metricsInterval = null;
      }
      
      updateSceneTime(); // Final update to show "Complete" or "Stopped"
    }
  },
  { deep: true }
);

// ECharts handles visibility automatically - no manual initialization needed!

// Chart updates automatically via computed property - no watcher needed!

function formatSceneName(name) {
  // Convert snake_case to Title Case
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categoryColor(category) {
  const colors = {
    Utility: '#a855f7',
    Data: '#3b82f6',
    Custom: '#10b981',
    General: '#6b7280',
  };
  return colors[category] || '#6b7280';
}

function loadMetrics() {
  console.log('[DEBUG] === loadMetrics START ===');
  console.log('[DEBUG] props.device:', props.device);
  console.log('[DEBUG] isCollapsed:', isCollapsed.value);
  
  // Check if scene is completed or not running
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted || sceneState?.isRunning === false) {
    console.log('[DEBUG] Scene completed or not running - stopping metrics polling');
    if (metricsInterval) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
    return;
  }
  
  // Metrics are already in props.device.metrics! No API call needed!
  const metrics = props.device?.metrics;
  console.log('[DEBUG] metrics:', metrics);
  
  if (!metrics) {
    console.warn('[DEBUG] No metrics available on device object');
    return;
  }
  
  // Calculate FPS from frametime - use raw value for accurate FPS
  const rawFrametime = metrics.lastFrametime || 0;
  const newFrametime = Math.round(rawFrametime);
  console.log('[DEBUG] rawFrametime:', rawFrametime, 'rounded:', newFrametime);
  
  // Use raw frametime for FPS calculation to get accurate decimals
  fps.value = rawFrametime > 0 ? Math.round((1000 / rawFrametime) * 10) / 10 : 0;
  frametime.value = newFrametime;
  const newFrameCount = metrics.pushes || 0;
  frameCount.value = newFrameCount;
  errorCount.value = metrics.errors || 0;
  pushCount.value = metrics.pushes || 0;
  
  // Only update chart when frames are actually sent (UI-513)
  // This prevents static scenes from polluting the chart with duplicate values
  if (isCollapsed.value) {
    console.log('[DEBUG] Card is collapsed - skipping chart');
    return;
  }
  
  // Check if a new frame was actually sent
  const frameCountChanged = newFrameCount !== lastFrameCount.value;
  if (!frameCountChanged) {
    console.log(`[DEBUG] No new frame sent (count: ${newFrameCount}) - skipping chart update`);
    console.log('[DEBUG] === loadMetrics END (no chart update) ===\n');
    return;
  }
  
  // Frame was sent - update chart
  lastFrameCount.value = newFrameCount;
  const chartValue = Math.max(1, newFrametime);
  
  console.log(`[DEBUG] NEW FRAME - History before: ${frametimeHistory.value.length}, pushing: ${chartValue}`);
  frametimeHistory.value.push(chartValue);
  console.log(`[DEBUG] NEW FRAME - History after: ${frametimeHistory.value.length}, array:`, frametimeHistory.value);
  
  // Keep last 300 data points (60 seconds / 1 minute at 200ms intervals)
  if (frametimeHistory.value.length > 300) {
    const removed = frametimeHistory.value.shift();
    console.log(`[DEBUG] SHIFT - Removed oldest value: ${removed}`);
  }
  
  // Chart updates automatically via computed property - no manual update needed!
  console.log('[DEBUG] === loadMetrics END (chart updated) ===\n');
}

// Get color based on frametime - using SIMPLE scheme from performance-utils.js
// This matches the visual appearance better
function getFrametimeColor(frametime) {
  const MIN_FRAMETIME = 1;
  const MAX_FRAMETIME = 500;
  
  const ratio = (frametime - MIN_FRAMETIME) / (MAX_FRAMETIME - MIN_FRAMETIME);
  
  let r, g, b;
  
  if (ratio <= 0.2) {
    // Blue to blue-green (0-100ms) - Very fast
    r = 0;
    g = Math.round(255 * (ratio / 0.2));
    b = Math.round(255 * ratio);
  } else if (ratio <= 0.4) {
    // Blue-green to green (100-200ms) - Fast  ← 200ms is HERE!
    const subRatio = (ratio - 0.2) / 0.2;
    r = 0;
    g = 255;
    b = Math.round(128 + 127 * subRatio);
  } else if (ratio <= 0.6) {
    // Green to yellow-green (200-300ms) - Medium
    const subRatio = (ratio - 0.4) / 0.2;
    r = Math.round(255 * subRatio);
    g = 255;
    b = Math.round(255 * (1 - subRatio));
  } else if (ratio <= 0.8) {
    // Yellow to orange (300-400ms) - Slow
    const subRatio = (ratio - 0.6) / 0.2;
    r = 255;
    g = Math.round(255 * (1 - subRatio));
    b = 0;
  } else {
    // Orange to red (400-500ms+) - Very slow
    const subRatio = Math.min(1, (ratio - 0.8) / 0.2);
    r = 255;
    g = Math.round(128 * (1 - subRatio));
    b = 0;
  }
  
  return `rgb(${r}, ${g}, ${b})`;
}

// Chart.js functions removed - now using ECharts with reactive computed property!

async function handleSceneChange(sceneName) {
  if (!sceneName || loading.value) return;

  loading.value = true;
  try {
    await api.switchScene(props.device.ip, sceneName, { clear: true });
    toast.success(`Switched to ${formatSceneName(sceneName)}`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to switch scene: ${err.message}`);
    selectedScene.value = props.device.currentScene || '';
  } finally {
    loading.value = false;
  }
}

// ============================================================================
// Cassette Player Control Handlers
// ============================================================================

async function handlePlay() {
  if (loading.value) return;

  const state = playState.value;
  
  if (state === 'paused') {
    // Resume paused scene
    loading.value = true;
    try {
      await api.resumeScene(props.device.ip);
      toast.success('Scene resumed', 2000);
      emit('refresh');
    } catch (err) {
      toast.error(`Failed to resume: ${err.message}`);
    } finally {
      loading.value = false;
    }
  } else if (state === 'stopped') {
    // Resume stopped scene (scene is still loaded, just restart it)
    const currentScene = props.device.currentScene;
    if (currentScene && selectedScene.value === currentScene) {
      // Same scene - just resume/restart
      loading.value = true;
      try {
        await api.resumeScene(props.device.ip);
        toast.success('Scene resumed', 2000);
        emit('refresh');
      } catch (err) {
        toast.error(`Failed to resume: ${err.message}`);
      } finally {
        loading.value = false;
      }
    } else if (selectedScene.value) {
      // Different scene selected - switch to it
      loading.value = true;
      try {
        await api.switchScene(props.device.ip, selectedScene.value, { clear: true });
        toast.success(`Playing ${formatSceneName(selectedScene.value)}`, 2000);
        emit('refresh');
      } catch (err) {
        toast.error(`Failed to play: ${err.message}`);
      } finally {
        loading.value = false;
      }
    }
  }
  // If already playing, do nothing
}

async function handlePause() {
  if (loading.value) return;

  const state = playState.value;
  
  if (state === 'paused') {
    // Unpause (same as play)
    await handlePlay();
  } else if (state === 'playing') {
    // Pause
    loading.value = true;
    try {
      await api.pauseScene(props.device.ip);
      toast.success('Scene paused', 2000);
      emit('refresh');
    } catch (err) {
      toast.error(`Failed to pause: ${err.message}`);
    } finally {
      loading.value = false;
    }
  }
}

async function handleStop() {
  if (loading.value) return;

  loading.value = true;
  try {
    await api.stopScene(props.device.ip);
    toast.success('Scene stopped', 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to stop: ${err.message}`);
  } finally {
    loading.value = false;
  }
}

async function handleRestart() {
  if (!selectedScene.value || loading.value) return;

  loading.value = true;
  try {
    // Stop, then play (resend scene)
    await api.switchScene(props.device.ip, selectedScene.value, { clear: true });
    toast.success(`Restarted ${formatSceneName(selectedScene.value)}`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to restart: ${err.message}`);
  } finally {
    loading.value = false;
  }
}

async function handlePrior() {
  const scenes = sceneStore.scenes;
  const currentIndex = scenes.findIndex((s) => s.name === selectedScene.value);
  if (currentIndex > 0) {
    const prevScene = scenes[currentIndex - 1].name;
    loading.value = true;
    try {
      // Stop current, switch to previous, play
      await api.switchScene(props.device.ip, prevScene, { clear: true });
      selectedScene.value = prevScene;
      toast.success(`Playing ${formatSceneName(prevScene)}`, 2000);
      emit('refresh');
    } catch (err) {
      toast.error(`Failed to switch scene: ${err.message}`);
    } finally {
      loading.value = false;
    }
  }
}

async function handleNext() {
  const scenes = sceneStore.scenes;
  const currentIndex = scenes.findIndex((s) => s.name === selectedScene.value);
  if (currentIndex < scenes.length - 1) {
    const nextScene = scenes[currentIndex + 1].name;
    loading.value = true;
    try {
      // Stop current, switch to next, play
      await api.switchScene(props.device.ip, nextScene, { clear: true });
      selectedScene.value = nextScene;
      toast.success(`Playing ${formatSceneName(nextScene)}`, 2000);
      emit('refresh');
    } catch (err) {
      toast.error(`Failed to switch scene: ${err.message}`);
    } finally {
      loading.value = false;
    }
  }
}

async function toggleDisplay() {
  toggleLoading.value = true;
  try {
    const newState = displayOn.value;
    
    if (!newState) {
      // Power OFF: Store current brightness, set to 0, switch to empty scene
      previousBrightness.value = brightness.value;
      brightness.value = 0;
      await api.setDisplayBrightness(props.device.ip, 0);
      await api.switchScene(props.device.ip, 'empty', { clear: true });
      toast.success('Display powered off', 2000);
    } else {
      // Power ON: Restore brightness, switch to startup scene
      brightness.value = previousBrightness.value || 75;
      await api.setDisplayBrightness(props.device.ip, brightness.value);
      await api.switchScene(props.device.ip, 'startup', { clear: true });
      toast.success('Display powered on', 2000);
    }
    
    await api.setDisplayPower(props.device.ip, newState);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to toggle display: ${err.message}`);
    displayOn.value = !displayOn.value;
  } finally {
    toggleLoading.value = false;
  }
}

async function setBrightness() {
  brightnessLoading.value = true;
  try {
    await api.setDisplayBrightness(props.device.ip, brightness.value);
    toast.success(`Brightness set to ${brightness.value}%`, 2000);
  } catch (err) {
    toast.error(`Failed to set brightness: ${err.message}`);
  } finally {
    brightnessLoading.value = false;
  }
}

async function handleReset() {
  // Use Vue confirm dialog instead of browser confirm (UI-512)
  const confirmed = await confirmDialog.value?.show({
    title: 'Reset Device',
    message: `This will restart the device (${props.device.ip}) and reconnect it to WiFi. The Pixoo will briefly show the initialization screen during the restart process.`,
    confirmText: 'Reset Device',
    cancelText: 'Cancel',
    confirmColor: 'warning',
    icon: 'mdi-restart-alert',
    iconColor: 'warning'
  });

  if (!confirmed) return;

  resetLoading.value = true;
  try {
    // Switch to empty scene first for visual feedback
    await api.switchScene(props.device.ip, 'empty', { clear: true });
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
    
    // Perform the reset
    await api.resetDevice(props.device.ip);
    
    // Wait a bit, then switch to startup scene
    await new Promise(resolve => setTimeout(resolve, 2000));
    await api.switchScene(props.device.ip, 'startup', { clear: true });
    
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

  // Use Vue confirm dialog instead of browser confirm (UI-512)
  const confirmed = await confirmDialog.value?.show({
    title: 'Switch Driver',
    message: `Switch device ${props.device.ip} to ${newDriver} driver?`,
    confirmText: `Switch to ${newDriver}`,
    cancelText: 'Cancel',
    confirmColor: 'primary',
    icon: 'mdi-swap-horizontal',
    iconColor: 'primary'
  });

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

onMounted(async () => {
  // Initialize daemon start time from system status
  try {
    const systemStatus = await api.getSystemStatus();
    if (systemStatus.startTime) {
      daemonStartTime.value = new Date(systemStatus.startTime).getTime();
    } else {
      daemonStartTime.value = Date.now() - (systemStatus.uptime || 0) * 1000;
    }
    updateUptime();
  } catch (error) {
    console.error('Failed to load system status for uptime:', error);
  }

  // Start uptime counter (updates every second)
  uptimeInterval = setInterval(updateUptime, 1000);
  
  // Start scene time counter (updates every second)
  sceneTimeInterval = setInterval(updateSceneTime, 1000);
  updateSceneTime(); // Initial call

  // ECharts initializes automatically via v-chart component - no manual init needed!

  // Load metrics - initial call
  console.log('[DEBUG] onMounted - Initial loadMetrics call');
  loadMetrics();
  
  // Poll every 200ms (5 times per second) for faster chart updates
  console.log('[DEBUG] Starting metrics polling at 200ms intervals');
  metricsInterval = setInterval(() => {
    console.log('[DEBUG] Interval tick - calling loadMetrics');
    loadMetrics();
  }, 200);
  console.log('[DEBUG] Metrics interval started:', metricsInterval);
});

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  if (uptimeInterval) {
    clearInterval(uptimeInterval);
  }
  if (sceneTimeInterval) {
    clearInterval(sceneTimeInterval);
  }
  
  // ECharts cleans up automatically via v-chart component!
});
</script>

<style scoped>
.device-card {
  border-radius: 16px !important;
  border: 1px solid #e5e7eb;
  min-width: 800px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.control-item {
  display: flex;
  align-items: center;
}

.brightness-slider-compact {
  display: flex;
  align-items: center;
}

.scene-selector-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

/* Cassette Player Controls - inspired by classic Sony Walkman */
.cassette-player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border-radius: 12px;
  border: 1px solid #d1d5db;
  margin-bottom: 16px;
}

.cassette-btn {
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.cassette-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.cassette-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

/* Pressed state styling */
.cassette-btn.v-btn--variant-tonal {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(1px);
}

.scene-description-card {
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-radius: 12px;
  border: 1px solid #e9d5ff;
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
  border-radius: 16px;
  height: 160px;
  position: relative;
  overflow: hidden;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.metric-card-performance {
  background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
}

.metric-card-uptime {
  background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%);
  border: 1px solid #a7f3d0;
}

.metric-card-scene {
  background: linear-gradient(135deg, #ffffff 0%, #ede9fe 100%);
  border: 1px solid #ddd6fe;
}

.metric-card-frames {
  background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%);
  border: 1px solid #fef3c7;
  color: #78350f;
}

.metric-card-chart {
  background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%);
  border: 1px solid #fef3c7;
  color: #78350f;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.metric-icon-wrapper {
  position: absolute;
  top: 16px;
  right: 16px;
  opacity: 0.2;
}

.metric-icon {
  font-size: 40px !important;
}

.metric-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 2px;
}

.metric-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
  margin-bottom: 2px;
}

.metric-sublabel {
  font-size: 10px;
  opacity: 0.7;
}

/* Status badges - consistent sizing and styling */
.status-badge {
  height: 24px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
}

.status-badge :deep(.v-chip__prepend) {
  margin-right: 4px !important;
}

/* Action buttons with hover effects */
.action-button {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.2s ease !important;
}

.action-button:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  transform: translateY(-1px);
}

.action-button:active {
  transform: translateY(0);
}

/* Scene tags - square tags with hole (like real tags) */
.scene-tag {
  position: relative;
  display: inline-block;
  padding: 2px 8px 2px 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: var(--tag-color, #6b7280);
  color: white;
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}

.scene-tag::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

/* Metrics Grid - Force 3 columns that NEVER stack */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  /* No media query - cards stay horizontal at all window sizes */
}
</style>
