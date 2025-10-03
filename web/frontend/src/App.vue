<template>
  <v-app>
    <v-app-bar color="primary" prominent>
      <v-app-bar-title>
        <v-icon icon="mdi-palette" class="mr-2" />
        Pixoo Control Panel
      </v-app-bar-title>
      <template v-slot:append>
        <v-chip v-if="buildNumber" color="success" size="small" class="mr-2">
          Build #{{ buildNumber }}
        </v-chip>
        <v-chip color="info" size="small">
          <v-icon icon="mdi-circle" size="x-small" class="mr-1 pulse" />
          {{ status }}
        </v-chip>
      </template>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-alert
              v-if="!dataLoaded && !error"
              type="info"
              variant="tonal"
              icon="mdi-loading"
            >
              Loading Pixoo devices...
            </v-alert>

            <v-alert v-if="error" type="error" variant="tonal" closable>
              {{ error }}
            </v-alert>

            <v-card v-if="dataLoaded && deviceStore.devices.length === 0">
              <v-card-title>No Devices Configured</v-card-title>
              <v-card-text>
                Configure devices in your daemon settings to get started.
              </v-card-text>
            </v-card>

            <v-row v-if="dataLoaded">
              <v-col
                v-for="device in deviceStore.devices"
                :key="device.ip"
                cols="12"
                md="6"
                lg="4"
              >
                <v-card>
                  <v-card-title>
                    {{ device.ip }}
                    <v-chip
                      :color="device.driver === 'real' ? 'success' : 'warning'"
                      size="small"
                      class="ml-2"
                    >
                      {{ device.driver }}
                    </v-chip>
                  </v-card-title>
                  <v-card-subtitle>
                    Scene: {{ device.currentScene || 'none' }}
                  </v-card-subtitle>
                  <v-card-text>
                    <div class="text-caption">
                      Status: {{ device.status || 'unknown' }}
                    </div>
                    <div v-if="device.metrics" class="text-caption mt-1">
                      FPS: {{ device.metrics.fps || 0 }} | Frametime:
                      {{ device.metrics.frametime || 0 }}ms
                    </div>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn
                      color="primary"
                      size="small"
                      @click="testScene(device.ip)"
                    >
                      Test
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDeviceStore } from './store/devices';
import { useSceneStore } from './store/scenes';
import { useApi } from './composables/useApi';

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const api = useApi();

const dataLoaded = ref(false);
const error = ref(null);
const status = ref('Running');
const buildNumber = ref(null);

const snackbar = ref({
  show: false,
  text: '',
  color: 'info',
  timeout: 3000,
});

function showSnackbar(text, color = 'info', timeout = 3000) {
  snackbar.value = { show: true, text, color, timeout };
}

async function loadData() {
  try {
    error.value = null;

    // Load system status
    const statusData = await api.getSystemStatus();
    buildNumber.value = statusData.buildNumber;
    status.value = statusData.status || 'Running';

    // Load scenes
    const scenesData = await api.getScenes();
    sceneStore.setScenes(scenesData);

    // Load devices
    const devicesData = await api.getDevices();
    deviceStore.setDevices(devicesData);

    dataLoaded.value = true;
    showSnackbar('Loaded successfully!', 'success');
  } catch (err) {
    error.value = `Failed to load data: ${err.message}`;
    showSnackbar(`Error: ${err.message}`, 'error', 5000);
  }
}

async function testScene(ip) {
  try {
    await api.switchScene(ip, 'empty', { clear: true });
    showSnackbar(`Switched ${ip} to empty scene`, 'success');
    // Reload devices after a short delay
    setTimeout(loadData, 1000);
  } catch (err) {
    showSnackbar(`Failed: ${err.message}`, 'error', 5000);
  }
}

onMounted(() => {
  loadData();
  // Poll for updates every 5 seconds
  setInterval(loadData, 5000);
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

