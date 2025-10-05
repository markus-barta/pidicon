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
            {{ device.driver === 'real' ? 'Hardware' : 'Mock Mode' }}
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
          variant="outlined"
          size="small"
          prepend-icon="mdi-restart"
          :loading="resetLoading"
          @click="handleReset"
        >
          Reset
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
            color="primary"
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
        
        <!-- Scene Selector with Next/Prev (single row) -->
        <div class="scene-selector-row">
          <v-btn
            icon
            variant="text"
            @click="previousScene"
            :disabled="loading"
            class="scene-nav-btn"
          >
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>

          <div style="flex: 1;">
            <scene-selector
              v-model="selectedScene"
              :disabled="loading"
              :loading="loading"
              @change="handleSceneChange"
            />
          </div>

          <v-btn
            icon
            variant="text"
            @click="nextScene"
            :disabled="loading"
            class="scene-nav-btn"
          >
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
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
              <div class="d-flex align-center mb-1">
                <span class="text-subtitle-2 font-weight-bold mr-2">
                  {{ formatSceneName(currentSceneInfo.name) }}
                </span>
                <v-chip
                  v-if="currentSceneInfo.category"
                  size="x-small"
                  :color="categoryColor(currentSceneInfo.category)"
                  variant="flat"
                >
                  {{ currentSceneInfo.category }}
                </v-chip>
                <v-chip
                  v-if="currentSceneInfo.wantsLoop"
                  size="x-small"
                  color="success"
                  variant="tonal"
                  class="ml-1"
                >
                  Animated
                </v-chip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ currentSceneInfo.description || 'No description available for this scene.' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="metrics-section">
        <h4 class="text-subtitle-1 font-weight-bold mb-3">
          Performance Metrics
        </h4>
        <v-row dense>
          <!-- Performance Card (FPS + Frametime + Frame Count) -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="metric-card metric-card-performance" elevation="0">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="metric-header">Performance</div>
                  <v-icon size="large" style="opacity: 0.15;">mdi-speedometer</v-icon>
                </div>
                <div class="metric-value mb-1">{{ fpsDisplay }} FPS</div>
                <div class="text-caption" style="color: #6b7280;">
                  {{ frametime }}ms frametime
                </div>
                <div class="text-caption" style="color: #9ca3af;">
                  {{ frameCount.toLocaleString() }} frames sent
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Uptime Card -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="metric-card metric-card-uptime" elevation="0">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="metric-header">Uptime</div>
                  <v-icon size="large" style="opacity: 0.15;">mdi-clock-outline</v-icon>
                </div>
                <div class="metric-value mb-1">{{ uptimeDisplay }}</div>
                <div class="text-caption" style="color: #6b7280;">
                  Since daemon start
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Frametime Chart Card -->
          <v-col cols="12" sm="12" md="4">
            <v-card class="metric-card metric-card-chart" elevation="0">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="metric-header">Frametime History</div>
                  <v-icon size="large" style="opacity: 0.15;">mdi-chart-line</v-icon>
                </div>
                <div style="height: 80px; position: relative;">
                  <canvas ref="chartCanvas"></canvas>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Chart from 'chart.js/auto';
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
const brightnessLoading = ref(false);
const displayOn = ref(true);
const brightness = ref(75);
const isCollapsed = ref(props.device.driver === 'mock'); // Collapse mock devices by default

// Metrics
const fps = ref(0);
const frametime = ref(0);
const frameCount = ref(0);
const errorCount = ref(0);
const pushCount = ref(0);
const startTime = ref(Date.now());
const daemonStartTime = ref(Date.now());
const frametimeHistory = ref([]);
const chartCanvas = ref(null);
const chartInstance = ref(null); // Use ref instead of let for better Vue tracking
const chartReady = ref(false); // Track if chart is ready to use
let uptimeInterval = null;

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
  
  // For animated scenes: ALWAYS show 2 decimal places (e.g., 4.24, 20.00)
  return fps.value.toFixed(2);
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

const currentSceneInfo = computed(() => {
  return sceneStore.getSceneByName(selectedScene.value);
});

const successRate = computed(() => {
  const total = pushCount.value + errorCount.value;
  if (total === 0) return 100;
  return Math.round((pushCount.value / total) * 100);
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

// Watch for card expansion to initialize chart
watch(isCollapsed, async (collapsed) => {
  if (!collapsed && !chartInstance.value) {
    // Wait for DOM to update and canvas to be visible
    await nextTick();
    // Double-check canvas is actually rendered
    setTimeout(() => {
      if (chartCanvas.value && !chartInstance.value) {
        initChart();
      }
    }, 100);
  }
});

// Watch frametime history for changes and update chart
watch(frametimeHistory, (newHistory) => {
  console.log('frametimeHistory changed, length:', newHistory.length);
  if (chartInstance.value && chartReady.value && !isCollapsed.value) {
    updateChart();
  }
}, { deep: true });

function formatSceneName(name) {
  // Convert snake_case to Title Case
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
      fps.value = data.fps || 0;
      frametime.value = Math.round(data.frametime || 0);
      frameCount.value = data.frameCount || 0;
      errorCount.value = data.errorCount || 0;
      pushCount.value = data.pushCount || 0;
      
      // Update frametime history for chart (keep last 300 data points = 30 seconds at 100ms intervals)
      if (frametime.value > 0 && !isCollapsed.value) {
        frametimeHistory.value.push(frametime.value);
        if (frametimeHistory.value.length > 300) {
          frametimeHistory.value.shift();
        }
        try {
          updateChart();
        } catch (chartErr) {
          // Chart errors should never block metrics display
          console.error('Chart update failed:', chartErr);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
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

function updateChart() {
  // Skip if chart not initialized, not ready, or card is collapsed
  if (!chartInstance.value || !chartReady.value || !chartCanvas.value || isCollapsed.value) {
    console.log('Chart update skipped:', { 
      hasInstance: !!chartInstance.value, 
      ready: chartReady.value, 
      hasCanvas: !!chartCanvas.value, 
      collapsed: isCollapsed.value 
    });
    return;
  }
  
  try {
    const data = frametimeHistory.value;
    console.log('Updating chart with data points:', data.length, 'latest:', data[data.length - 1]);
    
    // Completely replace the dataset to force Chart.js to redraw
    chartInstance.value.data.labels = data.map((_, i) => `${i}`);
    chartInstance.value.data.datasets[0].data = data.slice(); // New array reference
    
    // Update colors based on latest frametime
    if (data.length > 0) {
      const latestFrametime = data[data.length - 1];
      const color = getFrametimeColor(latestFrametime);
      console.log(`Frametime ${latestFrametime}ms -> color ${color}`);
      chartInstance.value.data.datasets[0].borderColor = color;
      chartInstance.value.data.datasets[0].backgroundColor = color.replace('rgb', 'rgba').replace(')', ', 0.1)');
    }
    
    // Try multiple update methods to force redraw
    chartInstance.value.update('none'); // Immediate update without animation
    chartInstance.value.render(); // Force render
    
  } catch (error) {
    console.error('Failed to update chart:', error);
    chartReady.value = false; // Mark as not ready if update fails
  }
}

function initChart() {
  // Defensive checks
  if (!chartCanvas.value) {
    console.warn('Chart canvas not available');
    return;
  }
  
  if (isCollapsed.value) {
    console.log('Skipping chart init - card is collapsed');
    return;
  }
  
  // Check if canvas is actually visible in DOM
  if (!chartCanvas.value.offsetParent) {
    console.warn('Chart canvas not visible in DOM');
    return;
  }
  
  try {
    // Destroy existing chart if it exists
    if (chartInstance.value) {
      try {
        chartInstance.value.destroy();
      } catch (destroyError) {
        console.warn('Error destroying old chart:', destroyError);
      }
      chartInstance.value = null;
      chartReady.value = false;
    }
    
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }
    
    chartInstance.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#22c55e', // Start with green
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        animations: {
          colors: false,
          x: false,
          y: false
        },
        transitions: {
          active: {
            animation: {
              duration: 0
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context) => `${context.parsed.y}ms`
            }
          }
        },
        scales: {
          x: { 
            display: true, // Show x-axis for debugging
            grid: { display: false },
            ticks: {
              font: { size: 9 },
              color: '#9ca3af',
              maxTicksLimit: 5
            }
          },
          y: {
            display: true,
            position: 'right',
            beginAtZero: false,
            grid: { 
              display: true,
              color: 'rgba(156, 163, 175, 0.1)'
            },
            ticks: {
              maxTicksLimit: 4,
              callback: (value) => `${Math.round(value)}ms`,
              font: { size: 9 },
              color: '#9ca3af'
            },
            // Auto-scale based on data
            afterDataLimits: (axis) => {
              const minVal = axis.min || 0;
              const maxVal = axis.max || 100;
              const range = maxVal - minVal;
              // Add 10% padding top and bottom
              axis.min = Math.max(0, minVal - range * 0.1);
              axis.max = maxVal + range * 0.1;
            }
          }
        }
      }
    });
    
    chartReady.value = true;
    console.log('Chart initialized successfully');
  } catch (error) {
    console.error('Failed to initialize chart:', error);
    chartInstance.value = null;
    chartReady.value = false;
  }
}

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
  const confirmed = confirm(
    `Reset device ${props.device.ip}? This will briefly show the init screen.`,
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

  // Initialize chart only if card is not collapsed (canvas must be visible)
  if (!isCollapsed.value) {
    await nextTick();
    // Add small delay to ensure canvas is fully rendered in DOM
    setTimeout(() => {
      if (chartCanvas.value && !isCollapsed.value) {
        initChart();
      }
    }, 200);
  }

  // Load metrics every 100ms for smooth chart updates
  loadMetrics();
  metricsInterval = setInterval(() => {
    loadMetrics();
  }, 100);
});

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  if (uptimeInterval) {
    clearInterval(uptimeInterval);
  }
  if (chartInstance.value) {
    try {
      chartInstance.value.destroy();
      chartInstance.value = null;
      chartReady.value = false;
    } catch (error) {
      console.error('Error destroying chart on unmount:', error);
    }
  }
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

.scene-nav-btn {
  margin: 0 !important;
  padding: 0 !important;
  align-self: center;
  /* Vuetify v-select with density="comfortable" has 56px height, buttons should align to center */
  flex-shrink: 0;
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
  background: linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%);
  border: 1px solid #f3e8ff;
  color: #6d28d9;
}

.metric-card-uptime {
  background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%);
  border: 1px solid #d1fae5;
  color: #065f46;
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
</style>
