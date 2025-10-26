<template>
  <div class="scene-manager-container">
    <v-container fluid>
      <!-- Header with Dev Mode Badge -->
      <div class="scene-manager-header mb-6">
        <v-avatar color="primary" size="40" class="mr-3">
          <v-icon color="white" size="24">mdi-palette-advanced</v-icon>
        </v-avatar>
        <div class="flex-grow-1">
          <div class="d-flex align-center gap-2">
            <h1 class="text-h5 text-lg-h4 mb-1">Scene Manager</h1>
            <v-chip v-if="devMode" size="small" color="warning" variant="flat">DEV MODE</v-chip>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Configure default parameters for scenes on a per-device basis
          </p>
        </div>
      </div>

      <!-- Device Selector -->
      <v-card class="mb-4">
        <v-card-text>
          <v-select
            v-model="selectedDeviceIp"
            :items="deviceItems"
            item-title="name"
            item-value="ip"
            label="Select Device"
            prepend-icon="mdi-devices"
            variant="outlined"
            density="comfortable"
            hide-details
            :loading="loadingDevices"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props">
                <template v-slot:prepend>
                  <v-icon>mdi-monitor</v-icon>
                </template>
                <template v-slot:subtitle>
                  {{ item.raw.ip }} - {{ item.raw.deviceType }}
                </template>
              </v-list-item>
            </template>
          </v-select>
        </v-card-text>
      </v-card>

      <!-- Main Content: Master-Detail Layout -->
      <v-card v-if="selectedDeviceIp">
        <v-row no-gutters>
          <!-- Master: Scene List -->
          <v-col cols="12" md="4" class="scene-list-col">
            <div class="scene-list pa-4">
              <!-- Bulk Actions Bar -->
              <div v-if="bulkMode" class="mb-3">
                <v-btn-group density="compact" variant="outlined" class="mr-2">
                  <v-btn size="small" @click="bulkSelectAll">Select All</v-btn>
                  <v-btn size="small" @click="bulkSelectNone">Clear</v-btn>
                </v-btn-group>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      size="small"
                      color="primary"
                      :disabled="selectedSceneNames.length === 0"
                    >
                      Bulk Actions ({{ selectedSceneNames.length }})
                      <v-icon end>mdi-chevron-down</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="bulkReset">
                      <template v-slot:prepend>
                        <v-icon>mdi-restore</v-icon>
                      </template>
                      <v-list-item-title>Reset to Defaults</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="bulkExport">
                      <template v-slot:prepend>
                        <v-icon>mdi-download</v-icon>
                      </template>
                      <v-list-item-title>Export Config</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <!-- Search and Sort -->
              <div class="mb-3 d-flex gap-2">
                <v-text-field
                  v-model="searchQuery"
                  prepend-inner-icon="mdi-magnify"
                  placeholder="Search scenes..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  class="flex-grow-1"
                />
                <v-btn
                  icon
                  size="small"
                  variant="outlined"
                  @click="bulkMode = !bulkMode"
                  :color="bulkMode ? 'primary' : ''"
                >
                  <v-icon>mdi-checkbox-multiple-marked</v-icon>
                </v-btn>
              </div>

              <!-- Sort Selector -->
              <v-select
                v-model="sortBy"
                :items="sortOptions"
                label="Sort by"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-4"
              />

              <v-list density="compact">
                <v-list-item
                  v-for="scene in sortedFilteredScenes"
                  :key="scene.name"
                  :active="selectedScene?.name === scene.name"
                  @click="bulkMode ? toggleSceneSelection(scene.name) : selectScene(scene)"
                  :class="{ 'has-custom-defaults': hasCustomDefaults(scene.name) }"
                >
                  <template v-slot:prepend>
                    <v-checkbox-btn
                      v-if="bulkMode"
                      :model-value="selectedSceneNames.includes(scene.name)"
                      @click.stop="toggleSceneSelection(scene.name)"
                      density="compact"
                      class="mr-2"
                    />
                    <v-icon
                      v-else
                      size="small"
                      :color="scene.wantsLoop ? 'success' : 'info'"
                    >
                      {{ scene.wantsLoop ? 'mdi-play-circle' : 'mdi-image' }}
                    </v-icon>
                  </template>
                  <v-list-item-title>
                    <v-icon
                      v-if="getSceneSortOrder(scene.name) < 100"
                      size="small"
                      color="warning"
                      class="mr-1"
                    >
                      mdi-star
                    </v-icon>
                    {{ getDisplayName(scene) }}
                    <v-chip
                      v-if="hasCustomDefaults(scene.name)"
                      size="x-small"
                      color="primary"
                      variant="flat"
                      class="ml-2"
                    >
                      CUSTOM
                    </v-chip>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ scene.category }}
                    <span v-if="sceneUsage[scene.name]" class="text-caption ml-2">
                      • Used {{ sceneUsage[scene.name].useCount || 0 }}x
                      <span v-if="sceneUsage[scene.name].lastUsed">
                        • {{ formatLastUsed(sceneUsage[scene.name].lastUsed) }}
                      </span>
                    </span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-col>

          <!-- Detail: Parameter Editor -->
          <v-col cols="12" md="8" class="scene-detail-col">
            <v-divider vertical class="d-none d-md-block" />
            <div class="scene-detail pa-4">
              <div v-if="selectedScene">
                <!-- Scene Info -->
                <div class="scene-info mb-4">
                  <h2 class="text-h6 mb-2">{{ getDisplayName(selectedScene) }}</h2>
                  
                  <!-- Custom Name Editor -->
                  <v-text-field
                    v-model="customName"
                    label="Custom Name (optional)"
                    hint="Override the scene name for this device"
                    variant="outlined"
                    density="compact"
                    persistent-hint
                    clearable
                    class="mb-3"
                  />

                  <!-- Description with Markdown -->
                  <div
                    v-if="selectedScene.description"
                    class="scene-description text-body-2 text-medium-emphasis mb-3"
                    v-html="renderMarkdown(selectedScene.description)"
                  />
                  
                  <div class="d-flex gap-2 flex-wrap mb-3">
                    <v-chip size="small" variant="tonal">{{ selectedScene.category }}</v-chip>
                    <v-chip size="small" variant="outlined" color="info">
                      {{ selectedScene.sceneType || 'user' }}
                    </v-chip>
                    <v-chip
                      v-for="tag in selectedScene.tags"
                      :key="tag"
                      size="small"
                      variant="outlined"
                    >
                      {{ tag }}
                    </v-chip>
                  </div>

                  <!-- Scene Metadata -->
                  <div class="text-caption text-medium-emphasis">
                    <span>Author: {{ selectedScene.author || 'Unknown' }}</span>
                    <span class="mx-2">•</span>
                    <span>Version: {{ selectedScene.version || '1.0.0' }}</span>
                    <span v-if="sceneUsage[selectedScene.name]">
                      <span class="mx-2">•</span>
                      <span>Sort Order: {{ getSceneSortOrder(selectedScene.name) }}</span>
                    </span>
                  </div>
                </div>

                <v-divider class="my-4" />

                <!-- Parameter Editor -->
                <div v-if="selectedScene.configSchema">
                  <!-- Universal Settings (Collapsible) -->
                  <v-expansion-panels class="mb-4">
                    <v-expansion-panel>
                      <v-expansion-panel-title>
                        <template v-slot:default="{ expanded }">
                          <div class="d-flex align-center">
                            <v-icon class="mr-2">mdi-cog</v-icon>
                            <span class="text-subtitle-1 font-weight-medium">Universal Settings</span>
                            <v-chip size="x-small" variant="outlined" class="ml-2">
                              Timing & Scheduling
                            </v-chip>
                          </div>
                        </template>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-form>
                          <div v-for="(schema, paramName) in universalSchema" :key="paramName" class="mb-4">
                            <component
                              :is="getInputComponent(schema)"
                              v-bind="getInputProps(paramName, schema, paramValues)"
                              @update:model-value="(val) => updateParam(paramName, val, schema)"
                            />
                          </div>
                        </v-form>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>

                  <!-- Scene Parameters -->
                  <h3 class="text-subtitle-1 mb-4">Scene Parameters</h3>
                  
                  <v-form ref="form">
                    <div v-for="(schema, paramName) in sceneSpecificSchema" :key="paramName" class="mb-4">
                      <component
                        :is="getInputComponent(schema)"
                        v-bind="getInputProps(paramName, schema, paramValues)"
                        @update:model-value="(val) => updateParam(paramName, val, schema)"
                      />
                    </div>
                  </v-form>

                  <!-- Actions -->
                  <div class="d-flex gap-2 mt-6 flex-wrap">
                    <v-btn
                      color="primary"
                      variant="flat"
                      :loading="saving"
                      :disabled="!hasChanges"
                      @click="saveDefaults"
                    >
                      <v-icon class="mr-2">mdi-content-save</v-icon>
                      Save Defaults
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      color="secondary"
                      :loading="testing"
                      @click="testScene"
                    >
                      <v-icon class="mr-2">mdi-play</v-icon>
                      Test Scene
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      :disabled="!hasCustomDefaults(selectedScene.name)"
                      @click="resetDefaults"
                    >
                      <v-icon class="mr-2">mdi-restore</v-icon>
                      Reset to Defaults
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      icon
                      size="small"
                      variant="outlined"
                      @click="toggleFavorite"
                      :color="getSceneSortOrder(selectedScene.name) < 100 ? 'warning' : ''"
                    >
                      <v-icon>
                        {{ getSceneSortOrder(selectedScene.name) < 100 ? 'mdi-star' : 'mdi-star-outline' }}
                      </v-icon>
                    </v-btn>
                  </div>
                </div>

                <!-- No Parameters Message -->
                <div v-else class="text-center pa-8">
                  <v-icon size="64" color="grey-lighten-1">mdi-tune-variant</v-icon>
                  <p class="text-h6 mt-4 text-medium-emphasis">No Configurable Parameters</p>
                  <p class="text-body-2 text-medium-emphasis">
                    This scene does not have any user-configurable parameters.
                  </p>
                </div>
              </div>

              <!-- No Scene Selected -->
              <div v-else class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-arrow-left</v-icon>
                <p class="text-h6 mt-4 text-medium-emphasis">Select a Scene</p>
                <p class="text-body-2 text-medium-emphasis">
                  Choose a scene from the list to configure its default parameters.
                </p>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- No Device Selected -->
      <v-card v-else>
        <v-card-text class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-devices</v-icon>
          <p class="text-h6 mt-4 text-medium-emphasis">Select a Device</p>
          <p class="text-body-2 text-medium-emphasis">
            Choose a device to configure scene parameter defaults.
          </p>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="showSnackbar" :color="snackbarColor">
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="showSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, h } from 'vue';
import { useApi } from '../composables/useApi';
import { marked } from 'marked';
import { VTextField, VTextarea, VSwitch, VSelect } from 'vuetify/components';

const api = useApi();

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// State
const loadingDevices = ref(false);
const devices = ref([]);
const selectedDeviceIp = ref(null);
const scenes = ref([]);
const selectedScene = ref(null);
const searchQuery = ref('');
const sortBy = ref('sortOrder');
const paramValues = ref({});
const paramValuesJson = ref({});
const deviceSceneDefaults = ref({});
const sceneUsage = ref({});
const originalValues = ref({});
const customName = ref('');
const saving = ref(false);
const testing = ref(false);
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('success');
const bulkMode = ref(false);
const selectedSceneNames = ref([]);
const devMode = ref(false);

// Universal Schema Definition
const universalSchema = {
  renderInterval: {
    type: 'number',
    default: 250,
    min: 50,
    max: 5000,
    description: 'Milliseconds between frames (render loop delay)',
  },
  adaptiveTiming: {
    type: 'boolean',
    default: true,
    description: 'Adjust timing based on measured frame duration',
  },
  sceneTimeout: {
    type: 'number',
    default: null,
    min: 1,
    max: 1440,
    description: 'Auto-stop scene after N minutes (null = infinite)',
  },
  scheduleEnabled: {
    type: 'boolean',
    default: false,
    description: 'Enable time-based scheduling for this scene',
  },
  scheduleStartTime: {
    type: 'string',
    default: null,
    description: 'Start time in HH:MM format (24-hour)',
  },
  scheduleEndTime: {
    type: 'string',
    default: null,
    description: 'End time in HH:MM format (24-hour)',
  },
  scheduleWeekdays: {
    type: 'array',
    default: [0, 1, 2, 3, 4, 5, 6],
    description: 'Active weekdays (0=Sunday, 6=Saturday)',
  },
};

// Sort Options
const sortOptions = [
  { title: 'Sort Order', value: 'sortOrder' },
  { title: 'Name', value: 'name' },
  { title: 'Last Used', value: 'lastUsed' },
  { title: 'Use Count', value: 'useCount' },
  { title: 'Category', value: 'category' },
];

// Computed
const deviceItems = computed(() => {
  return devices.value.map((d) => ({
    name: d.name,
    ip: d.ip,
    deviceType: d.deviceType,
  }));
});

const filteredScenes = computed(() => {
  let filtered = scenes.value;

  // Filter hidden scenes unless in dev mode
  if (!devMode.value) {
    filtered = filtered.filter((scene) => !scene.isHidden);
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (scene) =>
        scene.name.toLowerCase().includes(query) ||
        scene.category?.toLowerCase().includes(query) ||
        scene.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const sortedFilteredScenes = computed(() => {
  const sorted = [...filteredScenes.value];

  switch (sortBy.value) {
    case 'sortOrder':
      sorted.sort((a, b) => {
        const orderA = getSceneSortOrder(a.name);
        const orderB = getSceneSortOrder(b.name);
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'lastUsed':
      sorted.sort((a, b) => {
        const aTime = sceneUsage.value[a.name]?.lastUsed || '';
        const bTime = sceneUsage.value[b.name]?.lastUsed || '';
        return bTime.localeCompare(aTime);
      });
      break;
    case 'useCount':
      sorted.sort((a, b) => {
        const aCount = sceneUsage.value[a.name]?.useCount || 0;
        const bCount = sceneUsage.value[b.name]?.useCount || 0;
        return bCount - aCount;
      });
      break;
    case 'category':
      sorted.sort((a, b) => a.category.localeCompare(b.category));
      break;
  }

  return sorted;
});

const sceneSpecificSchema = computed(() => {
  if (!selectedScene.value?.configSchema) return {};
  const specific = {};
  Object.keys(selectedScene.value.configSchema).forEach((key) => {
    if (!universalSchema[key]) {
      specific[key] = selectedScene.value.configSchema[key];
    }
  });
  return specific;
});

const hasChanges = computed(() => {
  return (
    JSON.stringify(paramValues.value) !== JSON.stringify(originalValues.value) ||
    customName.value !== (deviceSceneDefaults.value[selectedScene.value?.name]?.customName || '')
  );
});

// Methods
function getDisplayName(scene) {
  if (!scene) return '';
  const defaults = deviceSceneDefaults.value[scene.name];
  return defaults?.customName || scene.name;
}

function getSceneSortOrder(sceneName) {
  return sceneUsage.value[sceneName]?.sortOrder ?? 1000;
}

function hasCustomDefaults(sceneName) {
  return (
    deviceSceneDefaults.value[sceneName] &&
    Object.keys(deviceSceneDefaults.value[sceneName]).length > 0
  );
}

function formatLastUsed(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function renderMarkdown(text) {
  return marked.parse(text || '');
}

function getInputComponent(schema) {
  switch (schema.type) {
    case 'boolean':
      return VSwitch;
    case 'number':
      return VTextField;
    case 'string':
      return VTextField;
    case 'object':
    case 'array':
      return VTextarea;
    default:
      return VTextField;
  }
}

function getInputProps(paramName, schema, values) {
  const isDefault = values[paramName] === schema.default || values[paramName] === undefined;
  const baseProps = {
    label: formatParamName(paramName),
    hint: schema.description,
    persistentHint: true,
    variant: 'outlined',
    density: 'comfortable',
    modelValue: values[paramName] !== undefined ? values[paramName] : schema.default,
  };

  // Add default value indicator
  if (isDefault && schema.default !== null && schema.default !== undefined) {
    baseProps.hint = `${schema.description} (Default: ${JSON.stringify(schema.default)})`;
    baseProps.class = 'default-value-field';
  }

  // Type-specific props
  if (schema.type === 'number') {
    baseProps.type = 'number';
    baseProps.min = schema.min;
    baseProps.max = schema.max;
  } else if (schema.type === 'boolean') {
    baseProps.inset = true;
    baseProps.color = 'primary';
    baseProps.hideDetails = 'auto';
  } else if (schema.type === 'object' || schema.type === 'array') {
    baseProps.rows = 3;
    baseProps.modelValue =
      values[paramName] !== null && values[paramName] !== undefined
        ? JSON.stringify(values[paramName], null, 2)
        : '';
  }

  return baseProps;
}

function formatParamName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function updateParam(paramName, value, schema) {
  if (schema.type === 'object' || schema.type === 'array') {
    try {
      paramValues.value[paramName] = JSON.parse(value || 'null');
    } catch (error) {
      // Keep old value if JSON is invalid
    }
  } else {
    paramValues.value[paramName] = value;
  }
}

function selectScene(scene) {
  selectedScene.value = scene;
  bulkMode.value = false;
  loadSceneDefaults();
}

function toggleSceneSelection(sceneName) {
  const index = selectedSceneNames.value.indexOf(sceneName);
  if (index > -1) {
    selectedSceneNames.value.splice(index, 1);
  } else {
    selectedSceneNames.value.push(sceneName);
  }
}

function bulkSelectAll() {
  selectedSceneNames.value = sortedFilteredScenes.value.map((s) => s.name);
}

function bulkSelectNone() {
  selectedSceneNames.value = [];
}

async function bulkReset() {
  if (selectedSceneNames.value.length === 0) return;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scenes/bulk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneNames: selectedSceneNames.value,
          action: 'reset',
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    await loadDeviceSceneDefaults();
    showSuccess(`Reset ${selectedSceneNames.value.length} scene(s) to defaults`);
    selectedSceneNames.value = [];
  } catch (error) {
    showError(`Bulk reset failed: ${error.message}`);
  }
}

async function bulkExport() {
  if (selectedSceneNames.value.length === 0) return;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scenes/bulk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneNames: selectedSceneNames.value,
          action: 'export',
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const blob = new Blob([JSON.stringify(data.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene-config-${selectedDeviceIp.value}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showSuccess(`Exported ${selectedSceneNames.value.length} scene(s)`);
  } catch (error) {
    showError(`Bulk export failed: ${error.message}`);
  }
}

async function toggleFavorite() {
  if (!selectedScene.value) return;

  const currentOrder = getSceneSortOrder(selectedScene.value.name);
  const newOrder = currentOrder < 100 ? 1000 : 50;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scenes/${selectedScene.value.name}/sort-order`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newOrder }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    await loadSceneUsage();
    showSuccess(newOrder < 100 ? 'Added to favorites' : 'Removed from favorites');
  } catch (error) {
    showError(`Failed to update favorite: ${error.message}`);
  }
}

async function loadSceneDefaults() {
  if (!selectedDeviceIp.value || !selectedScene.value) return;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scene-defaults/${selectedScene.value.name}`
    );
    const data = await response.json();

    // Initialize param values
    paramValues.value = {};
    paramValuesJson.value = {};

    // Load universal params
    Object.keys(universalSchema).forEach((paramName) => {
      const schema = universalSchema[paramName];
      const deviceDefault = data.defaults?.[paramName];
      paramValues.value[paramName] =
        deviceDefault !== undefined ? deviceDefault : schema.default;
    });

    // Load scene-specific params
    if (selectedScene.value.configSchema) {
      Object.keys(selectedScene.value.configSchema).forEach((paramName) => {
        const schema = selectedScene.value.configSchema[paramName];
        const deviceDefault = data.defaults?.[paramName];
        paramValues.value[paramName] =
          deviceDefault !== undefined ? deviceDefault : schema.default;
      });
    }

    // Load custom name
    customName.value = data.defaults?.customName || '';

    originalValues.value = JSON.parse(JSON.stringify(paramValues.value));
  } catch (error) {
    showError(`Failed to load scene defaults: ${error.message}`);
  }
}

async function saveDefaults() {
  if (!selectedDeviceIp.value || !selectedScene.value) return;

  saving.value = true;
  try {
    // Prepare defaults object
    const defaults = {};
    
    // Include universal params
    Object.keys(universalSchema).forEach((key) => {
      const schema = universalSchema[key];
      const value = paramValues.value[key];
      if (value !== schema.default && value !== undefined && value !== null) {
        defaults[key] = value;
      }
    });

    // Include scene-specific params
    if (selectedScene.value.configSchema) {
      Object.keys(selectedScene.value.configSchema).forEach((key) => {
        const schema = selectedScene.value.configSchema[key];
        const value = paramValues.value[key];
        if (value !== schema.default && value !== undefined && value !== null) {
          defaults[key] = value;
        }
      });
    }

    // Include custom name if set
    if (customName.value) {
      defaults.customName = customName.value;
    }

    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scene-defaults/${selectedScene.value.name}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    originalValues.value = JSON.parse(JSON.stringify(paramValues.value));
    await loadDeviceSceneDefaults();
    showSuccess('Scene defaults saved successfully');
  } catch (error) {
    showError(`Failed to save defaults: ${error.message}`);
  } finally {
    saving.value = false;
  }
}

async function testScene() {
  if (!selectedDeviceIp.value || !selectedScene.value) return;

  testing.value = true;
  try {
    // Gather current form values
    const params = { ...paramValues.value };
    if (customName.value) {
      params.customName = customName.value;
    }

    const response = await fetch(
      `/api/devices/${selectedDeviceIp.value}/scenes/${selectedScene.value.name}/test`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    showSuccess('Testing scene with current parameters');
  } catch (error) {
    showError(`Failed to test scene: ${error.message}`);
  } finally {
    testing.value = false;
  }
}

async function resetDefaults() {
  if (!selectedDeviceIp.value || !selectedScene.value) return;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scene-defaults/${selectedScene.value.name}`,
      { method: 'DELETE' }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    await loadDeviceSceneDefaults();
    await loadSceneDefaults();
    showSuccess('Scene defaults reset to default values');
  } catch (error) {
    showError(`Failed to reset defaults: ${error.message}`);
  }
}

async function loadDevices() {
  loadingDevices.value = true;
  try {
    const response = await api.getDevices();
    devices.value = response.devices || [];
  } catch (error) {
    showError(`Failed to load devices: ${error.message}`);
  } finally {
    loadingDevices.value = false;
  }
}

async function loadScenes() {
  try {
    const response = await fetch('/api/scenes/list-with-schema');
    const data = await response.json();
    scenes.value = data.scenes || [];
  } catch (error) {
    showError(`Failed to load scenes: ${error.message}`);
  }
}

async function loadDeviceSceneDefaults() {
  if (!selectedDeviceIp.value) return;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scene-defaults`
    );
    const data = await response.json();
    deviceSceneDefaults.value = data.sceneDefaults || {};
  } catch (error) {
    showError(`Failed to load device scene defaults: ${error.message}`);
  }
}

async function loadSceneUsage() {
  if (!selectedDeviceIp.value) return;

  try {
    const response = await fetch(
      `/api/config/devices/${selectedDeviceIp.value}/scene-usage`
    );
    const data = await response.json();
    sceneUsage.value = data.sceneUsage || {};
  } catch (error) {
    // Non-fatal, usage stats are optional
    console.warn('Failed to load scene usage:', error.message);
  }
}

function showSuccess(message) {
  snackbarMessage.value = message;
  snackbarColor.value = 'success';
  showSnackbar.value = true;
}

function showError(message) {
  snackbarMessage.value = message;
  snackbarColor.value = 'error';
  showSnackbar.value = true;
}

// Watchers
watch(selectedDeviceIp, async (newIp) => {
  if (newIp) {
    await Promise.all([loadDeviceSceneDefaults(), loadSceneUsage()]);
    if (selectedScene.value) {
      await loadSceneDefaults();
    }
  }
});

// Lifecycle
onMounted(async () => {
  // Check dev mode from environment or state
  devMode.value = import.meta.env.DEV || window.location.search.includes('devMode=true');

  await Promise.all([loadDevices(), loadScenes()]);

  // Auto-select first device if available
  if (devices.value.length > 0) {
    selectedDeviceIp.value = devices.value[0].ip;
  }
});
</script>

<style scoped>
.scene-manager-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.scene-manager-header {
  display: flex;
  align-items: center;
  padding: 16px 0;
}

.scene-list-col {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #fafafa;
}

.scene-detail-col {
  background-color: #ffffff;
}

.scene-list {
  height: 700px;
  overflow-y: auto;
}

.scene-detail {
  min-height: 700px;
  max-height: 700px;
  overflow-y: auto;
}

.has-custom-defaults {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.scene-description :deep(p) {
  margin-bottom: 0.5em;
}

.scene-description :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.scene-description :deep(ul),
.scene-description :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}

.default-value-field :deep(.v-input__details) {
  color: rgba(0, 0, 0, 0.4);
  font-size: 0.7em;
  font-style: italic;
}

@media (max-width: 960px) {
  .scene-list {
    height: 400px;
  }
  .scene-detail {
    min-height: 400px;
    max-height: none;
  }
}
</style>

