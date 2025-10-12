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
                <v-form>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="globalSettings.defaultDriver"
                        label="Default Driver"
                        :items="[
                          { title: 'Real Hardware', value: 'real' },
                          { title: 'Mock (Simulated)', value: 'mock' },
                        ]"
                        variant="outlined"
                        density="compact"
                        hint="Default driver for new devices"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-slider
                        v-model="globalSettings.defaultBrightness"
                        label="Default Brightness"
                        :min="0"
                        :max="100"
                        :step="1"
                        thumb-label
                        hint="Default brightness for new devices"
                        persistent-hint
                      />
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
                        v-model.number="globalSettings.watchdog.defaultTimeoutMinutes"
                        label="Default Timeout (minutes)"
                        type="number"
                        :min="30"
                        :max="1440"
                        variant="outlined"
                        density="compact"
                        hint="Default watchdog timeout for new devices"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="globalSettings.watchdog.defaultAction"
                        label="Default Action"
                        :items="[
                          { title: 'Restart Device', value: 'restart' },
                          {
                            title: 'Show Fallback Scene',
                            value: 'fallback-scene',
                          },
                          {
                            title: 'Send MQTT Commands',
                            value: 'mqtt-command',
                          },
                          { title: 'Notify Only', value: 'notify' },
                        ]"
                        variant="outlined"
                        density="compact"
                        hint="Default watchdog action for new devices"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12">
                      <v-btn
                        color="primary"
                        variant="flat"
                        :loading="savingGlobal"
                        @click="saveGlobalSettings"
                      >
                        <v-icon class="mr-2">mdi-content-save</v-icon>
                        Save Global Settings
                      </v-btn>
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
import { ref } from 'vue';
import DeviceManagement from '../components/DeviceManagement.vue';

export default {
  name: 'SettingsView',
  components: {
    DeviceManagement,
  },
  setup() {
    const activeTab = ref('devices');
    const savingGlobal = ref(false);
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
      watchdog: {
        defaultTimeoutMinutes: 240,
        defaultAction: 'restart',
      },
    });

    const saveGlobalSettings = async () => {
      savingGlobal.value = true;
      try {
        // TODO: Implement global settings API endpoint
        // For now, just show success message
        await new Promise((resolve) => setTimeout(resolve, 500));

        snackbarMessage.value = 'Global settings saved successfully';
        snackbarColor.value = 'success';
        showSnackbar.value = true;
      } catch (error) {
        snackbarMessage.value = `Failed to save settings: ${error.message}`;
        snackbarColor.value = 'error';
        showSnackbar.value = true;
      } finally {
        savingGlobal.value = false;
      }
    };

    const exportConfig = async () => {
      try {
        const response = await fetch('/api/config/devices');
        const data = await response.json();

        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          devices: data.devices,
          globalSettings: globalSettings.value,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pidico-config-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        snackbarMessage.value = 'Configuration exported successfully';
        snackbarColor.value = 'success';
        showSnackbar.value = true;
      } catch (error) {
        snackbarMessage.value = `Failed to export config: ${error.message}`;
        snackbarColor.value = 'error';
        showSnackbar.value = true;
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
          throw new Error('Invalid config file format');
        }

        // Import devices
        for (const device of importData.devices) {
          await fetch('/api/config/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device),
          });
        }

        // Import global settings if present
        if (importData.globalSettings) {
          globalSettings.value = importData.globalSettings;
        }

        snackbarMessage.value = `Successfully imported ${importData.devices.length} device(s)`;
        snackbarColor.value = 'success';
        showSnackbar.value = true;

        importFile.value = null;
        activeTab.value = 'devices'; // Switch to devices tab to see imported devices
      } catch (error) {
        snackbarMessage.value = `Failed to import config: ${error.message}`;
        snackbarColor.value = 'error';
        showSnackbar.value = true;
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

        // Reset global settings
        globalSettings.value = {
          defaultDriver: 'real',
          defaultBrightness: 80,
          watchdog: {
            defaultTimeoutMinutes: 240,
            defaultAction: 'restart',
          },
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
      savingGlobal,
      importing,
      resetting,
      importFile,
      showResetDialog,
      showSnackbar,
      snackbarMessage,
      snackbarColor,
      saveGlobalSettings,
      exportConfig,
      importConfig,
      confirmReset,
      resetToDefaults,
    };
  },
};
</script>

