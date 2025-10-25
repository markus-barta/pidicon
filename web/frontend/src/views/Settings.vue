<template>
  <v-container fluid class="settings-view">
        <div class="settings-header">
          <div class="settings-title">
            <v-avatar color="primary" size="40" class="mr-3">
              <v-icon color="white" size="24">mdi-cog</v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h5 text-lg-h4 mb-1">Settings</h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Fine-tune defaults, connectivity, and configuration workflows for PIDICON.
              </p>
            </div>
          </div>

          <div class="settings-status">
            <v-chip
              size="small"
              class="status-chip"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-content-save"
            >
              {{ unsavedSummary }}
            </v-chip>
          </div>
        </div>

        <v-sheet class="settings-shell">
          <v-tabs
          v-model="activeTab"
          color="primary"
          class="settings-tabs"
          slider-color="primary"
        >
          <v-tab
            value="devices"
            :class="{ 'tab-active': activeTab === 'devices' }"
          >
            <v-icon class="mr-2">mdi-view-dashboard</v-icon>
            Devices
          </v-tab>
          <v-tab
            value="global"
            :class="{ 'tab-active': activeTab === 'global' }"
          >
            <v-icon class="mr-2">mdi-tune</v-icon>
            Global Defaults
          </v-tab>
          <v-tab
            value="mqtt"
            :class="{ 'tab-active': activeTab === 'mqtt' }"
          >
            <v-icon class="mr-2">mdi-access-point-network</v-icon>
            MQTT Connectivity
          </v-tab>
          <v-tab
            value="import-export"
            :class="{ 'tab-active': activeTab === 'import-export' }"
          >
            <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
            Import / Export
          </v-tab>
        </v-tabs>

          <v-window v-model="activeTab" class="mt-6">
            <!-- Devices Tab -->
            <v-window-item value="devices">
              <v-card class="tab-card">
                <v-card-text class="pa-4">
                  <DeviceManagement />
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Global Settings Tab -->
            <v-window-item value="global">
              <v-card class="tab-card">
                <v-card-text class="pa-4">
                  <div class="section">
                    <div class="section-header">
                      <v-icon class="mr-3" color="primary">mdi-tune</v-icon>
                      <div>
                        <h2 class="text-h6 mb-1">Global Defaults</h2>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          These defaults apply to any new device that connects to PIDICON. Existing devices keep their current settings unless updated individually.
                        </p>
                      </div>
                    </div>

                    <v-form class="mt-6">
                      <v-row class="ga-6">
                        <v-col cols="12" md="6">
                          <v-select
                            v-model="globalSettings.defaultDriver"
                            label="Driver for new devices"
                            :items="driverOptions"
                            variant="outlined"
                            density="comfortable"
                            data-test="global-default-driver"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <div class="brightness-control">
                            <span class="text-body-2 text-medium-emphasis mr-3">Default brightness</span>
                            <v-icon
                              size="x-small"
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
                              color="primary"
                              hide-details
                              class="flex-grow-1"
                              style="max-width: 240px"
                              data-test="global-default-brightness"
                            />
                            <span class="text-body-2 font-weight-medium ml-3" style="min-width: 40px; text-align: right;">
                              {{ globalSettings.defaultBrightness }}%
                            </span>
                          </div>
                        </v-col>
                      </v-row>

                      <v-divider class="my-6" />

                      <div class="section-subheader">
                        <v-icon class="mr-2" color="primary">mdi-shield-alert</v-icon>
                        <div>
                          <h3 class="text-subtitle-1 mb-1">Watchdog Defaults</h3>
                          <p class="text-body-2 text-medium-emphasis mb-0">
                            Ensure displays recover gracefully when they stop responding.
                          </p>
                        </div>
                      </div>

                      <v-row class="ga-6 mt-2">
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model.number="globalSettings.watchdog.timeoutMinutes"
                            label="Default Timeout (minutes)"
                            type="number"
                            :min="1"
                            :max="1440"
                            variant="outlined"
                            density="comfortable"
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
                            density="comfortable"
                            hint="Default watchdog action for new devices"
                            persistent-hint
                            data-test="global-watchdog-action"
                          />
                        </v-col>
                      </v-row>

                      <v-row class="ga-6 mt-1">
                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model.number="globalSettings.watchdog.healthCheckIntervalSeconds"
                            label="Health Check Interval (seconds)"
                            type="number"
                            :min="5"
                            :max="600"
                            variant="outlined"
                            density="comfortable"
                            hint="How frequently the daemon performs watchdog checks"
                            persistent-hint
                            data-test="global-watchdog-health-interval"
                          />
                        </v-col>
                        <v-col cols="12" md="4">
                          <v-switch
                            v-model="globalSettings.watchdog.checkWhenOff"
                            label="Monitor while device is off"
                            inset
                            color="primary"
                            hide-details
                            class="mt-1"
                            data-test="global-watchdog-check-when-off"
                          />
                        </v-col>
                        <v-col cols="12" md="4">
                          <v-switch
                            v-model="globalSettings.watchdog.notifyOnFailure"
                            label="Notify on failure"
                            inset
                            color="primary"
                            hide-details
                            class="mt-1"
                            data-test="global-watchdog-notify"
                          />
                        </v-col>
                      </v-row>
                    </v-form>
                  </div>

                  <div class="section-actions">
                    <v-btn
                      color="primary"
                      variant="flat"
                      :loading="savingGlobal"
                      :disabled="!hasUnsavedGlobalChanges || savingGlobal"
                      data-test="save-global-settings"
                      @click="saveGlobalSettings"
                    >
                      <v-icon class="mr-2">mdi-content-save</v-icon>
                      Save Global Defaults
                    </v-btn>
                    <span v-if="hasUnsavedGlobalChanges" class="text-caption text-warning">
                      Unsaved global changes
                    </span>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- MQTT Tab -->
            <v-window-item value="mqtt">
              <v-card class="tab-card">
                <v-card-text class="pa-4">
                  <div class="section">
                    <div class="section-header">
                      <v-icon class="mr-3" color="primary">mdi-access-point-network</v-icon>
                      <div>
                        <h2 class="text-h6 mb-1">MQTT Connectivity</h2>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Update broker credentials and understand the live connection status across all devices.
                        </p>
                      </div>
                    </div>

                    <v-alert
                      type="warning"
                      variant="tonal"
                      border="start"
                      color="warning"
                      class="mb-6"
                    >
                      These credentials apply to <strong>all</strong> devices. Per-device overrides will be added later.
                    </v-alert>

                    <v-form>
                      <v-row class="ga-6">
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="mqttSettings.brokerUrl"
                            label="Broker URL"
                            placeholder="mqtt://miniserver24:1883"
                            variant="outlined"
                            density="comfortable"
                            :rules="mqttRules.brokerUrl"
                            data-test="mqtt-broker-url"
                          />
                        </v-col>
                        <v-col cols="12" md="3">
                          <v-text-field
                            v-model="mqttSettings.username"
                            label="Username"
                            variant="outlined"
                            density="comfortable"
                            data-test="mqtt-username"
                          />
                        </v-col>
                        <v-col cols="12" md="3">
                          <v-text-field
                            v-model="mqttSettings.password"
                            label="Password"
                            type="password"
                            variant="outlined"
                            density="comfortable"
                            autocomplete="current-password"
                            data-test="mqtt-password"
                          />
                        </v-col>
                      </v-row>

                      <v-row class="ga-6 mt-1">
                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model="mqttSettings.clientId"
                            label="Client ID"
                            variant="outlined"
                            density="comfortable"
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
                            density="comfortable"
                            data-test="mqtt-keepalive"
                          />
                        </v-col>
                        <v-col cols="12" md="4" class="d-flex align-center">
                          <div class="d-flex flex-column" style="gap: 8px; width: 100%">
                            <v-switch
                              v-model="mqttSettings.tls"
                              inset
                              color="primary"
                              hide-details
                              label="Use TLS"
                              class="mt-0"
                              data-test="mqtt-tls-toggle"
                            />
                            <v-switch
                              v-model="mqttSettings.autoReconnect"
                              inset
                              color="primary"
                              hide-details
                              label="Automatic reconnect"
                              class="mt-0"
                              data-test="mqtt-auto-reconnect"
                            />
                          </div>
                        </v-col>
                      </v-row>
                    </v-form>
                  </div>

                  <v-divider class="my-6" />

                  <div class="section">
                    <div class="section-subheader mb-4">
                      <v-icon class="mr-2" color="primary">mdi-heart-pulse</v-icon>
                      <h3 class="text-subtitle-1 mb-0">Live Connection Status</h3>
                    </div>
                    <div class="status-row">
                      <v-chip
                        :color="mqttStatusDetails.connected ? 'success' : 'warning'"
                        class="mqtt-status-chip"
                        variant="tonal"
                        :prepend-icon="mqttStatusDetails.connected ? 'mdi-lan-connect' : 'mdi-lan-disconnect'"
                      >
                        {{ mqttStatusSummary }}
                        <template v-if="mqttStatusDetails.lastHeartbeatTs">
                          <span class="last-heartbeat" :title="formatTimestamp(mqttStatusDetails.lastHeartbeatTs)">
                            • {{ formatRelative(mqttStatusDetails.lastHeartbeatTs) }}
                          </span>
                        </template>
                      </v-chip>

                      <v-btn
                        color="success"
                        variant="flat"
                        :disabled="mqttStatusDetails.connected || mqttBusy"
                        :loading="mqttBusy && mqttBusyAction === 'connect'"
                        @click="handleMqttConnect"
                      >
                        <v-icon class="mr-2">mdi-power-plug</v-icon>
                        Connect
                      </v-btn>

                      <v-btn
                        :color="mqttSettings.autoReconnect ? 'warning' : 'grey-darken-2'"
                        variant="flat"
                        :disabled="!mqttStatusDetails.connected || mqttBusy"
                        :loading="mqttBusy && mqttBusyAction === 'disconnect'"
                        @click="handleMqttDisconnect"
                      >
                        <v-icon class="mr-2">mdi-power-plug-off</v-icon>
                        {{ mqttSettings.autoReconnect ? 'Disconnect' : 'Stop' }}
                      </v-btn>
                    </div>
                  </div>

                  <div class="section-actions">
                    <v-btn
                      color="primary"
                      variant="flat"
                      :loading="savingMqtt"
                      :disabled="!hasUnsavedMqttChanges || savingMqtt"
                      data-test="save-mqtt-settings"
                      @click="saveMqttSettings"
                    >
                      <v-icon class="mr-2">mdi-content-save</v-icon>
                      Save MQTT Settings
                    </v-btn>
                    <span v-if="hasUnsavedMqttChanges" class="text-caption text-warning">
                      Unsaved MQTT changes
                    </span>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Import/Export Tab -->
            <v-window-item value="import-export">
              <v-card class="tab-card">
                <v-card-text class="pa-4">
                  <div class="section">
                    <div class="section-header">
                      <v-icon class="mr-3" color="primary">mdi-swap-horizontal</v-icon>
                      <div>
                        <h2 class="text-h6 mb-1">Import & Export</h2>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Backup or restore your configuration without interrupting live devices.
                        </p>
                      </div>
                    </div>

                    <v-row class="ga-6 mt-4">
                      <!-- Export Section -->
                      <v-col cols="12" md="6">
                    <v-card class="panel-card" variant="outlined">
                          <v-card-title class="text-h6">
                            <v-icon class="mr-2" color="primary">mdi-export</v-icon>
                            Export Configuration
                          </v-card-title>
                          <v-card-text>
                            <p class="text-body-2 text-medium-emphasis mb-4">
                              Export your device configuration as a JSON file. This includes all devices, settings, and watchdog configurations.
                            </p>
                            <v-btn color="primary" variant="flat" block @click="exportConfig">
                              <v-icon class="mr-2">mdi-download</v-icon>
                              Export Config
                            </v-btn>
                          </v-card-text>
                        </v-card>
                      </v-col>

                      <!-- Import Section -->
                      <v-col cols="12" md="6">
                        <v-card class="panel-card" variant="outlined">
                          <v-card-title class="text-h6">
                            <v-icon class="mr-2" color="primary">mdi-import</v-icon>
                            Import Configuration
                          </v-card-title>
                          <v-card-text>
                            <p class="text-body-2 text-medium-emphasis mb-4">
                              Import a previously exported configuration file. This will merge with your existing configuration.
                            </p>
                            <v-file-input
                              v-model="importFile"
                              label="Select config file"
                              accept=".json"
                              variant="outlined"
                              density="comfortable"
                              prepend-icon="mdi-file-upload"
                              class="mb-3"
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
                  </div>

                  <v-divider class="my-6" />

                  <div class="section danger-zone-section">
                    <div class="section-subheader mb-4">
                      <v-icon class="mr-2" color="error" size="large">mdi-alert-octagon</v-icon>
                      <div>
                        <h3 class="text-h6 font-weight-bold danger-zone-title mb-1">DANGER ZONE</h3>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Remove all configured devices and restore factory defaults.
                        </p>
                      </div>
                    </div>

                    <v-alert
                      type="warning"
                      variant="tonal"
                      border="start"
                      color="warning"
                      icon="mdi-alert-circle"
                      class="reset-alert"
                    >
                      <div class="text-body-2 mb-3">
                        Reset all settings to default values. This will <strong>remove all configured devices</strong>. This action cannot be undone.
                      </div>
                      <v-btn color="error" variant="flat" @click="confirmReset">
                        <v-icon class="mr-2">mdi-restore</v-icon>
                        Reset to Defaults
                      </v-btn>
                    </v-alert>
                  </div>
                </v-card-text>
              </v-card>
          </v-window-item>
          </v-window>
        </v-sheet>

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
import { useApi } from '../composables/useApi';

export default {
  name: 'SettingsView',
  components: {
    DeviceManagement,
  },
  props: {},
  setup(props) {
    const activeTab = ref('devices');
    const api = useApi();

    const savingGlobal = ref(false);
    const savingMqtt = ref(false);
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
      autoReconnect: true,
    });
    const mqttOnline = ref(true);
    const mqttLastError = ref(null);
    const mqttBusy = ref(false);
    const mqttBusyAction = ref(null);
    const mqttStatusDetails = ref({
      connected: true,
      brokerUrl: '',
      lastError: null,
      retryCount: 0,
      nextRetryInMs: null,
    });
    const originalGlobalSettings = ref(null);
    const originalMqttSettings = ref(null);
    const hasUnsavedGlobalChanges = ref(false);
    const hasUnsavedMqttChanges = ref(false);

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
        hasUnsavedGlobalChanges.value = false;
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
          autoReconnect: config.autoReconnect !== false,
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
        hasUnsavedMqttChanges.value = false;
      } catch (error) {
        snackbarError(`Failed to load MQTT settings: ${error.message}`);
      } finally {
        loadingMqtt.value = false;
      }
    };

    const saveGlobalSettings = async () => {
      savingGlobal.value = true;
      try {
        const globalChanged = significantDifference(
          globalSettings.value,
          originalGlobalSettings.value,
        );

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

        if (!globalChanged) {
          snackbarSuccess('No changes to save');
          return;
        }

        const globalResponse = await fetch('/api/config/global', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(globalPayload),
        });
        if (!globalResponse.ok) {
          const result = await globalResponse.json().catch(() => ({}));
          throw new Error(result.error || `HTTP ${globalResponse.status}`);
        }

        snackbarSuccess('Global defaults saved');
        originalGlobalSettings.value = JSON.parse(
          JSON.stringify(globalSettings.value),
        );
        hasUnsavedGlobalChanges.value = false;
      } catch (error) {
        snackbarError(`Failed to save global settings: ${error.message}`);
      } finally {
        savingGlobal.value = false;
      }
    };

    const saveMqttSettings = async () => {
      savingMqtt.value = true;
      try {
        const mqttChanged = significantDifference(
          mqttSettings.value,
          originalMqttSettings.value,
        );

        if (!mqttChanged) {
          snackbarSuccess('No MQTT changes to save');
          return;
        }

        const mqttPayload = {
          brokerUrl: mqttSettings.value.brokerUrl,
          username: mqttSettings.value.username,
          clientId: mqttSettings.value.clientId,
          keepalive: Number(mqttSettings.value.keepalive),
          tls: mqttSettings.value.tls,
          autoReconnect: mqttSettings.value.autoReconnect,
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

        const mqttResult = await mqttResponse.json();
        const config = mqttResult.config || {};
        mqttSettings.value = {
          brokerUrl: config.brokerUrl || '',
          username: config.username || '',
          password: config.hasPassword ? PASSWORD_PLACEHOLDER : '',
          clientId: config.clientId || '',
          keepalive: config.keepalive ?? 60,
          tls: !!config.tls,
          autoReconnect: config.autoReconnect !== false,
        };

        const status = mqttResult.status || {};
        mqttStatusDetails.value = {
          ...mqttStatusDetails.value,
          ...status,
        };
        mqttOnline.value = status.connected !== false;
        mqttLastError.value = status.lastError || null;

        snackbarSuccess(
          status.connected ? 'MQTT settings saved' : 'Saved; daemon will retry connection',
        );
        originalMqttSettings.value = JSON.parse(
          JSON.stringify(mqttSettings.value),
        );
        hasUnsavedMqttChanges.value = false;
      } catch (error) {
        snackbarError(`Failed to save MQTT settings: ${error.message}`);
      } finally {
        savingMqtt.value = false;
      }
    };

    const significantDifference = (a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) > 0.0001;
      }
      return JSON.stringify(a) !== JSON.stringify(b);
    };

    watch(
      globalSettings,
      () => {
        hasUnsavedGlobalChanges.value = significantDifference(
          globalSettings.value,
          originalGlobalSettings.value,
        );
      },
      { deep: true },
    );

    watch(
      mqttSettings,
      () => {
        hasUnsavedMqttChanges.value = significantDifference(
          mqttSettings.value,
          originalMqttSettings.value,
        );
      },
      { deep: true },
    );

    const unsavedSummary = computed(() => {
      if (hasUnsavedGlobalChanges.value && hasUnsavedMqttChanges.value) {
        return 'Global + MQTT changes pending';
      }
      if (hasUnsavedGlobalChanges.value) {
        return 'Global changes pending';
      }
      if (hasUnsavedMqttChanges.value) {
        return 'MQTT changes pending';
      }
      return 'All settings saved';
    });

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
          autoReconnect: true,
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

    const mqttStatusSummary = computed(() => {
      if (mqttStatusDetails.value.connected) {
        return mqttStatusDetails.value.brokerUrl
          ? `Connected (${mqttStatusDetails.value.brokerUrl})`
          : 'Connected';
      }
      if (mqttStatusDetails.value.lastError) {
        return `Disconnected (${mqttStatusDetails.value.lastError})`;
      }
      if (mqttStatusDetails.value.nextRetryInMs) {
        return `Disconnected (retry in ${formatRetry(
          mqttStatusDetails.value.nextRetryInMs,
        )})`;
      }
      return 'Disconnected';
    });

    const handleMqttConnect = async () => {
      if (mqttBusy.value) return;
      mqttBusy.value = true;
      mqttBusyAction.value = 'connect';
      try {
        const response = await api.connectMqtt();
        const status = response.status || {};
        mqttStatusDetails.value = {
          ...mqttStatusDetails.value,
          ...status,
        };
        mqttOnline.value = status.connected !== false;
        mqttLastError.value = status.lastError || null;
        snackbarSuccess('MQTT connect requested');
      } catch (error) {
        snackbarError(`Failed to connect MQTT: ${error.message}`);
      } finally {
        mqttBusy.value = false;
        mqttBusyAction.value = null;
      }
    };

    const handleMqttDisconnect = async () => {
      if (mqttBusy.value) return;
      mqttBusy.value = true;
      mqttBusyAction.value = 'disconnect';
      try {
        const response = await api.disconnectMqtt();
        const status = response.status || {};
        mqttStatusDetails.value = {
          ...mqttStatusDetails.value,
          ...status,
        };
        mqttOnline.value = status.connected !== false;
        mqttLastError.value = status.lastError || null;
        snackbarSuccess('MQTT disconnect requested');
      } catch (error) {
        snackbarError(`Failed to disconnect MQTT: ${error.message}`);
      } finally {
        mqttBusy.value = false;
        mqttBusyAction.value = null;
      }
    };

    return {
      activeTab,
      globalSettings,
      driverOptions,
      watchdogActionOptions,
      savingGlobal,
      savingMqtt,
      saveGlobalSettings,
      saveMqttSettings,
      mqttSettings,
      mqttRules,
      loadingMqtt,
      loadingGlobal,
      importing,
      resetting,
      importFile,
      showResetDialog,
      showSnackbar,
      snackbarMessage,
      snackbarColor,
      exportConfig,
      importConfig,
      confirmReset,
      mqttOnline,
      mqttLastError,
      mqttStatusDetails,
      formatRetry,
      globalBrightnessIconOpacity,
      hasUnsavedGlobalChanges,
      hasUnsavedMqttChanges,
      unsavedSummary,
      mqttBusy,
      mqttBusyAction,
      handleMqttConnect,
      handleMqttDisconnect,
    };
  },
};
</script>

<style scoped>
.settings-view {
  padding-bottom: 48px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.settings-title {
  display: flex;
  align-items: center;
}

.settings-shell {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-tabs {
  margin-bottom: 24px;
}

.tab-card {
  background: transparent;
  box-shadow: none;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: flex-start;
}

.section-subheader {
  display: flex;
  align-items: flex-start;
}

.brightness-control {
  display: flex;
  align-items: center;
}

.status-chip,
.mqtt-status-chip {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.mqtt-status-chip .last-heartbeat {
  margin-left: 6px;
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.7);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.diagnostics-id {
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  background: rgba(15, 23, 42, 0.06);
  padding: 2px 6px;
  border-radius: 6px;
  color: #0f172a;
}

.panel-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-width: 1px;
  border-color: rgba(15, 23, 42, 0.08) !important;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.reset-alert {
  background-color: rgba(253, 230, 138, 0.18) !important;
  border-color: rgba(234, 179, 8, 0.6) !important;
}

.danger-zone-section {
  border: 2px solid rgba(220, 38, 38, 0.3);
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(254, 226, 226, 0.1) 0%, rgba(254, 226, 226, 0.05) 100%);
}

.danger-zone-title {
  color: #b91c1c !important;
  letter-spacing: 0.05em;
}

/* Responsive breakpoints */
@media (max-width: 1024px) {
  .settings-shell {
    padding: 20px;
  }
}

@media (max-width: 800px) {
  .settings-shell {
    padding: 16px;
  }

  .settings-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-title {
    width: 100%;
  }

  .status-chip {
    width: 100%;
  }
}
</style>


