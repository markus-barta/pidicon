<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-devices</v-icon>
      Device Management
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        variant="flat"
        @click="openAddDialog"
      >
        Add Device
      </v-btn>
    </v-card-title>

    <v-card-text>
      <!-- Search & Filter -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Search devices"
            variant="outlined"
            density="compact"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filterType"
            label="Filter by Type"
            :items="[
              { title: 'All Types', value: null },
              { title: 'Pixoo 64', value: 'pixoo64' },
              { title: 'AWTRIX', value: 'awtrix3' },
            ]"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filterDriver"
            label="Filter by Driver"
            :items="[
              { title: 'All Drivers', value: null },
              { title: 'Real', value: 'real' },
              { title: 'Mock', value: 'mock' },
            ]"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>

      <!-- Device Table -->
      <v-data-table
        :headers="headers"
        :items="filteredDevices"
        :search="search"
        :loading="loading"
        class="elevation-1"
      >
        <!-- Name column -->
        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :color="getDeviceTypeColor(item.deviceType)"
              class="mr-2"
              size="small"
            >
              {{ getDeviceTypeIcon(item.deviceType) }}
            </v-icon>
            <strong>{{ item.name }}</strong>
          </div>
        </template>

        <!-- Device Type column -->
        <template #item.deviceType="{ item }">
          <v-chip size="small" :color="getDeviceTypeColor(item.deviceType)">
            {{ getDeviceTypeLabel(item.deviceType) }}
          </v-chip>
        </template>

        <!-- Driver column -->
        <template #item.driver="{ item }">
          <v-chip
            size="small"
            :color="item.driver === 'real' ? 'success' : 'info'"
          >
            {{ item.driver === 'real' ? 'Real' : 'Mock' }}
          </v-chip>
        </template>

        <!-- Watchdog column -->
        <template #item.watchdog="{ item }">
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-icon
                v-bind="props"
                :color="item.watchdog?.enabled ? 'success' : 'grey'"
                size="small"
              >
                mdi-shield-{{
                  item.watchdog?.enabled ? 'check' : 'off-outline'
                }}
              </v-icon>
            </template>
            <span v-if="item.watchdog?.enabled">
              Watchdog Enabled ({{
                item.watchdog.unresponsiveThresholdHours
              }}h)
            </span>
            <span v-else>Watchdog Disabled</span>
          </v-tooltip>
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-connection"
            size="small"
            variant="text"
            color="info"
            @click="testDevice(item)"
          >
            <v-icon>mdi-connection</v-icon>
            <v-tooltip activator="parent" location="top">
              Test Connection
            </v-tooltip>
          </v-btn>

          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            @click="editDevice(item)"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Edit</v-tooltip>
          </v-btn>

          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="top">Delete</v-tooltip>
          </v-btn>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey">mdi-devices</v-icon>
            <p class="text-h6 mt-4">No devices configured</p>
            <p class="text-body-2 text-grey">
              Add your first device to get started
            </p>
            <v-btn
              color="primary"
              variant="flat"
              class="mt-4"
              @click="openAddDialog"
            >
              <v-icon class="mr-2">mdi-plus</v-icon>
              Add Device
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Add/Edit Dialog -->
    <DeviceConfigDialog
      v-model="showDialog"
      :device="selectedDevice"
      @saved="handleDeviceSaved"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">Delete Device</v-card-title>
        <v-card-text>
          Are you sure you want to delete device
          <strong>{{ deviceToDelete?.name }}</strong> ({{
            deviceToDelete?.ip
          }})?
          <br />
          <br />
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="deleteDevice"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Test Result Snackbar -->
    <v-snackbar v-model="showTestSnackbar" :color="testSnackbarColor">
      {{ testSnackbarMessage }}
      <template #actions>
        <v-btn variant="text" @click="showTestSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import DeviceConfigDialog from './DeviceConfigDialog.vue';

export default {
  name: 'DeviceManagement',
  components: {
    DeviceConfigDialog,
  },
  setup() {
    const devices = ref([]);
    const loading = ref(false);
    const search = ref('');
    const filterType = ref(null);
    const filterDriver = ref(null);

    const showDialog = ref(false);
    const selectedDevice = ref(null);

    const showDeleteDialog = ref(false);
    const deviceToDelete = ref(null);
    const deleting = ref(false);

    const showTestSnackbar = ref(false);
    const testSnackbarMessage = ref('');
    const testSnackbarColor = ref('success');

    const headers = [
      { title: 'Name', key: 'name', sortable: true },
      { title: 'IP Address', key: 'ip', sortable: true },
      { title: 'Type', key: 'deviceType', sortable: true },
      { title: 'Driver', key: 'driver', sortable: true },
      { title: 'Startup Scene', key: 'startupScene', sortable: true },
      { title: 'Watchdog', key: 'watchdog', sortable: false, align: 'center' },
      { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
    ];

    const filteredDevices = computed(() => {
      let result = devices.value;

      if (filterType.value) {
        result = result.filter((d) => d.deviceType === filterType.value);
      }

      if (filterDriver.value) {
        result = result.filter((d) => d.driver === filterDriver.value);
      }

      return result;
    });

    const loadDevices = async () => {
      loading.value = true;
      try {
        const response = await fetch('/api/config/devices');
        const data = await response.json();
        devices.value = data.devices || [];
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        loading.value = false;
      }
    };

    const openAddDialog = () => {
      selectedDevice.value = null;
      showDialog.value = true;
    };

    const editDevice = (device) => {
      selectedDevice.value = device;
      showDialog.value = true;
    };

    const confirmDelete = (device) => {
      deviceToDelete.value = device;
      showDeleteDialog.value = true;
    };

    const deleteDevice = async () => {
      if (!deviceToDelete.value) return;

      deleting.value = true;
      try {
        const response = await fetch(
          `/api/config/devices/${deviceToDelete.value.ip}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) {
          throw new Error('Failed to delete device');
        }

        await loadDevices();
        showDeleteDialog.value = false;
        deviceToDelete.value = null;
      } catch (error) {
        console.error('Failed to delete device:', error);
        alert(`Failed to delete device: ${error.message}`);
      } finally {
        deleting.value = false;
      }
    };

    const testDevice = async (device) => {
      try {
        const response = await fetch(`/api/config/devices/${device.ip}/test`, {
          method: 'POST',
        });
        const data = await response.json();

        if (data.success && data.connected) {
          testSnackbarMessage.value = `✓ ${device.name} is reachable`;
          testSnackbarColor.value = 'success';
        } else {
          testSnackbarMessage.value = `✗ ${device.name} is unreachable: ${data.error || 'Unknown error'}`;
          testSnackbarColor.value = 'error';
        }
        showTestSnackbar.value = true;
      } catch (error) {
        testSnackbarMessage.value = `✗ Connection test failed: ${error.message}`;
        testSnackbarColor.value = 'error';
        showTestSnackbar.value = true;
      }
    };

    const handleDeviceSaved = async () => {
      await loadDevices();
    };

    const getDeviceTypeIcon = (type) => {
      switch (type) {
        case 'pixoo64':
          return 'mdi-television';
        case 'awtrix3':
          return 'mdi-clock-digital';
        default:
          return 'mdi-devices';
      }
    };

    const getDeviceTypeColor = (type) => {
      switch (type) {
        case 'pixoo64':
          return 'primary';
        case 'awtrix3':
          return 'info';
        default:
          return 'grey';
      }
    };

    const getDeviceTypeLabel = (type) => {
      switch (type) {
        case 'pixoo64':
          return 'Pixoo 64';
        case 'awtrix3':
          return 'AWTRIX 3';
        default:
          return type;
      }
    };

    onMounted(() => {
      loadDevices();
    });

    return {
      devices,
      loading,
      search,
      filterType,
      filterDriver,
      headers,
      filteredDevices,
      showDialog,
      selectedDevice,
      showDeleteDialog,
      deviceToDelete,
      deleting,
      showTestSnackbar,
      testSnackbarMessage,
      testSnackbarColor,
      loadDevices,
      openAddDialog,
      editDevice,
      confirmDelete,
      deleteDevice,
      testDevice,
      handleDeviceSaved,
      getDeviceTypeIcon,
      getDeviceTypeColor,
      getDeviceTypeLabel,
    };
  },
};
</script>

