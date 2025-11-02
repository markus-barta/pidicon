<template>
  <v-card 
    elevation="1" 
    class="device-card" 
    :class="{ 'device-card--simulated': device.driver === 'mock' }"
    data-test="device-card" 
    :data-device-ip="device.ip"
  >
    <!-- Device Header -->
    <v-card-title class="pb-2">
      <div class="device-header-container">
        <div class="device-header-row">
          <!-- Hardware Icon + Device Type Icon + Name -->
          <h3 class="text-h5 font-weight-bold device-name">
            <v-icon :icon="deviceTypeIcon" size="small" class="mr-2"></v-icon>
            {{ deviceName }}
          </h3>
          
          <!-- Badges -->
          <div class="device-badges" v-show="isCollapsed">
            <v-chip
              :color="playStateChipColor"
              size="small"
              variant="flat"
              class="status-badge scene-state-chip"
            >
              <span style="display: inline-flex; align-items: center;">
                <v-icon 
                  :color="playStateIconColorForBadge"
                  size="x-small"
                  style="margin-right: 6px;"
                >
                  {{ playStateIcon }}
                </v-icon>
                <span class="scene-label" :style="{ color: playStateTextColor }">
                  {{ selectedScene ? formatSceneName(selectedScene) : 'No Scene' }}
                </span>
              </span>
            </v-chip>
          </div>

          <!-- Info items (stay in line when space available) -->
          <div class="device-info-items">
            <!-- Combined Status: Responsive indicator + Last Seen -->
            <div class="header-info-item">
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" class="info-content">
                    <span 
                      v-if="device.driver === 'real'"
                      class="device-responsive-dot"
                      :class="{ 'device-responsive-dot--heartbeat': deviceResponsiveColor === '#10b981' }"
                      :style="{ backgroundColor: deviceResponsiveColor }"
                      :key="device.metrics?.lastSeenTs"
                    ></span>
                    <v-icon 
                      v-else
                      size="small"
                      class="mr-1"
                      color="deep-purple-darken-1"
                    >
                      mdi-robot
                    </v-icon>
                    <span>{{ device.driver === 'real' ? lastSeen : 'Mock Mode' }}</span>
                  </span>
                </template>
                <span v-if="device.driver === 'real'">{{ deviceResponsiveLabel }} • {{ lastSeenTooltip }}</span>
                <span v-else>Simulated device - no real hardware connection</span>
              </v-tooltip>
            </div>

            <!-- IP -->
            <div class="header-info-item">
              <v-icon size="small" class="mr-1">mdi-ip-network</v-icon>
              <span>{{ device.ip }}</span>
            </div>

            <!-- Battery (Awtrix only) -->
            <div v-if="device.deviceType === 'awtrix' && batteryLevel !== null" class="header-info-item">
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" class="info-content">
                    <v-icon size="small" class="mr-1" :color="batteryColor">{{ batteryIcon }}</v-icon>
                    {{ batteryLevel }}%
                  </span>
                </template>
                <span>Battery: {{ batteryLevel }}%</span>
              </v-tooltip>
            </div>
          </div>
          
          <!-- Always top right: collapse button -->
          <v-btn
            :icon="isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
            variant="text"
            size="small"
            @click="isCollapsed = !isCollapsed"
            class="collapse-btn"
          ></v-btn>
        </div>
      </div>
    </v-card-title>

    <v-card-subtitle class="pt-0 pb-2">
      <!-- Scene info moved to badge in header -->
    </v-card-subtitle>

    <v-card-text v-if="!isCollapsed" class="pt-0">
      <!-- Power / Simulated Mode / Reset / Brightness Controls -->
      <div class="controls-row mb-6">
        <!-- Power Buttons (ON/OFF) -->
        <div class="button-group">
          <v-btn
            :variant="displayOn ? 'tonal' : 'outlined'"
            :color="displayOn ? 'success' : 'grey'"
            size="small"
            @click="() => { if (!displayOn) { displayOn = true; toggleDisplay(); } }"
            class="control-btn-compact"
          >
            <v-icon size="small" class="mr-1">mdi-power-on</v-icon>
            <span class="text-caption">ON</span>
            <v-tooltip activator="parent" location="bottom">
              Power display on
            </v-tooltip>
          </v-btn>

          <v-btn
            :variant="!displayOn ? 'tonal' : 'outlined'"
            :color="!displayOn ? 'error' : 'grey'"
            size="small"
            @click="() => { if (displayOn) { displayOn = false; toggleDisplay(); } }"
            class="control-btn-compact"
          >
            <v-icon size="small" class="mr-1">mdi-power-off</v-icon>
            <span class="text-caption">OFF</span>
            <v-tooltip activator="parent" location="bottom">
              Power display off
            </v-tooltip>
          </v-btn>
        </div>

        <!-- Mock Mode Toggle Button -->
        <v-btn
          :variant="device.driver === 'mock' ? 'tonal' : 'outlined'"
          :color="device.driver === 'mock' ? 'deep-purple-darken-1' : 'grey'"
          size="small"
          @click="toggleDriver(device.driver === 'mock' ? 'real' : 'mock')"
          class="control-btn-compact"
          data-test="device-driver-mock"
        >
          <v-icon size="small" class="mr-1">mdi-robot</v-icon>
          <span class="text-caption">{{ device.driver === 'mock' ? 'Exit Mock' : 'Mock Mode' }}</span>
          <v-tooltip activator="parent" location="bottom">
            {{ device.driver === 'mock' ? 'Switch to real hardware device' : 'Switch to simulated mock device' }}
          </v-tooltip>
        </v-btn>

        <!-- Device Reset/Reboot Button -->
        <v-btn
          size="small"
          variant="outlined"
          class="control-btn-compact critical-action"
          :color="device.deviceType === 'awtrix' ? 'error' : 'error'
          "
          @click="handleReset"
          :loading="resetLoading"
        >
          <v-icon
            size="small"
            :color="device.deviceType === 'awtrix' ? 'error' : 'error'"
            class="mr-1"
          >
            {{ device.deviceType === 'awtrix' ? 'mdi-power' : 'mdi-restart' }}
          </v-icon>
          <span class="text-caption">
            {{ device.deviceType === 'awtrix' ? 'Reboot' : 'Reset' }}
          </span>
          <v-tooltip activator="parent" location="bottom">
            {{ device.deviceType === 'awtrix' ? 'Reboot AWTRIX device' : 'Reset device display' }}
          </v-tooltip>
        </v-btn>

        <div class="control-divider"></div>

        <!-- Logging Level Controls -->
        <div class="control-item">
          <span class="text-caption font-weight-medium mr-2 logging-label-full" style="color: #6b7280;">
            Logging
          </span>
          <span class="text-caption font-weight-medium mr-2 logging-label-compact" style="color: #6b7280;">
            Log
          </span>
          
          <!-- Full mode: 3 tiny toggle buttons -->
          <div class="logging-buttons logging-buttons-full">
            <v-btn
              :variant="loggingLevel === 'debug' ? 'tonal' : 'outlined'"
              :color="loggingLevel === 'debug' ? 'primary' : 'grey'"
              size="x-small"
              @click="setLogging('debug')"
              class="logging-btn"
              :class="{ 'logging-btn-pressed': loggingLevel === 'debug' }"
              icon
              density="compact"
            >
              <v-icon size="small">mdi-text-box-multiple-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">
                All logs (debug, info, warnings, errors)
              </v-tooltip>
            </v-btn>

            <v-btn
              :variant="loggingLevel === 'warning' ? 'tonal' : 'outlined'"
              :color="loggingLevel === 'warning' ? 'warning' : 'grey'"
              size="x-small"
              @click="setLogging('warning')"
              class="logging-btn"
              :class="{ 'logging-btn-pressed': loggingLevel === 'warning' }"
              icon
              density="compact"
            >
              <v-icon size="small">mdi-alert-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">
                Errors and warnings only
              </v-tooltip>
            </v-btn>

            <v-btn
              :variant="loggingLevel === 'silent' ? 'tonal' : 'outlined'"
              :color="loggingLevel === 'silent' ? 'grey-darken-2' : 'grey'"
              size="x-small"
              @click="setLogging('silent')"
              class="logging-btn"
              :class="{ 'logging-btn-pressed': loggingLevel === 'silent' }"
              icon
              density="compact"
            >
              <v-icon size="small">mdi-cancel</v-icon>
              <v-tooltip activator="parent" location="bottom">
                No logs (silent mode)
              </v-tooltip>
            </v-btn>
          </div>

          <!-- Compact mode: selected button + next button -->
          <div class="logging-buttons logging-buttons-compact">
            <v-btn
              :variant="'tonal'"
              :color="currentLoggingColor"
              size="x-small"
              @click="cycleLogging"
              class="logging-btn logging-btn-pressed"
              icon
              density="compact"
            >
              <v-icon size="small">{{ currentLoggingIcon }}</v-icon>
              <v-tooltip activator="parent" location="bottom">
                {{ getLoggingTooltip }}
              </v-tooltip>
            </v-btn>
            
            <v-btn
              variant="outlined"
              color="grey"
              size="x-small"
              @click="cycleLogging"
              class="logging-btn"
              icon
              density="compact"
            >
              <v-icon size="small">mdi-chevron-right</v-icon>
              <v-tooltip activator="parent" location="bottom">
                Cycle to next logging level
              </v-tooltip>
            </v-btn>
          </div>
        </div>

        <v-spacer></v-spacer>

        <!-- Brightness Slider (right-aligned, compact) -->
        <div class="brightness-control">
          <v-icon 
            size="small" 
            class="mr-2 brightness-icon brightness-icon-clickable"
            :style="{ opacity: brightnessIconOpacity }"
            @click="cycleBrightnessPresets"
          >
            mdi-brightness-6
            <v-tooltip activator="parent" location="bottom">
              Click to cycle presets: 0%, 1%, 25%, 50%, 75%, 100%
            </v-tooltip>
          </v-icon>
          <v-slider
            v-model="brightness"
            :min="0"
            :max="100"
            :step="1"
            color="grey-darken-1"
            hide-details
            :loading="brightnessLoading"
            data-test="brightness-slider"
            @end="setBrightness"
            style="width: 100px"
          ></v-slider>
          <span class="text-caption ml-2" style="min-width: 35px">
            {{ brightness }}%
          </span>
        </div>
      </div>

      <!-- Scene Control -->
      <div class="scene-control-section mb-4">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">
          Scene Control
        </h4>

        <!-- Scene Incompatibility Error -->
        <v-alert
          v-if="sceneError"
          type="error"
          variant="tonal"
          closable
          @click:close="clearSceneError"
          class="mb-3"
        >
          <div class="text-subtitle-2 font-weight-bold">{{ sceneError.message }}</div>
          <div class="text-caption">{{ sceneError.detail }}</div>
        </v-alert>
        
        <!-- Scene Selector with inline controls -->
        <div class="scene-control-row">
          <div style="flex: 1;">
            <scene-selector
              v-model="selectedScene"
              :disabled="loading"
              :loading="loading"
              :show-dev-scenes="showDevScenes"
              :device-type="device.deviceType"
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
              <div v-if="highLowFrametimes.high > 0" class="text-caption d-flex align-center" style="color: #94a3b8; font-size: 10px; gap: 4px;">
                <v-icon size="x-small" color="#ef4444">mdi-arrow-up</v-icon>
                <span>{{ highLowFrametimes.high }}ms</span>
                <v-icon size="x-small" color="#10b981">mdi-arrow-down</v-icon>
                <span>{{ highLowFrametimes.low }}ms</span>
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
import { usePreferences } from '../composables/usePreferences';

// Register ECharts components
use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);
import SceneSelector from './SceneSelector.vue';
import SceneMetadataViewer from './SceneMetadataViewer.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { getSimplePerformanceColor } from '@/lib/performance-utils';

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  showDevScenes: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['refresh']);

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const api = useApi();
const toast = useToast();
const prefs = usePreferences();

const selectedScene = ref(props.device.currentScene || '');
const loading = ref(false);
const toggleLoading = ref(false);
const resetLoading = ref(false);
const driverLoading = ref(false);
const brightnessLoading = ref(false);
// Local state - initialized from backend, then synced via watchers
const displayOn = ref(props.device.hardware?.displayOn !== false);
const brightness = ref(props.device.hardware?.brightness ?? 75);
const previousBrightness = ref(props.device.hardware?.brightness ?? 75);
// Initialize logging level from backend, fallback to 'warning' for real devices, 'silent' for mock
const loggingLevel = ref(
  props.device.hardware?.loggingLevel ?? 
  (props.device.driver === 'real' ? 'warning' : 'silent')
);
const confirmDialog = ref(null);

// Device card preferences - persisted via usePreferences
const defaultCollapsed = props.device.driver === 'mock';
const isCollapsed = computed({
  get: () => prefs.getDeviceCardPref(props.device.ip, 'collapsed', defaultCollapsed),
  set: (value) => prefs.setDeviceCardPref(props.device.ip, 'collapsed', value),
});

const showSceneDetails = computed({
  get: () => prefs.getDeviceCardPref(props.device.ip, 'showDetails', false),
  set: (value) => prefs.setDeviceCardPref(props.device.ip, 'showDetails', value),
});

const showPerfMetrics = computed({
  get: () => prefs.getDeviceCardPref(props.device.ip, 'showMetrics', false),
  set: (value) => prefs.setDeviceCardPref(props.device.ip, 'showMetrics', value),
});

// Sync with backend hardware state (run immediately and on changes)
watch(
  () => props.device.hardware,
  (newHardware) => {
    if (newHardware) {
      if (newHardware.displayOn !== undefined && displayOn.value !== newHardware.displayOn) {
        console.log(`[${props.device.ip}] Syncing displayOn: ${displayOn.value} → ${newHardware.displayOn}`);
        displayOn.value = newHardware.displayOn;
        console.log(`[${props.device.ip}] After sync, displayOn.value =`, displayOn.value);
      }
      if (newHardware.brightness !== undefined && brightness.value !== newHardware.brightness) {
        console.log(`[${props.device.ip}] Syncing brightness: ${brightness.value} → ${newHardware.brightness}`);
        brightness.value = newHardware.brightness;
      }
      if (newHardware.loggingLevel !== undefined && loggingLevel.value !== newHardware.loggingLevel) {
        console.log(`[${props.device.ip}] Syncing loggingLevel: ${loggingLevel.value} → ${newHardware.loggingLevel}`);
        loggingLevel.value = newHardware.loggingLevel;
      }
    }
  },
  { deep: true, immediate: true }
);

// Debug: log displayOn whenever it changes  
watch(displayOn, (newVal, oldVal) => {
  console.log(`[${props.device.ip}] displayOn changed: ${oldVal} → ${newVal}`);
});

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

// Real FPS calculation tracking
const fpsFrameCount = ref(0); // Frames counted for FPS
const fpsLastTime = ref(Date.now()); // Last FPS calculation time

let metricsInterval = null;

// Computed
const deviceName = computed(() => {
  // Use configured device name from backend, fallback to IP-based name
  if (props.device.name) {
    return props.device.name;
  }
  // Legacy hardcoded names (can be removed later)
  if (props.device.ip.includes('150')) return 'Office Display';
  if (props.device.ip.includes('151')) return 'Conference Room';
  return `Device ${props.device.ip.split('.').pop()}`;
});

const deviceTypeIcon = computed(() => {
  const type = props.device.deviceType;
  switch (type) {
    case 'pixoo64':
      return 'mdi-television';
    case 'awtrix':
      return 'mdi-clock-digital';
    default:
      return 'mdi-devices';
  }
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
  if (diff < 5000) {
    return 'Just now'; // Extended to 5s as requested
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

// Device responsiveness indicator (all real devices)
const deviceResponsiveColor = computed(() => {
  if (props.device.driver !== 'real') {
    return '#4c1d95';
  }
  
  const lastSeenTs = props.device?.metrics?.lastSeenTs;
  if (!lastSeenTs) {
    return '#ef4444'; // red - never seen
  }
  
  const now = Date.now();
  const diff = now - lastSeenTs;
  
  // Debounced: If >6 seconds since last seen, device is unresponsive (1s debounce)
  if (diff > 6000) {
    return '#ef4444'; // red
  }
  
  return '#10b981'; // green - responsive
});

const deviceResponsiveLabel = computed(() => {
  if (props.device.driver !== 'real') {
    return 'Mock device';
  }
  
  const lastSeenTs = props.device?.metrics?.lastSeenTs;
  if (!lastSeenTs) {
    return 'Unresponsive';
  }
  
  const now = Date.now();
  const diff = now - lastSeenTs;
  
  // Debounced: If >6 seconds since last seen, device is unresponsive (1s debounce)
  if (diff > 6000) {
    return 'Unresponsive';
  }
  
  return 'Responsive';
});

// Battery indicator (Awtrix only)
const batteryLevel = computed(() => {
  if (props.device.deviceType !== 'awtrix' || !props.device.hardware) {
    return null;
  }
  return props.device.hardware.batteryLevel || null;
});

const batteryColor = computed(() => {
  const level = batteryLevel.value;
  if (level === null) return undefined;
  if (level > 50) return 'success';
  if (level > 20) return 'warning';
  return 'error';
});

const batteryIcon = computed(() => {
  const level = batteryLevel.value;
  if (level === null) return 'mdi-battery-unknown';
  if (level > 90) return 'mdi-battery';
  if (level > 70) return 'mdi-battery-80';
  if (level > 50) return 'mdi-battery-60';
  if (level > 30) return 'mdi-battery-40';
  if (level > 10) return 'mdi-battery-20';
  return 'mdi-battery-alert';
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

// Scene error display (incompatible scene detection)
const sceneError = computed(() => {
  return props.device?.sceneState?.sceneError || null;
});

const clearSceneError = () => {
  // Clear the error by switching to a valid scene or stopping
  // For now, just trigger a refresh which will clear stale state
  emit('refresh');
};

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

// Aliases for collapsed view
const playStateIcon = computed(() => combinedStateIcon.value);
const playStateIconColor = computed(() => combinedStateColor.value);

// Badge styling for scene name + play state
const playStateChipColor = computed(() => {
  const sceneState = props.device?.sceneState;
  if (sceneState?.testCompleted) return '#15803d';

  const state = playState.value;
  const colors = {
    playing: '#16a34a',
    paused: '#ca8a04',
    stopped: '#dc2626',
  };
  return colors[state] || '#1e293b';
});

const playStateIconColorForBadge = computed(() => {
  const state = playState.value;
  if (state === 'stopped') return '#fee2e2';
  return '#ffffff';
});

const playStateTextColor = computed(() => {
  const state = playState.value;
  if (state === 'stopped') return '#fee2e2';
  return '#ffffff';
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
      
      // Reset real FPS calculation
      fps.value = 0;
      fpsFrameCount.value = 0;
      fpsLastTime.value = Date.now();
      
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
  
  // Calculate FPS from real frame counting over time
  const rawFrametime = metrics.lastFrametime || 0;
  const newFrametime = Math.round(rawFrametime);
  console.log('[DEBUG] rawFrametime:', rawFrametime, 'rounded:', newFrametime);
  
  frametime.value = newFrametime;
  const newFrameCount = metrics.pushes || 0;
  frameCount.value = newFrameCount;
  errorCount.value = metrics.errors || 0;
  pushCount.value = metrics.pushes || 0;
  
  // Real FPS calculation: count frames over time
  const currentTime = Date.now();
  const newFrames = newFrameCount - fpsFrameCount.value;
  
  if (newFrames > 0) {
    const timeDelta = currentTime - fpsLastTime.value;
    if (timeDelta >= 1000) { // Update FPS every second
      fps.value = Math.round((newFrames / timeDelta) * 1000 * 10) / 10; // 1 decimal
      fpsFrameCount.value = newFrameCount;
      fpsLastTime.value = currentTime;
    }
  }
  
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
  const [r, g, b] = getSimplePerformanceColor(frametime || 0);
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
      // Power OFF: Just set display power and brightness to 0
      // Don't change the selected scene - user wants to keep their selection
      previousBrightness.value = brightness.value;
      brightness.value = 0;
      await api.setDisplayBrightness(props.device.ip, 0);
      await api.setDisplayPower(props.device.ip, false);
      toast.success('Display powered off', 2000);
    } else {
      // Power ON: Restore brightness, power on display, switch to configured startup scene
      brightness.value = previousBrightness.value || 75;
      await api.setDisplayBrightness(props.device.ip, brightness.value);
      await api.setDisplayPower(props.device.ip, true);
      
      // Switch to device's configured startup scene
      const startupScene = props.device.config?.startupScene || 'startup';
      await api.switchScene(props.device.ip, startupScene, { clear: true });
      selectedScene.value = startupScene;
      
      toast.success('Display powered on', 2000);
    }
    
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

async function cycleBrightnessPresets() {
  const presets = [0, 1, 25, 50, 75, 100];
  const currentIndex = presets.findIndex(preset => preset >= brightness.value);
  const nextIndex = currentIndex >= presets.length - 1 ? 0 : currentIndex + 1;
  brightness.value = presets[nextIndex];
  await setBrightness();
}

// Set logging level directly (called by the 5 logging buttons)
async function setLogging(level) {
  if (loggingLevel.value === level) return; // Already at this level

  const oldLevel = loggingLevel.value;
  loggingLevel.value = level;

  try {
    await api.setDeviceLogging(props.device.ip, level);
    const levelDescriptions = {
      debug: 'All logs enabled (debug, info, warning, error)',
      info: 'Info, warnings, and errors',
      warning: 'Warnings and errors only',
      error: 'Errors only',
      silent: 'Logging disabled'
    };
    toast.success(levelDescriptions[level], 2000);
  } catch (err) {
    // Revert on error
    loggingLevel.value = oldLevel;
    toast.error(`Failed to set logging level: ${err.message}`);
  }
}

// Get appropriate icon for logging level
// Logging level display (computed)
const getLoggingIcon = computed(() => {
  const icons = {
    debug: 'mdi-bug',
    info: 'mdi-information-outline',
    warning: 'mdi-alert-outline',
    error: 'mdi-alert-circle',
    silent: 'mdi-cancel'
  };
  return icons[loggingLevel.value] || 'mdi-cancel';
});

const getLoggingLabel = computed(() => {
  const labels = {
    debug: 'Debug',
    info: 'Info',
    warning: 'Warning',
    error: 'Error',
    silent: 'Silent'
  };
  return labels[loggingLevel.value] || 'Silent';
});

const getLoggingTooltip = computed(() => {
  const tooltips = {
    debug: 'Scene logging: All messages (debug, info, warnings, errors)',
    info: 'Scene logging: Info, warnings, and errors',
    warning: 'Scene logging: Errors and warnings only',
    error: 'Scene logging: Errors only',
    silent: 'Scene logging: Disabled (no logs)'
  };
  return tooltips[loggingLevel.value];
});

// Computed properties for compact logging mode
const currentLoggingIcon = computed(() => {
  const icons = {
    debug: 'mdi-text-box-multiple-outline',
    info: 'mdi-information-outline',
    warning: 'mdi-alert-outline',
    error: 'mdi-alert-circle',
    silent: 'mdi-cancel'
  };
  return icons[loggingLevel.value];
});

const currentLoggingColor = computed(() => {
  const colors = {
    debug: 'primary',
    info: 'blue',
    warning: 'warning',
    error: 'error',
    silent: 'grey-darken-2'
  };
  return colors[loggingLevel.value];
});

// Cycle to next logging level (only 3 options visible)
function cycleLogging() {
  const levels = ['silent', 'warning', 'debug'];
  const currentIndex = levels.indexOf(loggingLevel.value);
  const nextIndex = (currentIndex + 1) % levels.length;
  setLogging(levels[nextIndex]);
}

// Brightness icon opacity based on brightness level (20-255 mapped from 0-100%)
const brightnessIconOpacity = computed(() => {
  return (20 + (brightness.value / 100) * 235) / 255;
});

async function handleReset() {
  const isAwtrix = props.device.deviceType === 'awtrix';
  const confirmed = await confirmDialog.value?.show({
    title: isAwtrix ? 'Reboot Device' : 'Reset Device Display',
    message: isAwtrix
      ? 'This will send a reboot command to the AWTRIX device. The display will briefly go dark while it restarts.'
      : 'This will clear the display, reset the device settings, and load the startup scene. Note: This does not perform a hardware restart of the Pixoo device itself.',
    confirmText: isAwtrix ? 'Reboot Device' : 'Reset Display',
    cancelText: 'Cancel',
    confirmColor: 'warning',
    icon: isAwtrix ? 'mdi-power' : 'mdi-restart',
    iconColor: isAwtrix ? 'warning' : 'error',
  });

  if (!confirmed) return;

  resetLoading.value = true;
  try {
    if (isAwtrix) {
      await api.rebootDevice(props.device.ip);
      toast.success('Device reboot triggered', 2000);
    } else {
      await api.switchScene(props.device.ip, 'empty', { clear: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await api.resetDevice(props.device.ip);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await api.switchScene(props.device.ip, 'startup', { clear: true });
      toast.success('Device display reset', 2000);
    }
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to ${isAwtrix ? 'reboot' : 'reset'} device: ${err.message}`);
  } finally {
    resetLoading.value = false;
  }
}

async function toggleDriver(newDriver) {
  // newDriver comes from the button: 'real' or 'mock'
  if (!newDriver || newDriver === props.device.driver) return;

  const driverLabel = newDriver === 'real' ? 'Real Hardware' : 'Mock Mode';
  const driverDescription = newDriver === 'real' 
    ? 'This will connect to the physical hardware device and send real commands.' 
    : 'This will use a simulated mock device for testing without physical hardware.';

  // Use Vue confirm dialog instead of browser confirm (UI-512)
  const confirmed = await confirmDialog.value?.show({
    title: `Switch to ${driverLabel}?`,
    message: `${driverDescription}\n\nDevice: ${props.device.ip}`,
    confirmText: `Switch to ${driverLabel}`,
    cancelText: 'Cancel',
    confirmColor: newDriver === 'real' ? 'primary' : 'deep-purple',
    icon: newDriver === 'real' ? 'mdi-chip' : 'mdi-robot',
    iconColor: newDriver === 'real' ? 'primary' : 'deep-purple'
  });

  if (!confirmed) {
    // Force Vue to re-render the toggle if user cancels
    emit('refresh');
    return;
  }

  driverLoading.value = true;
  try {
    await api.switchDriver(props.device.ip, newDriver);
    toast.success(`Switched to ${driverLabel}`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to switch driver: ${err.message}`);
    emit('refresh');
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

.device-card--simulated {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%) !important;
  opacity: 0.92;
  border: 1px solid #d0d0d0 !important;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* Control group container */
/* Button group for ON/OFF and Real/Mock - same 4px gap as play/pause */
.button-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
}

/* Compact control buttons with icon + caption */
.control-btn-compact {
  min-width: 70px !important;
  height: 28px !important;
  padding: 0 8px !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

.control-btn-compact:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15) !important;
}

.control-btn-compact:active {
  transform: translateY(0);
}

/* Pressed state for compact buttons */
.control-btn-compact.v-btn--variant-tonal {
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15) !important;
}

/* Control divider */
.control-divider {
  width: 1px;
  height: 28px;
  background-color: #e5e7eb;
  margin: 0 12px;
}

/* Brightness control */
.brightness-control {
  display: flex;
  align-items: center;
}

.brightness-icon {
  transition: opacity 0.2s ease;
}

.brightness-icon-clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.brightness-icon-clickable:hover {
  transform: scale(1.15);
  filter: brightness(1.2);
}

.brightness-icon-clickable:active {
  transform: scale(1.05);
}

/* Logging buttons container */
.logging-buttons {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

/* Responsive logging modes */
.logging-buttons-compact {
  display: none; /* Hidden by default */
}

.logging-label-compact {
  display: none; /* Hidden by default */
}

/* Device header responsive layout - Single row with proper wrapping */
.device-header-container {
  width: 100%;
  position: relative; /* For absolute positioning of collapse button */
  padding-right: 48px; /* Make room for collapse button */
}

.device-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  row-gap: 2px; /* Minimal vertical gap when wrapping */
}

.device-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  margin-right: 8px; /* ~20px total spacing before badges (12px gap + 8px margin) */
}

.device-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-badge {
  flex-shrink: 0;
}

.device-info-items {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-left: auto; /* Push to right when space available */
  margin-right: 8px; /* Space before collapse button */
}

.header-info-item {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
}

.info-content {
  display: flex;
  align-items: center;
  cursor: help;
}

.collapse-btn {
  position: absolute !important;
  top: 0;
  right: 0;
  flex-shrink: 0;
  z-index: 10; /* Above everything else */
}

/* Dev toggle button - subtle style */
.dev-toggle-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.dev-toggle-btn:hover {
  opacity: 1;
}

/* Switch to compact logging mode when card is narrow (LATER than before - less space) */
/* Changed from 650px to 675px (+25px more space before collapsing) */
@container (max-width: 675px) {
  .logging-buttons-full {
    display: none !important;
  }
  
  .logging-buttons-compact {
    display: inline-flex !important;
  }
  
  .logging-label-full {
    display: none !important;
  }
  
  .logging-label-compact {
    display: inline !important;
  }
}

/* Fallback for browsers without container queries */
/* Changed from 950px to 975px (+25px more space before collapsing) */
@media (max-width: 975px) {
  .logging-buttons-full {
    display: none !important;
  }
  
  .logging-buttons-compact {
    display: inline-flex !important;
  }
  
  .logging-label-full {
    display: none !important;
  }
  
  .logging-label-compact {
    display: inline !important;
  }
}

/* Tiny logging buttons */
.logging-btn {
  min-width: 28px !important;
  width: 28px !important;
  height: 28px !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

.logging-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15) !important;
}

.logging-btn:active {
  transform: translateY(0);
}

/* Pressed state for logging buttons - inset shadow */
.logging-btn-pressed {
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(1px);
}

.logging-btn-pressed:hover {
  transform: translateY(1px);
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.2) !important;
}


.scene-state-chip {
  background-image: linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(15, 118, 110, 0.12));
  border: none !important;
}

.scene-label {
  font-weight: 600;
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

/* Driver status icon next to device name */
/* Device responsive dot heartbeat animation */
.device-responsive-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  transition: all 0.3s ease;
}

.device-responsive-dot--heartbeat {
  animation: device-heartbeat-pulse 2s ease-in-out infinite;
}

@keyframes device-heartbeat-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2), 0 0 8px 2px rgba(16, 185, 129, 0.3);
  }
}
</style>
