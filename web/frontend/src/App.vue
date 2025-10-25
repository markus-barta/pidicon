<template>
  <v-app>
    <!-- System Status Header -->
    <system-status
      :active-view="currentView"
      @navigate="handleNavigation"
    />

    <!-- Main Content -->
    <v-main class="bg-grey-lighten-4 main-content">
      <v-container fluid class="main-container">
        <!-- Loading State -->
        <v-alert
          v-if="!dataLoaded && !error"
          type="info"
          variant="tonal"
          prominent
          icon="mdi-loading"
          class="mb-4"
        >
          <v-progress-linear indeterminate class="mb-2" />
          Loading Pixoo devices and scenes...
        </v-alert>

        <!-- Error State -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          prominent
          closable
          class="mb-4"
          @click:close="error = null"
        >
          <strong>Error:</strong> {{ error }}
        </v-alert>

        <!-- Settings View -->
        <settings-view v-if="currentView === 'settings'" />

        <!-- Tests View -->
        <tests-view v-else-if="currentView === 'tests'" />

        <!-- Logs View -->
        <logs-view v-else-if="currentView === 'logs'" />

        <!-- Device View -->
        <template v-else>
          <!-- No Devices State -->
          <v-card v-if="dataLoaded && deviceStore.devices.length === 0">
            <v-card-title class="text-h5">
              <v-icon icon="mdi-alert-circle-outline" class="mr-2" />
              No Devices Configured
            </v-card-title>
            <v-card-text>
              <p class="mb-2">
                No Pixoo devices are currently configured in the daemon.
              </p>
              <p class="text-caption text-medium-emphasis">
                Configure devices in your daemon settings (environment variables
                or config file) to get started.
              </p>
            </v-card-text>
          </v-card>

          <!-- Device Grid -->
          <v-row v-if="dataLoaded && deviceStore.devices.length > 0">
            <v-col
              v-for="device in deviceStore.devices"
              :key="device.ip"
              cols="12"
              md="12"
              lg="12"
              xl="6"
            >
              <device-card
                :device="device"
                :show-dev-scenes="showDevScenes"
                @refresh="loadData"
              />
            </v-col>
          </v-row>
        </template>
      </v-container>
    </v-main>

    <!-- Toast Notifications -->
    <toast-notifications />

    <!-- Footer -->
    <app-footer v-model:show-dev-scenes="showDevScenes" />
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useDeviceStore } from './store/devices';
import { useSceneStore } from './store/scenes';
import { useDevModeStore } from './store/dev-mode';
import { useApi } from './composables/useApi';
import { useToast } from './composables/useToast';
import { useGlobalWebSocket } from './composables/useWebSocket';
import SystemStatus from './components/SystemStatus.vue';
import DeviceCard from './components/DeviceCard.vue';
import ToastNotifications from './components/ToastNotifications.vue';
import AppFooter from './components/AppFooter.vue';
import SettingsView from './views/Settings.vue';
import LogsView from './views/Logs.vue';
import TestsView from './views/Tests.vue';

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const devModeStore = useDevModeStore();
const api = useApi();
const toast = useToast();
const ws = useGlobalWebSocket();

const dataLoaded = ref(false);
const error = ref(null);
const lastSuccessfulLoad = ref(Date.now());
const errorShown = ref(false);
let pollInterval = null;
const currentView = ref('devices'); // 'devices', 'settings', 'logs'
const showDevScenes = ref(
  JSON.parse(localStorage.getItem('pidicon:showDevScenes') || 'false'),
);

const showTestsTab = computed(() => devModeStore.enabled);

watch(showDevScenes, (value) => {
  localStorage.setItem('pidicon:showDevScenes', JSON.stringify(value));
});

const handleNavigation = (view) => {
  currentView.value = view;
};

async function loadData() {
  try {
    // Load scenes first (devices need this)
    const scenesData = await api.getScenes();
    sceneStore.setScenes(scenesData);

    // Load devices
    const devicesData = await api.getDevices();
    deviceStore.setDevices(devicesData);

    // Successful load - update timestamp and clear error state
    lastSuccessfulLoad.value = Date.now();
    
    // Only clear error after 2 consecutive successful loads to avoid flickering
    if (error.value) {
      // Wait a bit to ensure connection is stable
      setTimeout(() => {
        if (Date.now() - lastSuccessfulLoad.value < 1000) {
          error.value = null;
          errorShown.value = false;
        }
      }, 500);
    }

    if (!dataLoaded.value) {
      dataLoaded.value = true;
      toast.success('Pixoo Control Panel loaded!', 3000);
    }
  } catch (err) {
    // Check if we've been down for more than 5 seconds
    const downtime = Date.now() - lastSuccessfulLoad.value;
    
    if (downtime > 5000) {
      // More than 5 seconds - show error
      error.value = `Failed to load data: ${err.message}`;
      
      // Only show error toast once per failure
      if (!errorShown.value && !dataLoaded.value) {
        toast.error(`Failed to load: ${err.message}`);
        errorShown.value = true;
      }
    }
    // Otherwise, silently wait (could be a restart or brief network issue)
  }
}

// Watch WebSocket connection state
watch(() => ws.connected.value, (connected) => {
  if (connected) {
    // WebSocket connected - stop polling
    console.log('[App] WebSocket connected - disabling polling');
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    toast.success('Real-time updates enabled', 2000);
  } else {
    // WebSocket disconnected - start polling as fallback
    console.log('[App] WebSocket disconnected - enabling fallback polling');
    if (!pollInterval) {
      pollInterval = setInterval(loadData, 200);
    }
  }
});

onMounted(() => {
  // Initial load
  loadData();
  
  // Start WebSocket connection
  ws.connect();
  
  // Start polling as fallback (will stop when WebSocket connects)
  pollInterval = setInterval(loadData, 200);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  ws.disconnect();
});
</script>

<style>
/* Global app styles */
.v-main {
  min-height: 100vh;
  padding-top: 122px !important;
}

.main-content {
  min-width: 800px;
}

.main-container {
  padding: 32px;
  max-width: 1920px;
  margin: 0 auto;
}

/* Custom utility classes */
.border-b {
  border-bottom: 1px solid #e5e7eb !important;
}

.bg-grey-lighten-4 {
  background-color: #f9fafb !important;
}

/* Override Vuetify primary color text */
.primary--text {
  color: #8b5cf6 !important;
}

/* Responsive breakpoints */
@media (max-width: 1280px) {
  .main-container {
    padding: 24px;
  }
}

@media (max-width: 800px) {
  .main-container {
    padding: 16px;
  }
}
</style>

