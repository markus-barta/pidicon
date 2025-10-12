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
                {{ device.driver === 'real' ? 'Hardware' : 'Simulated' }}
              </span>
            </span>
          </v-chip>
        </div>
        <div class="d-flex align-center">
          <!-- IP and Last Seen -->
          <div class="d-flex align-center text-caption mr-4" style="color: #6b7280;">
            <v-icon size="small" class="mr-1">mdi-ip-network</v-icon>
            <span>{{ device.ip }}</span>
            <span v-if="lastSeen !== 'N/A'" class="ml-3">
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" style="cursor: help;">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ lastSeen }}
                  </span>
                </template>
                <span>{{ lastSeenTooltip }}</span>
              </v-tooltip>
            </span>
          </div>
          
          <v-btn
            :icon="isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
            variant="text"
            size="small"
            @click="isCollapsed = !isCollapsed"
          ></v-btn>
        </div>
      </div>
    </v-card-title>

    <v-card-subtitle class="pt-0 pb-2">
      <div v-if="false" class="d-flex align-center text-medium-emphasis">
        <!-- Moved to header -->
      </div>
      <!-- Show scene info when collapsed -->
      <div v-if="isCollapsed && selectedScene" class="d-flex align-center mt-2">
        <span class="text-body-2 mr-2">{{ formatSceneName(selectedScene) }}</span>
        <v-chip
          :color="combinedStateColor"
          size="x-small"
          variant="flat"
          :title="combinedStateHint"
        >
          <v-icon start size="x-small">{{ combinedStateIcon }}</v-icon>
          {{ combinedStateLabel }}
        </v-chip>
      </div>
    </v-card-subtitle>

    <v-card-text v-if="!isCollapsed" class="pt-0">
      <!-- Power / Simulated Mode / Reset / Brightness Controls -->
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
          <span class="text-body-2 font-weight-medium mr-3">Simulated</span>
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
          variant="tonal"
          size="small"
          prepend-icon="mdi-restart"
          :loading="resetLoading"
          @click="handleReset"
          class="action-button-danger"
        >
          <span style="color: #dc2626; font-weight: 600;">Device</span>
          <v-tooltip activator="parent" location="bottom">
            Restart hardware device (briefly shows init screen)
          </v-tooltip>
        </v-btn>

        <div class="control-item ml-4">
          <span 
            class="text-body-2 font-weight-medium" 
            style="cursor: pointer; user-select: none;"
            @click="toggleLogging"
          >
            <v-icon size="small" class="mr-1">{{ loggingEnabled ? 'mdi-console' : 'mdi-console-line' }}</v-icon>
            Logging
          </span>
          <v-tooltip activator="parent" location="bottom">
            {{ loggingEnabled ? 'Click to disable debug logging' : 'Click to enable debug logging' }}
          </v-tooltip>
        </div>

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
        <h4 
          class="text-subtitle-1 font-weight-bold mb-3 scene-control-title"
          @click="showDevScenes = !showDevScenes"
        >
          <span>Scene Control</span>
          <v-icon 
            size="small" 
            :color="showDevScenes ? 'warning' : 'grey'"
            class="ml-2"
          >
            {{ showDevScenes ? 'mdi-code-braces' : 'mdi-code-braces-box' }}
          </v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ showDevScenes ? 'Click to hide dev scenes' : 'Click to show dev scenes' }}
          </v-tooltip>
        </h4>
        
        <!-- Scene Selector with inline controls -->
        <div class="scene-control-row">
          <div style="flex: 1;">
            <scene-selector
              v-model="selectedScene"
              :disabled="loading"
              :loading="loading"
              :show-dev-scenes="showDevScenes"
              @change="handleSceneChange"
            />
          </div>

          <div class="scene-controls-inline">
            <!-- Info button to toggle scene details -->
            <v-btn
              :variant="showSceneDetails ? 'tonal' : 'text'"
              :color="showSceneDetails ? 'primary' : 'grey'"
              size="small"
              @click="showSceneDetails = !showSceneDetails"
              :disabled="!currentSceneInfo"
              class="info-btn"
              :class="{ 'info-btn-pressed': showSceneDetails }"
              icon
            >
              <v-icon>mdi-information-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">
                {{ showSceneDetails ? 'Hide' : 'Show' }} scene details
              </v-tooltip>
            </v-btn>

            <div class="control-spacer-large"></div>

            <v-btn
              :variant="isPressed('restart') ? 'tonal' : 'outlined'"
              :color="isPressed('restart') ? 'grey-darken-2' : 'grey'"
              size="small"
              @click="handleRestart"
              :disabled="loading"
              class="control-btn"
              icon
            >
              <v-icon>mdi-restart</v-icon>
              <v-tooltip activator="parent" location="bottom">
                Restart current scene from beginning
              </v-tooltip>
            </v-btn>

            <div class="control-spacer"></div>

            <v-btn
              :variant="isPressed('play') ? 'tonal' : 'outlined'"
              :color="isPressed('play') ? 'success' : 'grey'"
              size="small"
              @click="handlePlay"
              :disabled="loading"
              class="control-btn"
              icon
            >
              <v-icon>mdi-play</v-icon>
              <v-tooltip activator="parent" location="bottom">
                {{ playState === 'paused' ? 'Resume animation' : playState === 'stopped' ? 'Start playing scene' : 'Already playing' }}
              </v-tooltip>
            </v-btn>

            <v-btn
              :variant="isPressed('pause') ? 'tonal' : 'outlined'"
              :color="isPressed('pause') ? 'warning' : 'grey'"
              size="small"
              @click="handlePause"
              :disabled="loading || !currentSceneInfo?.wantsLoop"
              class="control-btn"
              icon
            >
              <v-icon>mdi-pause</v-icon>
              <v-tooltip activator="parent" location="bottom">
                {{ playState === 'paused' ? 'Resume animation' : 'Pause animation (static scenes cannot pause)' }}
              </v-tooltip>
            </v-btn>

            <v-btn
              :variant="isPressed('stop') ? 'tonal' : 'outlined'"
              :color="isPressed('stop') ? 'error' : 'grey'"
              size="small"
              @click="handleStop"
              :disabled="loading"
              class="control-btn"
              icon
            >
              <v-icon>mdi-stop</v-icon>
              <v-tooltip activator="parent" location="bottom">
                Stop scene and clear Pixoo display
              </v-tooltip>
            </v-btn>

            <div class="control-spacer"></div>

            <v-btn
              :variant="isPressed('prior') ? 'tonal' : 'outlined'"
              :color="isPressed('prior') ? 'grey-darken-2' : 'grey'"
              size="small"
              @click="handlePrior"
              :disabled="loading"
              class="control-btn"
              icon
            >
              <v-icon>mdi-skip-previous</v-icon>
              <v-tooltip activator="parent" location="bottom">
                Play previous scene in list
              </v-tooltip>
            </v-btn>

            <v-btn
              :variant="isPressed('next') ? 'tonal' : 'outlined'"
              :color="isPressed('next') ? 'grey-darken-2' : 'grey'"
              size="small"
              @click="handleNext"
              :disabled="loading"
              class="control-btn"
              icon
            >
              <v-icon>mdi-skip-next</v-icon>
              <v-tooltip activator="parent" location="bottom">
                Play next scene in list
              </v-tooltip>
            </v-btn>

            <div class="control-spacer"></div>

            <!-- Perf button to toggle performance metrics -->
            <v-btn
              :variant="showPerfMetrics ? 'tonal' : 'text'"
              :color="showPerfMetrics ? 'primary' : 'grey'"
              size="small"
              @click="showPerfMetrics = !showPerfMetrics"
              class="info-btn"
              :class="{ 'info-btn-pressed': showPerfMetrics }"
              icon
            >
              <v-icon>mdi-chart-box-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">
                {{ showPerfMetrics ? 'Hide' : 'Show' }} performance metrics
              </v-tooltip>
            </v-btn>
          </div>
        </div>

        <!-- Scene Description Card (Collapsible) -->
        <div v-if="currentSceneInfo && showSceneDetails" class="scene-description-card pa-4 mt-3">
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
                  <!-- Combined State Badge -->
                  <v-chip
                    :color="combinedStateColor"
                    size="small"
                    variant="flat"
                    :title="combinedStateHint"
                  >
                    <v-icon start size="x-small">{{ combinedStateIcon }}</v-icon>
                    {{ combinedStateLabel }}
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
              
              <!-- Show full file path -->
              <div v-if="currentSceneInfo.filePath" class="text-caption mb-2" style="color: #9ca3af;">
                <v-icon size="x-small" class="mr-1">mdi-file-code-outline</v-icon>
                {{ currentSceneInfo.filePath }}
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
      <div v-if="showPerfMetrics" class="metrics-section">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">
          Performance Metrics
        </h4>
        <div class="metrics-grid">
          <!-- Current Metrics Card (FPS + Frametime + High/Low) -->
          <v-card class="metric-card metric-card-performance" elevation="0" style="border-left: 4px solid #3b82f6;">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="metric-header" style="color: #3b82f6;">Current Metrics</div>
                <v-icon size="large" style="opacity: 0.2; color: #3b82f6;">mdi-speedometer</v-icon>
              </div>
              <div class="metric-value mb-1" style="color: #1e293b;">{{ fpsDisplay }} FPS</div>
              <div class="text-caption" style="color: #64748b;">
                {{ frametime }}ms frametime
              </div>
              <div v-if="highLowFrametimes.high > 0" class="text-caption" style="color: #94a3b8; font-size: 10px;">
                {{ highLowFrametimes.high }}ms / {{ highLowFrametimes.low }}ms (high/low)
              </div>
            </v-card-text>
          </v-card>

          <!-- Scene Metrics Card -->
          <v-card class="metric-card metric-card-fps" elevation="0" style="border-left: 4px solid #10b981;">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="metric-header" style="color: #10b981;">Scene Metrics</div>
                <v-icon size="large" style="opacity: 0.2; color: #10b981;">mdi-chart-line</v-icon>
              </div>
              <div class="metric-value mb-1" style="color: #1e293b;">{{ avgFpsDisplay }}</div>
              <div class="text-caption" style="color: #64748b;">
                {{ frameCount.toLocaleString() }} frames sent
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
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { useDeviceStore } from '../store/devices';
import { useSceneStore } from '../store/scenes';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';

// Register ECharts components
use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);
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
const loggingEnabled = ref(props.device.driver === 'real'); // Real devices: logging ON, Mock devices: logging OFF
const isCollapsed = ref(props.device.driver === 'mock'); // Collapse mock devices by default
const confirmDialog = ref(null); // Ref to ConfirmDialog component
const showSceneDetails = ref(false); // Hide scene details by default
const showPerfMetrics = ref(false); // Hide performance metrics by default
const showDevScenes = ref(false); // Hide dev scenes by default

// Metrics
const fps = ref(0);
const frametime = ref(0);
const frameCount = ref(0);
const errorCount = ref(0);
const pushCount = ref(0);
const startTime = ref(Date.now());
const frametimeHistory = ref([]);
const lastFrameCount = ref(0); // Track last frame count for chart optimization (UI-513)
const sceneStartTime = ref(Date.now());
const sceneTimeDisplay = ref('0s');
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
  // Only show last seen for real devices with actual hardware ACK timestamp
  if (props.device.driver !== 'real') {
    return 'N/A';
  }
  
  // Use lastSeenTs which is set ONLY when real hardware responds
  const lastSeenTs = props.device?.metrics?.lastSeenTs;
  if (!lastSeenTs) {
    return 'Never'; // Real device but no ACK yet
  }
  
  // Show relative time from last hardware ACK
  const now = Date.now();
  const diff = now - lastSeenTs;
  if (diff < 1000) {
    return 'Just now';
  } else if (diff < 60000) {
    const seconds = Math.floor(diff / 1000);
    return `${seconds}s ago`;
  } else {
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
  }
});

const lastSeenTooltip = computed(() => {
  const lastSeenTs = props.device?.metrics?.lastSeenTs;
  if (!lastSeenTs) {
    return 'Device has not responded yet';
  }
  
  // Format as local time: "October 11, 2025 at 5:23:45 PM"
  const date = new Date(lastSeenTs);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
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

// Track all frametimes for proper average calculation
const allFrametimes = ref([]);

const highLowFrametimes = computed(() => {
  const data = frametimeHistory.value;
  if (data.length === 0) {
    return { high: 0, low: 0 };
  }
  return {
    high: Math.max(...data),
    low: Math.min(...data)
  };
});

const avgFpsDisplay = computed(() => {
  // Check if scene is static (non-looping)
  if (!currentSceneInfo.value?.wantsLoop) {
    return 'static';
  }
  
  if (allFrametimes.value.length === 0) {
    return '-';
  }
  
  // Calculate average from all recorded frametimes
  const totalFrametime = allFrametimes.value.reduce((sum, ft) => sum + ft, 0);
  const avgFrametime = totalFrametime / allFrametimes.value.length;
  const avgFps = avgFrametime > 0 ? 1000 / avgFrametime : 0;
  
  return `Ø ${avgFps.toFixed(1)} FPS`;
});

// Uptime display moved to SystemStatus component

function updateSceneTime() {
  // Check play state first
  const currentPlayState = playState.value;
  
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
  
  // If stopped, show "Stopped"
  if (currentPlayState === 'stopped') {
    sceneTimeDisplay.value = 'Stopped';
    return;
  }
  
  // If paused, keep showing current time but don't update
  if (currentPlayState === 'paused') {
    // Time display stays frozen at current value
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
  const currentPlayState = playState.value;
  const sceneState = props.device?.sceneState;
  
  if (sceneState?.testCompleted) {
    return 'Complete';
  }
  if (currentPlayState === 'stopped') {
    return 'Stopped';
  }
  if (currentPlayState === 'paused') {
    return 'Paused';
  }
  if (sceneState?.isRunning === false) {
    return 'Stopped';
  }
  return currentSceneInfo.value?.wantsLoop ? 'Running' : 'Static';
});

// Old scene state display removed - now using combined state badge

const successRate = computed(() => {
  const total = pushCount.value + errorCount.value;
  if (total === 0) return 100;
  return Math.round((pushCount.value / total) * 100);
});

// Cassette player button states
const playState = computed(() => props.device?.playState || 'stopped');

// Combined state badge (replaces separate play-state and scene-state badges)
const combinedStateLabel = computed(() => {
  const state = playState.value;
  const sceneState = props.device?.sceneState;
  const isAnimated = currentSceneInfo.value?.wantsLoop;
  
  // Completed state takes priority
  if (sceneState?.testCompleted) return 'Complete';
  
  // Static scenes show "Displayed" when stopped (since they're shown)
  if (!isAnimated && state === 'stopped') return 'Displayed';
  
  // Otherwise use play state
  if (state === 'playing') return isAnimated ? 'Playing' : 'Displayed';
  if (state === 'paused') return 'Paused';
  if (state === 'stopped') return 'Stopped';
  
  return 'Unknown';
});

const combinedStateColor = computed(() => {
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted) return 'success';
  
  const state = playState.value;
  const colors = {
    playing: 'success',
    paused: 'warning',
    stopped: 'grey',
  };
  return colors[state] || 'grey';
});

const combinedStateIcon = computed(() => {
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted) return 'mdi-check-circle';
  
  const state = playState.value;
  const isAnimated = currentSceneInfo.value?.wantsLoop;
  
  const icons = {
    playing: isAnimated ? 'mdi-play' : 'mdi-image',
    paused: 'mdi-pause',
    stopped: 'mdi-stop',
  };
  return icons[state] || 'mdi-help-circle';
});

const combinedStateHint = computed(() => {
  const sceneState = props.device?.sceneState;
  const isAnimated = currentSceneInfo.value?.wantsLoop;
  
  if (sceneState?.testCompleted) {
    return 'Scene has finished rendering all frames';
  }
  
  const state = playState.value;
  
  if (state === 'playing') {
    return isAnimated ? 'Scene is actively animating' : 'Static scene displayed';
  }
  if (state === 'paused') {
    return 'Animation paused - press Play to resume';
  }
  if (state === 'stopped') {
    return isAnimated ? 'Animation stopped - display cleared' : 'Static scene displayed';
  }
  
  return '';
});

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
  
  // Create array of objects with value and itemStyle for each bar
  const barData = data.map(frametime => ({
    value: frametime,
    itemStyle: {
      color: getFrametimeColor(frametime)
    }
  }));
  
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
        data: barData,
        type: 'bar',
        barWidth: '80%',
        barGap: '10%'
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
    // Reset scene timer and metrics when scene changes
    if (newScene !== oldScene) {
      sceneStartTime.value = Date.now();
      frameCount.value = 0; // Reset frame counter for avg FPS calculation
      allFrametimes.value = []; // Reset frametime history for avg FPS
      
      // Always restart scene time interval on scene change
      if (sceneTimeInterval) {
        clearInterval(sceneTimeInterval);
      }
      sceneTimeInterval = setInterval(updateSceneTime, 1000);
      updateSceneTime(); // Immediate update
      
      // Metrics update via WebSocket - no polling needed
      console.log('[DEBUG] Scene changed - metrics will update via WebSocket');
    }
  },
);

// Watch device metrics for changes (when parent refreshes)
watch(
  () => props.device.metrics,
  (newMetrics) => {
    console.log('[DEBUG] Device metrics changed:', newMetrics);
    if (newMetrics && !isCollapsed.value && playState.value === 'playing') {
      loadMetrics();
    }
  },
  { deep: true }
);

// Watch playState changes to restart/pause metrics polling and scene time
watch(
  () => playState.value,
  (newState, oldState) => {
    console.log(`[DEBUG] Play state changed: ${oldState} -> ${newState}`);
    
    if (newState === 'playing') {
      // Restart scene time interval if stopped
      if (!sceneTimeInterval) {
        console.log('[DEBUG] Restarting scene time interval');
        sceneStartTime.value = Date.now(); // Reset start time
        sceneTimeInterval = setInterval(updateSceneTime, 1000);
        updateSceneTime(); // Immediate update
      }
      
      // Resume metrics updates (WebSocket will trigger them)
      console.log('[DEBUG] Resumed - metrics will update via WebSocket');
      loadMetrics(); // Immediate update
    } else if (newState === 'stopped') {
      // On stop, update display but keep interval running (will show "Stopped")
      updateSceneTime();
    } else if (newState === 'paused') {
      // On pause, just update display (interval keeps running, but updateSceneTime freezes the value)
      updateSceneTime();
    }
  }
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
  
  // Check play state - stop metrics if paused or stopped
  const currentPlayState = playState.value;
  if (currentPlayState === 'paused' || currentPlayState === 'stopped') {
    console.log(`[DEBUG] Play state is ${currentPlayState} - pausing metrics updates`);
    return; // Don't stop the interval, just skip updates
  }
  
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
  
  // Track all frametimes for average calculation (only when frames are sent)
  if (rawFrametime > 0) {
    allFrametimes.value.push(rawFrametime);
    // Keep last 1000 frametimes to avoid memory issues
    if (allFrametimes.value.length > 1000) {
      allFrametimes.value.shift();
    }
  }
  
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
    // Resume paused scene (just unpause, don't restart)
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
    // After stop, always restart the scene (like restart button) to reset state
    const currentScene = props.device.currentScene || selectedScene.value;
    if (currentScene) {
      loading.value = true;
      try {
        await api.switchScene(props.device.ip, currentScene, { clear: true });
        toast.success(`Playing ${formatSceneName(currentScene)}`, 2000);
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
      // Always switch to the new scene (this will automatically start playing)
      await api.switchScene(props.device.ip, prevScene, { clear: true });
      selectedScene.value = prevScene;
      toast.success(`Playing ${formatSceneName(prevScene)}`, 2000);
      emit('refresh');
    } catch (err) {
      toast.error(`Failed to switch scene: ${err.message}`);
      selectedScene.value = props.device.currentScene; // Revert on error
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
      // Always switch to the new scene (this will automatically start playing)
      await api.switchScene(props.device.ip, nextScene, { clear: true });
      selectedScene.value = nextScene;
      toast.success(`Playing ${formatSceneName(nextScene)}`, 2000);
      emit('refresh');
    } catch (err) {
      toast.error(`Failed to switch scene: ${err.message}`);
      selectedScene.value = props.device.currentScene; // Revert on error
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

async function toggleLogging() {
  loggingEnabled.value = !loggingEnabled.value;
  try {
    await api.setDeviceLogging(props.device.ip, loggingEnabled.value);
    toast.success(
      loggingEnabled.value 
        ? 'Debug logging enabled' 
        : 'Debug logging disabled',
      2000
    );
  } catch (err) {
    // Revert on error
    loggingEnabled.value = !loggingEnabled.value;
    toast.error(`Failed to toggle logging: ${err.message}`);
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
  // Start scene time counter (updates every second)
  sceneTimeInterval = setInterval(updateSceneTime, 1000);
  updateSceneTime(); // Initial call

  // ECharts initializes automatically via v-chart component - no manual init needed!

  // Load metrics - initial call
  console.log('[DEBUG] onMounted - Initial loadMetrics call');
  loadMetrics();
  
  // NO POLLING! WebSocket updates trigger the watch on props.device.metrics
  // which calls loadMetrics() automatically when new data arrives
  console.log('[DEBUG] Metrics will update via WebSocket events (no polling)');
});

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
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

/* Scene control row - selector + inline controls */
.scene-control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.scene-controls-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.control-btn {
  transition: all 0.15s ease !important;
  min-width: 36px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
}

.control-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16) !important;
}

.control-btn:active {
  transform: translateY(0);
}

/* Pressed state styling - inset shadow */
.control-btn.v-btn--variant-tonal {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(1px);
}

.control-btn.v-btn--variant-tonal:hover {
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.control-spacer {
  width: 8px;
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

.scene-control-title {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
}

.scene-control-title:hover {
  color: rgb(var(--v-theme-primary));
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

.metric-card-fps {
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

/* Info button - special styling */
.info-btn {
  /* When not pressed: no frame, no shadow */
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.info-btn-pressed {
  /* When pressed: has frame and shadow */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}
</style>
