<template>
  <v-app>
    <!-- System Status Header -->
    <system-status />

    <!-- Main Content -->
    <v-main>
      <v-container fluid class="pa-6">
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
              Configure devices in your daemon settings (environment variables or
              config file) to get started.
            </p>
          </v-card-text>
        </v-card>

        <!-- Device Grid -->
        <v-row v-if="dataLoaded && deviceStore.devices.length > 0">
          <v-col
            v-for="device in deviceStore.devices"
            :key="device.ip"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <device-card :device="device" @refresh="loadData" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Toast Notifications -->
    <toast-notifications />
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDeviceStore } from './store/devices';
import { useSceneStore } from './store/scenes';
import { useApi } from './composables/useApi';
import { useToast } from './composables/useToast';
import SystemStatus from './components/SystemStatus.vue';
import DeviceCard from './components/DeviceCard.vue';
import ToastNotifications from './components/ToastNotifications.vue';

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const api = useApi();
const toast = useToast();

const dataLoaded = ref(false);
const error = ref(null);

async function loadData() {
  try {
    error.value = null;

    // Load scenes first (devices need this)
    const scenesData = await api.getScenes();
    sceneStore.setScenes(scenesData);

    // Load devices
    const devicesData = await api.getDevices();
    deviceStore.setDevices(devicesData);

    if (!dataLoaded.value) {
      dataLoaded.value = true;
      toast.success('Pixoo Control Panel loaded!', 3000);
    }
  } catch (err) {
    error.value = `Failed to load data: ${err.message}`;
    if (!dataLoaded.value) {
      toast.error(`Failed to load: ${err.message}`);
    }
  }
}

onMounted(() => {
  loadData();
  // Poll for updates every 5 seconds
  setInterval(loadData, 5000);
});
</script>

<style>
/* Global app styles */
.v-main {
  min-height: 100vh;
}
</style>

