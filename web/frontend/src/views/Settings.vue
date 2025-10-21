<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">
          <v-icon class="mr-2">mdi-cog</v-icon>
          Settings
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="devices">
            <v-icon class="mr-2">mdi-devices</v-icon>
            Devices
          </v-tab>
          <v-tab value="global">
            <v-icon class="mr-2">mdi-tune</v-icon>
            Global Settings
          </v-tab>
          <v-tab value="import-export">
            <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
            Import/Export
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="mt-4">
          <!-- Devices Tab -->
          <v-window-item value="devices">
            <DeviceManagement />
          </v-window-item>

          <!-- Global Settings Tab -->
          <v-window-item value="global">
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-tune</v-icon>
                Global Defaults
              </v-card-title>
              <v-card-text>
                <p class="text-body-2 text-medium-emphasis mb-6">
                  These defaults apply to any new device that connects to PIDICON. Existing devices keep their current settings unless updated individually.
                </p>
                <v-form>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="globalSettings.defaultDriver"
                        label="Driver for new devices"
                        :items="driverOptions"
                        variant="outlined"
                        density="compact"
                        data-test="global-default-driver"
                      />
                    </v-col>
                    <v-col cols="12" md="6" class="d-flex align-center">
                      <div class="brightness-control">
                        <v-icon
                          size="small"
                          class="mr-2 brightness-icon"
                          :style="{ opacity: brightnessIconOpacity }"
                        >
                          mdi-brightness-6
                        </v-icon>
                        <v-slider
                          v-model="globalSettings.defaultBrightness"
                          :min="0"
                          :max="100"
                          :step="1"
                          color="grey-darken-1"
                          hide-details
                          class="flex-grow-1"
                          style="max-width: 220px"
                          data-test="global-default-brightness"
                        ></v-slider>
                        <span class="text-caption ml-2" style="min-width: 35px; text-align: right;">
                          {{ globalSettings.defaultBrightness }}%
                        </span>
                      </div>
                    </v-col>
                  </v-row>

                  <v-divider class="my-6" />

                  <h3 class="text-h6 mb-4">
                    <v-icon class="mr-2">mdi-shield-alert</v-icon>
                    Watchdog Defaults
                  </h3>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="globalSettings.watchdog.timeoutMinutes"
                        label="Default Timeout (minutes)"
                        type="number"
                        :min="1"
                        :max="1440"
                        variant="outlined"
                        density="compact"
                        hint="Default watchdog timeout for new devices"
                        persistent-hint
                        data-test="global-watchdog-timeout"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="globalSettings.watchdog.action"
                        label="Default Action"
                        :items="watchdogActionOptions"
                        variant="outlined"
                        density="compact"
                        hint="Default watchdog action for new devices"
                        persistent-hint
                        data-test="global-watchdog-action"
                      />
                    </v-col>
                  </v-row>

                  <v-divider class="my-6" />

                  <h3 class="text-h6 mb-4">
                    <v-icon class="mr-2">mdi-access-point-network</v-icon>
                    MQTT Connectivity
                  </h3>

                  <v-alert type="warning" variant="tonal" class="mb-4">
                    These credentials apply to <strong>all</strong> devices.
                    Per-device overrides will be added later.
                  </v-alert>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="mqttSettings.brokerUrl"
                        label="Broker URL"
                        placeholder="mqtt://miniserver24:1883"
                        variant="outlined"
                        density="compact"
                        :rules="mqttRules.brokerUrl"
                        data-test="mqtt-broker-url"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model="mqttSettings.username"
                        label="Username"
                        variant="outlined"
                        density="compact"
                        data-test="mqtt-username"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model="mqttSettings.password"
                        label="Password"
                        type="password"
                        variant="outlined"
                        density="compact"
                        autocomplete="current-password"
                        data-test="mqtt-password"
                      />
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="mqttSettings.clientId"
                        label="Client ID"
                        variant="outlined"
                        density="compact"
                        hint="Optional custom client identifier"
                        persistent-hint
                        data-test="mqtt-client-id"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="mqttSettings.keepalive"
                        label="Keepalive (seconds)"
                        type="number"
                        :min="0"
                        :max="65535"
                        variant="outlined"
                        density="compact"
                        data-test="mqtt-keepalive"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-switch
                        v-model="mqttSettings.tls"
                        inset
                        label="Use TLS"
                        color="primary"
                        data-test="mqtt-tls-toggle"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12">
                      <v-card
                        variant="tonal"
                        :color="mqttStatusDetails.connected ? 'success' : 'warning'"
                        class="mb-4 mqtt-status-card"
                      >
                        <v-card-title class="text-subtitle-2 d-flex align-center justify-space-between">
                          <span class="d-inline-flex align-center">
                            <span
                              class="mqtt-status-indicator"
                              :class="mqttStatusDetails.connected ? 'online' : 'offline'"
                            ></span>
                            MQTT Connection
                          </span>
                          <span class="text-caption">{{ mqttStatusDetails.connected ? 'Connected' : 'Disconnected' }}</span>
                        </v-card-title>
                        <v-card-text class="text-caption">
                          <div class="status-grid">
                            <div>
                              <span class="label">Broker</span>
                              <span class="value">{{ mqttStatusDetails.brokerUrl || 'Not configured' }}</span>
                            </div>
                            <div>
                              <span class="label">Retry Count</span>
                              <span class="value">{{ mqttStatusDetails.retryCount }}</span>
                            </div>
                            <div>
                              <span class="label">Next Retry</span>
                              <span class="value">{{ formatRetry(mqttStatusDetails.nextRetryInMs) }}</span>
                            </div>
                            <div>
                              <span class="label">Last Error</span>
                              <span class="value">{{ mqttStatusDetails.lastError || 'None' }}</span>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <div class="d-flex align-center flex-wrap" style="gap: 12px;">
                        <v-btn
                          color="primary"
                          variant="flat"
                          :loading="savingSettings"
                          @click="saveSettings"
                          class="save-settings-btn"
                          :class="{ 'has-unsaved': hasUnsavedChanges }"
                          data-test="save-settings"
                          :disabled="!hasUnsavedChanges"
                        >
                          <v-icon class="mr-2">mdi-content-save</v-icon>
                          Save Settings
                        </v-btn>
                        <span v-if="hasUnsavedChanges" class="text-caption text-error">Unsaved changes</span>
                      </div>
                    </v-col>
                  </v-row>
                </v-form>
              </v-card-text>
            </v-card>
          </v-window-item>

          <!-- Import/Export Tab -->
          <v-window-item value="import-export">
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
                Import/Export Configuration
              </v-card-title>
              <v-card-text>
                <v-row>
                  <!-- Export Section -->
                  <v-col cols="12" md="6">
                    <v-card variant="outlined">
                      <v-card-title class="text-h6">
                        <v-icon class="mr-2">mdi-export</v-icon>
                        Export Configuration
                      </v-card-title>
                      <v-card-text>
                        <p class="text-body-2 mb-4">
                          Export your device configuration as a JSON file. This
                          includes all devices, settings, and watchdog
                          configurations.
                        </p>
                        <v-btn
                          color="primary"
                          variant="flat"
                          block
                          @click="exportConfig"
                        >
                          <v-icon class="mr-2">mdi-download</v-icon>
                          Export Config
                        </v-btn>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- Import Section -->
                  <v-col cols="12" md="6">
                    <v-card variant="outlined">
                      <v-card-title class="text-h6">
                        <v-icon class="mr-2">mdi-import</v-icon>
                        Import Configuration
                      </v-card-title>
                      <v-card-text>
                        <p class="text-body-2 mb-4">
                          Import a previously exported configuration file. This
                          will merge with your existing configuration.
                        </p>
                        <v-file-input
                          v-model="importFile"
                          label="Select config file"
                          accept=".json"
                          variant="outlined"
                          density="compact"
                          prepend-icon="mdi-file-upload"
                          class="mb-2"
                        />
                        <v-btn
                          color="primary"
                          variant="flat"
                          block
                          :disabled="!importFile"
                          :loading="importing"
                          @click="importConfig"
                        >
                          <v-icon class="mr-2">mdi-upload</v-icon>
                          Import Config
                        </v-btn>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <v-row class="mt-4">
                  <v-col cols="12">
                    <v-card variant="outlined" color="warning">
                      <v-card-title class="text-h6">
                        <v-icon class="mr-2">mdi-alert</v-icon>
                        Reset to Defaults
                      </v-card-title>
                      <v-card-text>
                        <p class="text-body-2 mb-4">
                          Reset all settings to default values. This will
                          <strong>remove all configured devices</strong>. This
                          action cannot be undone.
                        </p>
                        <v-btn
                          color="error"
                          variant="flat"
                          @click="confirmReset"
                        >
                          <v-icon class="mr-2">mdi-restore</v-icon>
                          Reset to Defaults
                        </v-btn>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>

    <!-- Reset Confirmation Dialog -->
    <v-dialog v-model="showResetDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 text-error">
          Reset to Defaults?
        </v-card-title>
        <v-card-text>
          <p>
            Are you sure you want to reset all settings to defaults? This will:
          </p>
          <ul>
            <li>Delete all configured devices</li>
            <li>Reset global settings to defaults</li>
            <li>Clear watchdog configurations</li>
          </ul>
          <br />
          <strong>This action cannot be undone.</strong>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showResetDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="resetting"
            @click="resetToDefaults"
          >
            Reset
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="showSnackbar" :color="snackbarColor">
      {{ snackbarMessage }}
      <template #actions>
        <v-btn variant="text" @click="showSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, watch, computed, onMounted } from 'vue';
import DeviceManagement from '../components/DeviceManagement.vue';

export default {
  name: 'SettingsView',
  components: {
    DeviceManagement,
  },
  setup() {
    const activeTab = ref('devices');
    const savingSettings = ref(false);
    const importing = ref(false);
    const resetting = ref(false);
    const importFile = ref(null);
    const showResetDialog = ref(false);
    const showSnackbar = ref(false);
    const snackbarMessage = ref('');
    const snackbarColor = ref('success');

    const globalSettings = ref({
      defaultDriver: 'real',
      defaultBrightness: 80,
      mediaPath: '/data/media',
      scenesPath: '/data/scenes',
      watchdog: {
        timeoutMinutes: 240,
        action: 'restart',
        healthCheckIntervalSeconds: 10,
        checkWhenOff: true,
        notifyOnFailure: true,
      },
    });

    const PASSWORD_PLACEHOLDER = '********';
    const mqttSettings = ref({
      brokerUrl: '',
      username: '',
      password: '',
      clientId: '',
      keepalive: 60,
      tls: false,
    });
    const mqttOnline = ref(true);
    const mqttLastError = ref(null);
    const mqttStatusDetails = ref({
      connected: true,
      brokerUrl: '',
      lastError: null,
      retryCount: 0,
      nextRetryInMs: null,
    });
    const originalGlobalSettings = ref(null);
    const originalMqttSettings = ref(null);
    const hasUnsavedChanges = ref(false);

    const mqttRules = ref({
      brokerUrl: [(v) => !!v || 'Broker URL is required'],
      keepalive: [
        (v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0) || 'Keepalive must be >= 0',
      ],
    });

    const loadingMqtt = ref(true);
    const loadingGlobal = ref(true);

    const snackbarSuccess = (message) => {
      snackbarMessage.value = message;
      snackbarColor.value = 'success';
      showSnackbar.value = true;
    };

    const snackbarError = (message) => {
      snackbarMessage.value = message;
      snackbarColor.value = 'error';
      showSnackbar.value = true;
    };

    const formatRetry = (ms) => {
      if (ms === null || ms === undefined) return '—';
      if (ms >= 60000) {
        const mins = Math.round(ms / 60000);
        return `${mins} minute${mins > 1 ? 's' : ''}`;
      }
      if (ms >= 1000) {
        const secs = Math.round(ms / 1000);
        return `${secs}s`;
      }
      return `${ms}ms`;
    };

    const driverOptions = [
      { title: 'Real Hardware', value: 'real' },
      { title: 'Mock (Simulated)', value: 'mock' },
    ];

    const watchdogActionOptions = [
      { title: 'Restart Device', value: 'restart' },
      { title: 'Show Fallback Scene', value: 'fallback-scene' },
      { title: 'Send MQTT Commands', value: 'mqtt-command' },
      { title: 'Notify Only', value: 'notify' },
    ];

    const globalBrightnessIconOpacity = computed(() => {
      return (
        20 + (globalSettings.value.defaultBrightness / 100) * 235
      ) / 255;
    });

    const loadGlobalSettings = async () => {
      loadingGlobal.value = true;
      try {
        const response = await fetch('/api/config/global');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const cfg = data.config || {};
        globalSettings.value = {
          defaultDriver: cfg.defaultDriver || 'real',
          defaultBrightness: cfg.defaultBrightness ?? 80,
          mediaPath: cfg.mediaPath || '/data/media',
          scenesPath: cfg.scenesPath || '/data/scenes',
          watchdog: {
            timeoutMinutes: cfg.watchdog?.timeoutMinutes ?? 240,
            action: cfg.watchdog?.action || 'restart',
            healthCheckIntervalSeconds:
              cfg.watchdog?.healthCheckIntervalSeconds ?? 10,
            checkWhenOff:
              cfg.watchdog?.checkWhenOff === undefined
                ? true
                : !!cfg.watchdog.checkWhenOff,
            notifyOnFailure:
              cfg.watchdog?.notifyOnFailure === undefined
                ? true
                : !!cfg.watchdog.notifyOnFailure,
          },
        };
        originalGlobalSettings.value = JSON.parse(
          JSON.stringify(globalSettings.value),
        );
      } catch (error) {
        snackbarError(`Failed to load global settings: ${error.message}`);
      } finally {
        loadingGlobal.value = false;
      }
    };

    const loadMqttSettings = async () => {
      loadingMqtt.value = true;
      try {
        const response = await fetch('/api/system/mqtt-config');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const config = data.config || {};
        const status = data.status || {};
        mqttSettings.value = {
          brokerUrl: config.brokerUrl || '',
          username: config.username || '',
          password: config.hasPassword ? PASSWORD_PLACEHOLDER : '',
          clientId: config.clientId || '',
          keepalive: config.keepalive ?? 60,
          tls: !!config.tls,
        };
        mqttStatusDetails.value = {
          ...mqttStatusDetails.value,
          ...status,
        };
        mqttOnline.value = status.connected !== false;
        mqttLastError.value = status.lastError || null;
        originalMqttSettings.value = JSON.parse(
          JSON.stringify(mqttSettings.value),
        );
      } catch (error) {
        snackbarError(`Failed to load MQTT settings: ${error.message}`);
      } finally {
        loadingMqtt.value = false;
      }
    };

    const saveSettings = async () => {
      savingSettings.value = true;
      try {
        const globalPayload = {
          defaultDriver: globalSettings.value.defaultDriver,
          defaultBrightness: Number(globalSettings.value.defaultBrightness),
          watchdog: {
            timeoutMinutes: Number(
              globalSettings.value.watchdog.timeoutMinutes,
            ),
            action: globalSettings.value.watchdog.action,
            healthCheckIntervalSeconds: Number(
              globalSettings.value.watchdog.healthCheckIntervalSeconds,
            ),
            checkWhenOff: !!globalSettings.value.watchdog.checkWhenOff,
            notifyOnFailure: !!globalSettings.value.watchdog
              .notifyOnFailure,
          },
          mediaPath: globalSettings.value.mediaPath,
          scenesPath: globalSettings.value.scenesPath,
        };

        const globalResponse = await fetch('/api/config/global', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(globalPayload),
        });
        if (!globalResponse.ok) {
          const result = await globalResponse.json().catch(() => ({}));
          throw new Error(result.error || `HTTP ${globalResponse.status}`);
        }

        const mqttPayload = {
          brokerUrl: mqttSettings.value.brokerUrl,
          username: mqttSettings.value.username,
          clientId: mqttSettings.value.clientId,
          keepalive: Number(mqttSettings.value.keepalive),
          tls: mqttSettings.value.tls,
          password:
            mqttSettings.value.password === PASSWORD_PLACEHOLDER
              ? undefined
              : mqttSettings.value.password,
        };

        const mqttResponse = await fetch('/api/system/mqtt-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mqttPayload),
        });
        if (!mqttResponse.ok) {
          const result = await mqttResponse.json().catch(() => ({}));
          throw new Error(result.error || `HTTP ${mqttResponse.status}`);
        }

        const result = await mqttResponse.json();
        const config = result.config || {};
        const status = result.status || {};
        mqttSettings.value = {
          brokerUrl: config.brokerUrl || '',
          username: config.username || '',
          password: config.hasPassword ? PASSWORD_PLACEHOLDER : '',
          clientId: config.clientId || '',
          keepalive: config.keepalive ?? 60,
          tls: !!config.tls,
        };
        mqttStatusDetails.value = {
          ...mqttStatusDetails.value,
          ...status,
        };
        mqttOnline.value = status.connected !== false;
        mqttLastError.value = status.lastError || null;

        snackbarSuccess(
          mqttOnline.value
            ? 'Settings saved and MQTT connected'
            : 'Settings saved, reconnecting...'
        );
        originalGlobalSettings.value = JSON.parse(
          JSON.stringify(globalSettings.value),
        );
        originalMqttSettings.value = JSON.parse(
          JSON.stringify(mqttSettings.value),
        );
        hasUnsavedChanges.value = false;
      } catch (error) {
        snackbarError(`Failed to save settings: ${error.message}`);
      } finally {
        savingSettings.value = false;
      }
    };

    const significantDifference = (a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) > 0.0001;
      }
      return JSON.stringify(a) !== JSON.stringify(b);
    };

    const watchForChanges = () => {
      const globalChanged = significantDifference(
        globalSettings.value,
        originalGlobalSettings.value,
      );
      const mqttChanged = significantDifference(
        mqttSettings.value,
        originalMqttSettings.value,
      );
      hasUnsavedChanges.value = globalChanged || mqttChanged;
    };

    watch(globalSettings, watchForChanges, { deep: true });
    watch(mqttSettings, watchForChanges, { deep: true });

    onMounted(() => {
      loadGlobalSettings();
      loadMqttSettings();
    });

    const exportConfig = async () => {
      try {
        const devicesResponse = await fetch('/api/config/devices');
        const devicesData = await devicesResponse.json();

        const globalResponse = await fetch('/api/config/global');
        const globalData = await globalResponse.json();

        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          devices: devicesData.devices,
          globalSettings: globalData.config,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pidicon-config-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        snackbarSuccess('Configuration exported successfully');
      } catch (error) {
        snackbarError(`Failed to export config: ${error.message}`);
      }
    };

    const importConfig = async () => {
      if (!importFile.value) return;

      importing.value = true;
      try {
        const fileContent = await importFile.value.text();
        const importData = JSON.parse(fileContent);

        // Validate import data
        if (!importData.devices || !Array.isArray(importData.devices)) {
          throw new Error('Invalid config file format: missing devices array');
        }
        if (!importData.globalSettings) {
          throw new Error('Invalid config file format: missing globalSettings');
        }

        // Import global settings first
        await fetch('/api/config/global', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importData.globalSettings),
        });
        globalSettings.value = importData.globalSettings; // Update UI immediately

        // Clear existing devices before importing new ones
        const existingDevicesResponse = await fetch('/api/config/devices');
        const existingDevicesData = await existingDevicesResponse.json();
        for (const device of existingDevicesData.devices) {
          await fetch(`/api/config/devices/${device.ip}`, {
            method: 'DELETE',
          });
        }

        // Import devices
        for (const device of importData.devices) {
          await fetch('/api/config/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device),
          });
        }

        snackbarSuccess(
          `Successfully imported ${importData.devices.length} device(s) and global settings`,
        );
        // Refresh device list in DeviceManagement component
        activeTab.value = 'devices'; // Switch to devices tab to see imported devices
      } catch (error) {
        snackbarError(`Failed to import config: ${error.message}`);
      } finally {
        importing.value = false;
      }
    };

    const confirmReset = () => {
      showResetDialog.value = true;
    };

    const resetToDefaults = async () => {
      resetting.value = true;
      try {
        // Get all devices
        const response = await fetch('/api/config/devices');
        const data = await response.json();

        // Delete all devices
        for (const device of data.devices) {
          await fetch(`/api/config/devices/${device.ip}`, {
            method: 'DELETE',
          });
        }

        // Reset global settings to defaults
        const resetResponse = await fetch('/api/config/global/reset', {
          method: 'POST',
        });
        const resetJson = await resetResponse.json();
        const defaults = resetJson.config || {};
        globalSettings.value = {
          defaultDriver: defaults.defaultDriver || 'real',
          defaultBrightness: defaults.defaultBrightness ?? 80,
          mediaPath: '/data/media',
          scenesPath: '/data/scenes',
          watchdog: {
            timeoutMinutes: defaults.watchdog?.timeoutMinutes ?? 240,
            action: defaults.watchdog?.action || 'restart',
            healthCheckIntervalSeconds:
              defaults.watchdog?.healthCheckIntervalSeconds ?? 10,
            checkWhenOff:
              defaults.watchdog?.checkWhenOff === undefined
                ? true
                : !!defaults.watchdog.checkWhenOff,
            notifyOnFailure:
              defaults.watchdog?.notifyOnFailure === undefined
                ? true
                : !!defaults.watchdog.notifyOnFailure,
          },
        };

        // Reset MQTT settings to defaults
        await fetch('/api/system/mqtt-config/reset', {
          method: 'POST',
        });
        mqttSettings.value = {
          brokerUrl: '',
          username: '',
          password: '',
          clientId: '',
          keepalive: 60,
          tls: false,
        };

        showResetDialog.value = false;
        snackbarMessage.value = 'Settings reset to defaults';
        snackbarColor.value = 'success';
        showSnackbar.value = true;

        activeTab.value = 'devices';
      } catch (error) {
        snackbarMessage.value = `Failed to reset settings: ${error.message}`;
        snackbarColor.value = 'error';
        showSnackbar.value = true;
      } finally {
        resetting.value = false;
      }
    };

    return {
      activeTab,
      globalSettings,
      driverOptions,
      watchdogActionOptions,
      mqttSettings,
      mqttRules,
      loadingMqtt,
      loadingGlobal,
      savingSettings,
      importing,
      resetting,
      importFile,
      showResetDialog,
      showSnackbar,
      snackbarMessage,
      snackbarColor,
      saveSettings,
      exportConfig,
      importConfig,
      confirmReset,
      mqttOnline,
      mqttLastError,
      mqttStatusDetails,
      formatRetry,
      globalBrightnessIconOpacity,
      hasUnsavedChanges,
    };
  },
};
</script>

