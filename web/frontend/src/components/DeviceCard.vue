<template>
  <v-card :elevation="device.driver === 'mock' ? 1 : 2">
    <v-card-title class="d-flex align-center">
      <v-icon
        :icon="device.driver === 'real' ? 'mdi-monitor' : 'mdi-test-tube'"
        :color="device.driver === 'real' ? 'success' : 'warning'"
        class="mr-2"
      />
      <span>{{ device.ip }}</span>
      <v-spacer />
      <v-chip
        :color="device.driver === 'real' ? 'success' : 'warning'"
        size="small"
        variant="tonal"
      >
        {{ device.driver }}
      </v-chip>
    </v-card-title>

    <v-card-subtitle>
      <div class="d-flex align-center">
        <v-icon icon="mdi-palette-swatch" size="small" class="mr-1" />
        {{ device.currentScene || 'none' }}
        <v-chip
          v-if="device.status"
          :color="statusColor"
          size="x-small"
          variant="tonal"
          class="ml-2"
        >
          {{ device.status }}
        </v-chip>
      </div>
    </v-card-subtitle>

    <v-card-text>
      <!-- Scene Selector -->
      <scene-selector
        v-model="selectedScene"
        :disabled="loading"
        :loading="loading"
        @change="handleSceneChange"
      />

      <!-- FPS Monitor (for animated scenes) -->
      <div v-if="isAnimatedScene" class="mt-3">
        <fps-monitor
          :device-ip="device.ip"
          :animated="isAnimatedScene"
          :interval="2000"
        />
      </div>

      <!-- Device Controls -->
      <div class="device-controls mt-4">
        <v-btn-group divided density="comfortable">
          <v-btn
            :color="displayOn ? 'success' : 'error'"
            :icon="displayOn ? 'mdi-monitor' : 'mdi-monitor-off'"
            :loading="toggleLoading"
            @click="toggleDisplay"
          >
            <v-icon>{{
              displayOn ? 'mdi-monitor' : 'mdi-monitor-off'
            }}</v-icon>
            <v-tooltip activator="parent" location="top">
              {{ displayOn ? 'Turn Off' : 'Turn On' }}
            </v-tooltip>
          </v-btn>

          <v-btn
            icon="mdi-refresh"
            :loading="resetLoading"
            @click="handleReset"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent" location="top">
              Reset Device
            </v-tooltip>
          </v-btn>

          <v-btn
            :color="device.driver === 'real' ? 'success' : 'warning'"
            :icon="
              device.driver === 'real'
                ? 'mdi-monitor'
                : 'mdi-test-tube'
            "
            :loading="driverLoading"
            @click="toggleDriver"
          >
            <v-icon>{{
              device.driver === 'real'
                ? 'mdi-monitor'
                : 'mdi-test-tube'
            }}</v-icon>
            <v-tooltip activator="parent" location="top">
              Switch to {{ device.driver === 'real' ? 'Mock' : 'Real' }}
            </v-tooltip>
          </v-btn>
        </v-btn-group>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDeviceStore } from '../store/devices';
import { useSceneStore } from '../store/scenes';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';
import SceneSelector from './SceneSelector.vue';
import FPSMonitor from './FPSMonitor.vue';

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

// Watch for external changes to device scene
watch(
  () => props.device.currentScene,
  (newScene) => {
    if (newScene && newScene !== selectedScene.value) {
      selectedScene.value = newScene;
    }
  },
);

const statusColor = computed(() => {
  const status = props.device.status;
  if (status === 'running') return 'success';
  if (status === 'switching') return 'warning';
  if (status === 'stopping') return 'error';
  return 'info';
});

const isAnimatedScene = computed(() => {
  const scene = sceneStore.getSceneByName(selectedScene.value);
  return scene?.wantsLoop || false;
});

async function handleSceneChange(sceneName) {
  if (!sceneName || loading.value) return;

  loading.value = true;
  try {
    await api.switchScene(props.device.ip, sceneName, { clear: true });
    toast.success(`Switched to ${sceneName}`, 2000);
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to switch scene: ${err.message}`);
    // Revert selection on error
    selectedScene.value = props.device.currentScene || '';
  } finally {
    loading.value = false;
  }
}

async function toggleDisplay() {
  toggleLoading.value = true;
  try {
    const newState = !displayOn.value;
    await api.setDisplayPower(props.device.ip, newState);
    displayOn.value = newState;
    toast.success(
      `Display turned ${newState ? 'on' : 'off'}`,
      2000,
    );
    emit('refresh');
  } catch (err) {
    toast.error(`Failed to toggle display: ${err.message}`);
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
</script>

<style scoped>
.device-controls {
  display: flex;
  justify-content: center;
}
</style>

