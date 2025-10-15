<template>
  <v-dialog v-model="isOpen" max-width="800px" persistent>
    <v-card>
      <v-card-title class="text-h5">
        {{ isEditMode ? 'Edit Device' : 'Add Device' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="valid">
          <!-- Basic Configuration -->
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Device Name"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.ip"
                label="IP Address"
                :rules="[rules.required, rules.ip]"
                :disabled="isEditMode"
                variant="outlined"
                density="compact"
                hint="Cannot be changed after creation"
                persistent-hint
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.deviceType"
                label="Device Type"
                :items="deviceTypes"
                :rules="[rules.required]"
                :disabled="isEditMode"
                variant="outlined"
                density="compact"
                hint="Cannot be changed after creation"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.driver"
                label="Driver"
                :items="driverTypes"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Startup Configuration -->
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.startupScene"
                label="Startup Scene"
                :items="availableScenes"
                variant="outlined"
                density="compact"
                clearable
                hint="Scene to load on daemon startup"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-slider
                v-model="formData.brightness"
                label="Default Brightness"
                :min="0"
                :max="100"
                :step="1"
                thumb-label
                variant="outlined"
              />
            </v-col>
          </v-row>

          <!-- Watchdog Configuration -->
          <v-expansion-panels variant="accordion" class="mt-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-shield-alert</v-icon>
                Watchdog Configuration (Advanced)
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-switch
                  v-model="formData.watchdog.enabled"
                  label="Enable Watchdog Monitoring"
                  color="primary"
                  density="compact"
                />

                <template v-if="formData.watchdog.enabled">
                  <v-text-field
                    v-model.number="formData.watchdog.healthCheckIntervalSeconds"
                    label="Health Check Interval (seconds)"
                    type="number"
                    :min="5"
                    :max="300"
                    variant="outlined"
                    density="compact"
                    hint="How often to ping device (default: 10s)"
                    persistent-hint
                    class="mt-2"
                  />

                  <v-switch
                    v-model="formData.watchdog.checkWhenOff"
                    label="Check when device display is OFF"
                    color="primary"
                    density="compact"
                    hint="Continue health checks even when display is turned off"
                    persistent-hint
                    class="mt-2"
                  />

                  <v-text-field
                    v-model.number="formData.watchdog.timeoutMinutes"
                    label="Recovery Timeout (minutes)"
                    type="number"
                    :min="1"
                    :max="1440"
                    variant="outlined"
                    density="compact"
                    hint="Minutes of unresponsiveness before triggering recovery action"
                    persistent-hint
                    class="mt-2"
                  />

                  <v-select
                    v-model="formData.watchdog.action"
                    label="Recovery Action"
                    :items="watchdogActions"
                    variant="outlined"
                    density="compact"
                    hint="Action to take when device exceeds timeout"
                    persistent-hint
                    class="mt-2"
                  />

                  <v-switch
                    v-model="formData.watchdog.notifyOnFailure"
                    label="Log warnings on recovery"
                    color="primary"
                    density="compact"
                    class="mt-2"
                  />

                  <v-text-field
                    v-if="formData.watchdog.action === 'fallback-scene'"
                    v-model="formData.watchdog.fallbackScene"
                    label="Fallback Scene"
                    variant="outlined"
                    density="compact"
                    class="mt-2"
                  />

                  <v-textarea
                    v-if="formData.watchdog.action === 'mqtt-command'"
                    v-model="formData.watchdog.mqttCommandSequence"
                    label="MQTT Command Sequence (JSON)"
                    variant="outlined"
                    density="compact"
                    rows="3"
                    hint='Example: [{"topic": "device/reboot", "payload": "true"}]'
                    persistent-hint
                    class="mt-2"
                  />
                </template>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- Connection Test -->
          <v-alert
            v-if="testResult"
            :type="testResult.success ? 'success' : 'error'"
            class="mt-4"
            closable
            @click:close="testResult = null"
          >
            {{ testResult.message }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="info"
          variant="outlined"
          :loading="testing"
          :disabled="!valid || saving"
          @click="testConnection"
        >
          <v-icon>mdi-connection</v-icon>
          Test Connection
        </v-btn>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!valid || testing"
          @click="save"
        >
          {{ isEditMode ? 'Update' : 'Add' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'DeviceConfigDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    device: {
      type: Object,
      default: null,
    },
  },
  emits: ['update:modelValue', 'saved'],
  setup(props, { emit }) {
    const form = ref(null);
    const valid = ref(false);
    const saving = ref(false);
    const testing = ref(false);
    const testResult = ref(null);
    const availableScenes = ref([]);

    const isOpen = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value),
    });

    const isEditMode = computed(() => !!props.device);

    const formData = ref({
      name: '',
      ip: '',
      deviceType: 'pixoo64',
      driver: 'real',
      startupScene: '',
      brightness: 80,
      watchdog: {
        enabled: false,
        healthCheckIntervalSeconds: 10,
        checkWhenOff: true,
        timeoutMinutes: 120,
        action: 'restart',
        fallbackScene: '',
        mqttCommandSequence: '',
        notifyOnFailure: true,
      },
    });

    const deviceTypes = [
      { title: 'Pixoo 64 (64x64)', value: 'pixoo64' },
      { title: 'AWTRIX 3 (32x8)', value: 'awtrix' },
    ];

    const driverTypes = [
      { title: 'Real Hardware', value: 'real' },
      { title: 'Mock (Simulated)', value: 'mock' },
    ];

    const watchdogActions = [
      { title: 'Restart Device', value: 'restart' },
      { title: 'Show Fallback Scene', value: 'fallback-scene' },
      { title: 'Send MQTT Commands', value: 'mqtt-command' },
      { title: 'Notify Only (Log)', value: 'notify' },
    ];

    const rules = {
      required: (value) => !!value || 'Required',
      ip: (value) => {
        const pattern =
          /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return pattern.test(value) || 'Invalid IP address';
      },
    };

    // Watch for device prop changes (edit mode)
    watch(
      () => props.device,
      (newDevice) => {
        if (newDevice) {
          formData.value = {
            name: newDevice.name || '',
            ip: newDevice.ip || '',
            deviceType: newDevice.deviceType || 'pixoo64',
            driver: newDevice.driver || 'real',
            startupScene: newDevice.startupScene || '',
            brightness: newDevice.brightness ?? 80,
            watchdog: {
              enabled: newDevice.watchdog?.enabled || false,
              healthCheckIntervalSeconds:
                newDevice.watchdog?.healthCheckIntervalSeconds ?? 10,
              checkWhenOff: newDevice.watchdog?.checkWhenOff !== false,
              timeoutMinutes: newDevice.watchdog?.timeoutMinutes ?? 120,
              action: newDevice.watchdog?.action || 'restart',
              fallbackScene: newDevice.watchdog?.fallbackScene || '',
              mqttCommandSequence:
                typeof newDevice.watchdog?.mqttCommandSequence === 'string'
                  ? newDevice.watchdog.mqttCommandSequence
                  : JSON.stringify(
                      newDevice.watchdog?.mqttCommandSequence || [],
                      null,
                      2,
                    ),
              notifyOnFailure: newDevice.watchdog?.notifyOnFailure !== false,
            },
          };
        }
      },
      { immediate: true },
    );

    // Fetch available scenes
    watch(
      () => formData.value.deviceType,
      async (deviceType) => {
        if (!deviceType) return;
        try {
          const response = await fetch(
            `/api/scenes/list?deviceType=${deviceType}`,
          );
          const data = await response.json();
          availableScenes.value = data.scenes.map((scene) => ({
            title: scene.name || scene,
            value: scene.name || scene,
          }));
        } catch (error) {
          console.error('Failed to load scenes:', error);
        }
      },
      { immediate: true },
    );

    const testConnection = async () => {
      if (!valid.value) return;

      testing.value = true;
      testResult.value = null;

      try {
        const response = await fetch(
          `/api/config/devices/${formData.value.ip}/test`,
          {
            method: 'POST',
          },
        );
        const data = await response.json();

        if (data.success && data.connected) {
          testResult.value = {
            success: true,
            message: `✓ Successfully connected to device at ${formData.value.ip}`,
          };
        } else {
          testResult.value = {
            success: false,
            message: `✗ Failed to connect: ${data.error || 'Unknown error'}`,
          };
        }
      } catch (error) {
        testResult.value = {
          success: false,
          message: `✗ Connection test failed: ${error.message}`,
        };
      } finally {
        testing.value = false;
      }
    };

    const save = async () => {
      if (!valid.value) return;

      saving.value = true;
      try {
        // Prepare payload
        const payload = {
          ...formData.value,
          watchdog: {
            ...formData.value.watchdog,
            mqttCommandSequence:
              formData.value.watchdog.action === 'mqtt-command' &&
              formData.value.watchdog.mqttCommandSequence
                ? JSON.parse(formData.value.watchdog.mqttCommandSequence)
                : [],
          },
        };

        const url = isEditMode.value
          ? `/api/config/devices/${formData.value.ip}`
          : '/api/config/devices';

        const method = isEditMode.value ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save device');
        }

        const savedDevice = await response.json();
        emit('saved', savedDevice);
        close();
      } catch (error) {
        testResult.value = {
          success: false,
          message: `Failed to save: ${error.message}`,
        };
      } finally {
        saving.value = false;
      }
    };

    const close = () => {
      testResult.value = null;
      if (!props.device) {
        // Reset form only in add mode
        formData.value = {
          name: '',
          ip: '',
          deviceType: 'pixoo64',
          driver: 'real',
          startupScene: '',
          brightness: 80,
          watchdog: {
            enabled: false,
            healthCheckIntervalSeconds: 10,
            checkWhenOff: true,
            timeoutMinutes: 120,
            action: 'restart',
            fallbackScene: '',
            mqttCommandSequence: '',
            notifyOnFailure: true,
          },
        };
      }
      isOpen.value = false;
    };

    return {
      form,
      valid,
      saving,
      testing,
      testResult,
      isOpen,
      isEditMode,
      formData,
      deviceTypes,
      driverTypes,
      watchdogActions,
      availableScenes,
      rules,
      testConnection,
      save,
      close,
    };
  },
};
</script>

