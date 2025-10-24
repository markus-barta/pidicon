<template>
  <div class="tests-view">
    <v-card elevation="0" class="tests-card">
      <v-card-text class="pa-6">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <h2 class="text-h6 mb-1">Tests</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Run diagnostic tests to verify hardware signals and daemon state.
            </p>
          </div>
          <div class="d-flex" style="gap: 12px">
            <v-btn
              color="primary"
              prepend-icon="mdi-refresh"
              :loading="diagnostics.runningAll"
              @click="runAllDiagnostics"
              data-test="diagnostics-run-all"
            >
              Run All
            </v-btn>
            <v-btn
              variant="text"
              prepend-icon="mdi-reload"
              :disabled="diagnostics.loading"
              @click="loadDiagnostics"
              data-test="diagnostics-reload"
            >
              Refresh
            </v-btn>
          </div>
        </div>

        <v-alert
          v-if="diagnostics.error"
          type="error"
          class="mb-4"
          border="start"
          prominent
        >
          {{ diagnostics.error }}
        </v-alert>

        <v-data-table
          :items="diagnostics.tests"
          :loading="diagnostics.loading"
          class="diagnostics-table"
          :headers="diagnosticsHeaders"
          item-key="id"
          density="comfortable"
        >
          <template #item.id="{ item }">
            <code class="diagnostics-id">{{ item.id }}</code>
          </template>

          <template #item.status="{ item }">
            <v-chip
              :color="statusColor(item.latest?.status)"
              variant="flat"
              size="small"
              class="text-uppercase"
            >
              {{ item.latest?.status || 'pending' }}
            </v-chip>
          </template>

          <template #item.lastRun="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ formatLastRun(item.latest?.lastRun) }}
            </span>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              size="small"
              variant="outlined"
              color="primary"
              :loading="diagnostics.running[item.id]"
              @click="runDiagnosticsTest(item.id)"
              data-test="diagnostics-run-single"
            >
              Run
            </v-btn>
          </template>

          <template #item.message="{ item }">
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ item.latest?.message || 'Not yet executed.' }}
              </div>
              <div
                v-if="item.latest?.details && Object.keys(item.latest.details).length"
                class="text-caption text-medium-emphasis"
              >
                {{ formatDetails(item.latest.details) }}
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useApi } from '../composables/useApi';

const api = useApi();

const diagnostics = ref({
  tests: [],
  loading: false,
  running: {},
  runningAll: false,
  error: null,
});

const diagnosticsHeaders = [
  { title: 'ID', key: 'id', width: 140 },
  { title: 'Test', key: 'name', width: 220 },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'Last Run', key: 'lastRun', width: 160 },
  { title: 'Message', key: 'message' },
  { title: 'Actions', key: 'actions', sortable: false, width: 110 },
];

const statusColor = (status) => {
  switch (status) {
    case 'green':
      return 'success';
    case 'yellow':
      return 'warning';
    case 'red':
      return 'error';
    default:
      return undefined;
  }
};

const formatLastRun = (timestamp) => {
  if (!timestamp) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
};

const formatDetails = (details) => {
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
};

async function loadDiagnostics() {
  diagnostics.value.loading = true;
  diagnostics.value.error = null;
  try {
    const response = await api.request('/tests');
    diagnostics.value.tests = response.tests || [];
  } catch (error) {
    diagnostics.value.error = error.message || 'Failed to load diagnostics.';
  } finally {
    diagnostics.value.loading = false;
  }
}

async function runDiagnosticsTest(testId) {
  diagnostics.value.running = {
    ...diagnostics.value.running,
    [testId]: true,
  };
  try {
    const result = await api.request(`/tests/${testId}/run`, {
      method: 'POST',
    });
    diagnostics.value.tests = diagnostics.value.tests.map((test) =>
      test.id === testId ? { ...test, latest: result } : test,
    );
  } catch (error) {
    diagnostics.value.error = error.message || 'Diagnostics test failed.';
  } finally {
    diagnostics.value.running = {
      ...diagnostics.value.running,
      [testId]: false,
    };
  }
}

async function runAllDiagnostics() {
  diagnostics.value.runningAll = true;
  diagnostics.value.error = null;
  try {
    const response = await api.request('/tests/run', {
      method: 'POST',
    });
    const latest = response.results || [];
    const latestMap = new Map(latest.map((result) => [result.id, result]));
    diagnostics.value.tests = diagnostics.value.tests.map((test) =>
      latestMap.has(test.id) ? { ...test, latest: latestMap.get(test.id) } : test,
    );
  } catch (error) {
    diagnostics.value.error = error.message || 'Failed to run diagnostics.';
  } finally {
    diagnostics.value.runningAll = false;
  }
}

onMounted(() => {
  loadDiagnostics();
});
</script>

<style scoped>
.tests-view {
  padding-bottom: 48px;
}

.tests-card {
  background: transparent;
  box-shadow: none;
  border-radius: 16px;
}

.diagnostics-table {
  border-radius: 12px;
  overflow: hidden;
}

.diagnostics-id {
  background-color: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}
</style>

