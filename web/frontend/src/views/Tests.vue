<template>
  <div class="tests-dashboard">
    <v-card elevation="0" class="tests-dashboard__card">
      <v-card-text class="tests-dashboard__content">
        <div class="tests-dashboard__header">
          <div>
            <h2 class="tests-dashboard__title">Diagnostics</h2>
            <p class="tests-dashboard__subtitle">
              {{ totalTests }} total tests
            </p>
          </div>
          <div class="tests-dashboard__actions">
            <v-btn
              variant="text"
              prepend-icon="mdi-reload"
              :disabled="testsState.loading"
              @click="loadTests"
            >
              Refresh
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-refresh"
              :loading="testsState.runningAll"
              :disabled="testsState.loading || diagnosticTests.length === 0"
              @click="runAllDiagnostics"
            >
              Run All
            </v-btn>
          </div>
        </div>

        <div class="tests-dashboard__summary">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search tests by ID, name, or description"
            variant="outlined"
            density="comfortable"
            clearable
          />
          <div class="tests-dashboard__summary-status">
            <span class="status-summary">
              <span class="status-dot status-dot--green">●</span>
              {{ statusCounts.green }} passed
            </span>
            <span class="status-summary">
              <span class="status-dot status-dot--red">●</span>
              {{ statusCounts.red }} failed
            </span>
            <span class="status-summary">
              <span class="status-dot status-dot--yellow">●</span>
              {{ statusCounts.yellow }} pending
            </span>
          </div>
        </div>

        <v-alert
          v-if="testsState.error"
          type="error"
          border="start"
          class="mb-4"
        >
          {{ testsState.error }}
        </v-alert>

        <v-skeleton-loader
          v-if="testsState.loading"
          type="image, image, image"
          class="tests-dashboard__skeleton"
        />

        <div v-else>
          <div
            v-if="filteredSections.length === 0"
            class="tests-dashboard__empty"
          >
            {{ searchQuery ? `No tests match "${searchQuery}"` : 'No tests available.' }}
          </div>

          <div v-else>
            <div
              v-for="section in filteredSections"
              :key="section.key"
              class="tests-section"
            >
              <button
                class="tests-section__header"
                type="button"
                @click="toggleSection(section.key)"
              >
                <v-icon
                  :icon="expandedSections.has(section.key)
                    ? 'mdi-chevron-down'
                    : 'mdi-chevron-right'"
                  size="18"
                  class="tests-section__chevron"
                />
                <div class="tests-section__title">
                  <span class="tests-section__label">{{ section.label }}</span>
                  <div class="tests-section__status">
                    <span v-if="section.counts.green > 0" class="section-status">
                      <span class="status-dot status-dot--green">●</span>
                      {{ section.counts.green }}
                    </span>
                    <span v-if="section.counts.red > 0" class="section-status">
                      <span class="status-dot status-dot--red">●</span>
                      {{ section.counts.red }}
                    </span>
                    <span v-if="section.counts.yellow > 0" class="section-status">
                      <span class="status-dot status-dot--yellow">●</span>
                      {{ section.counts.yellow }}
                    </span>
                  </div>
                </div>
              </button>

              <transition name="expand">
                <div
                  v-show="expandedSections.has(section.key)"
                  class="tests-section__body"
                >
                  <div
                    v-for="test in section.tests"
                    :key="test.id"
                    class="test-row"
                    @click="openDetails(test)"
                  >
                    <div class="test-row__status">
                      <span
                        :class="['test-row__dot', `test-row__dot--${test.latest?.status || 'unknown'}`]"
                      />
                    </div>
                    <div class="test-row__id">
                      <code>{{ test.id }}</code>
                    </div>
                    <div class="test-row__name">
                      <div class="test-row__name-primary">
                        {{ test.name }}
                      </div>
                      <div class="test-row__name-secondary">
                        {{ section.type === 'automated'
                          ? formatAutomatedDescription(test)
                          : test.description }}
                      </div>
                    </div>
                    <div class="test-row__last-run">
                      {{ formatRelativeTime(test.latest?.lastRun) }}
                    </div>
                    <div class="test-row__actions" @click.stop>
                      <v-btn
                        size="small"
                        variant="text"
                        @click="openDetails(test)"
                      >
                        Details
                      </v-btn>
                      <v-btn
                        v-if="test.runnable"
                        size="small"
                        color="primary"
                        variant="tonal"
                        :loading="testsState.running[test.id]"
                        @click="runDiagnosticsTest(test.id)"
                      >
                        Run
                      </v-btn>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <test-details-dialog
      v-model="detailsDialog.open"
      :test="detailsDialog.test"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useApi } from '../composables/useApi';
import TestDetailsDialog from '../components/TestDetailsDialog.vue';

const api = useApi();

const searchQuery = ref('');
const expandedSections = reactive(new Set());
const detailsDialog = reactive({ open: false, test: null });

const testsState = reactive({
  tests: [],
  loading: false,
  running: {},
  runningAll: false,
  error: null,
});

const CATEGORY_METADATA = {
  system: { label: 'SYSTEM DIAGNOSTICS', type: 'diagnostic', prefix: 'SD' },
  device: { label: 'DEVICE DIAGNOSTICS', type: 'diagnostic', prefix: 'DD' },
  mqtt: { label: 'MQTT DIAGNOSTICS', type: 'diagnostic', prefix: 'MD' },
  'unit-tests': { label: 'UNIT TESTS', type: 'automated', prefix: 'UT' },
  'integration-tests': { label: 'INTEGRATION TESTS', type: 'automated', prefix: 'IT' },
  'contract-tests': { label: 'CONTRACT TESTS', type: 'automated', prefix: 'CT' },
  'ui-tests': { label: 'UI TESTS', type: 'automated', prefix: 'UI' },
};

const totalTests = computed(() => testsState.tests.length);
const diagnosticTests = computed(() => testsState.tests.filter((test) => test.runnable));

const statusCounts = computed(() => {
  return testsState.tests.reduce(
    (acc, test) => {
      const status = test.latest?.status;
      if (status === 'green') acc.green += 1;
      else if (status === 'red') acc.red += 1;
      else if (status === 'yellow') acc.yellow += 1;
      else acc.unknown += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0, unknown: 0 },
  );
});

const groupedSections = computed(() => {
  const map = new Map();
  for (const test of testsState.tests) {
    const meta = CATEGORY_METADATA[test.category] || {
      label: `${(test.category || 'other').toUpperCase()} 📋`,
      type: test.type || 'automated',
    };
    const key = test.category || 'other';
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: meta.label,
        type: meta.type,
        tests: [],
      });
    }
    map.get(key).tests.push(test);
  }
  return Array.from(map.values()).map((section) => ({
    ...section,
    counts: section.tests.reduce(
      (acc, test) => {
        const status = test.latest?.status;
        if (status === 'green') acc.green += 1;
        else if (status === 'red') acc.red += 1;
        else if (status === 'yellow') acc.yellow += 1;
        else acc.unknown += 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0, unknown: 0 },
    ),
  }));
});

const filteredSections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return groupedSections.value;
  }
  return groupedSections.value
    .map((section) => {
      const tests = section.tests.filter((test) => {
        const nameMatches = test.name?.toLowerCase().includes(query);
        const idMatches = test.id?.toLowerCase().includes(query);
        const descriptionMatches = (test.description || '').toLowerCase().includes(query);
        const latestMessageMatches = test.latest?.message?.toLowerCase().includes(query);
        return nameMatches || idMatches || descriptionMatches || latestMessageMatches;
      });
      return { ...section, tests };
    })
    .filter((section) => section.tests.length > 0);
});

function toggleSection(key) {
  if (expandedSections.has(key)) {
    expandedSections.delete(key);
  } else {
    expandedSections.add(key);
  }
}

function ensureSectionExpanded(key) {
  if (!expandedSections.has(key)) {
    expandedSections.add(key);
  }
}

function formatStatusLabel(status) {
  switch (status) {
    case 'green':
      return 'Passed';
    case 'yellow':
      return 'Pending';
    case 'red':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  const diff = Date.now() - date.getTime();
  if (diff < 60_000) {
    return 'Just now';
  }
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `${minutes}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / 86_400_000);
  return `${days}d ago`;
}

function formatAutomatedDescription(test) {
  if (!test?.latest?.details) {
    return 'Automated test';
  }
  const { ancestorTitles = [], filePath } = test.latest.details;
  const parts = [];
  if (ancestorTitles.length > 0) {
    parts.push(ancestorTitles.join(' › '));
  }
  if (filePath) {
    parts.push(filePath.replace(process.cwd(), ''));
  }
  return parts.join(' • ') || 'Automated test';
}

function openDetails(test) {
  detailsDialog.test = test;
  detailsDialog.open = true;
}

async function loadTests() {
  testsState.loading = true;
  testsState.error = null;
  try {
    const response = await api.request('/tests');
    const tests = Array.isArray(response.tests) ? response.tests : [];
    testsState.tests = tests.map((test) => ({
      ...test,
      latest: test.latest || null,
      category: test.category || 'system',
      type: test.type || (test.runnable ? 'diagnostic' : 'automated'),
    }));

    testsState.tests.forEach((test) => ensureSectionExpanded(test.category || 'system'));
  } catch (error) {
    testsState.error = error.message || 'Failed to load tests.';
  } finally {
    testsState.loading = false;
  }
}

async function runDiagnosticsTest(testId) {
  if (!testId) return;
  testsState.running = { ...testsState.running, [testId]: true };
  try {
    const result = await api.request(`/tests/${testId}/run`, { method: 'POST' });
    testsState.tests = testsState.tests.map((test) =>
      test.id === testId ? { ...test, latest: result } : test,
    );
  } catch (error) {
    testsState.error = error.message || 'Failed to run diagnostics test.';
  } finally {
    testsState.running = { ...testsState.running, [testId]: false };
  }
}

async function runAllDiagnostics() {
  testsState.runningAll = true;
  testsState.error = null;
  try {
    const response = await api.request('/tests/run', { method: 'POST' });
    const latest = Array.isArray(response.results) ? response.results : [];
    const latestMap = new Map(latest.map((item) => [item.id, item]));
    testsState.tests = testsState.tests.map((test) =>
      latestMap.has(test.id) ? { ...test, latest: latestMap.get(test.id) } : test,
    );
  } catch (error) {
    testsState.error = error.message || 'Failed to run diagnostics tests.';
  } finally {
    testsState.runningAll = false;
  }
}

onMounted(() => {
  loadTests();
});
</script>

<style scoped>
.tests-dashboard {
  padding-bottom: 48px;
}

.tests-dashboard__card {
  background: transparent;
  box-shadow: none;
  border-radius: 16px;
}

.tests-dashboard__content {
  padding: 32px 40px 48px !important;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tests-dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.tests-dashboard__title {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.tests-dashboard__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: rgba(15, 23, 42, 0.6);
}

.tests-dashboard__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.tests-dashboard__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.tests-dashboard__summary-status {
  display: flex;
  gap: 16px;
  align-items: center;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.76);
}

.status-dot {
  font-size: 10px;
  line-height: 1;
}

.status-dot--green {
  color: #16a34a;
}

.status-dot--red {
  color: #ef4444;
}

.status-dot--yellow {
  color: #f59e0b;
}

.tests-dashboard__skeleton {
  margin-top: 16px;
}

.tests-dashboard__empty {
  padding: 48px;
  text-align: center;
  color: rgba(15, 23, 42, 0.45);
  font-size: 15px;
  border: 1px dashed rgba(15, 23, 42, 0.12);
  border-radius: 12px;
}

.tests-section {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.tests-section:last-of-type {
  margin-bottom: 0;
}

.tests-section__header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  background: rgba(15, 23, 42, 0.02);
  border: none;
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease;
}

.tests-section__header:hover {
  background: rgba(15, 23, 42, 0.04);
}

.tests-section__chevron {
  color: rgba(15, 23, 42, 0.35);
  transition: transform 0.2s ease;
}

.tests-section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.tests-section__label {
  font-size: 12px;
  letter-spacing: 0.15em;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.55);
}

.tests-section__status {
  display: flex;
  gap: 12px;
  align-items: center;
}

.section-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.7);
}

.tests-section__body {
  display: flex;
  flex-direction: column;
}

.test-row {
  display: grid;
  grid-template-columns: 32px 90px 1fr 140px auto;
  align-items: center;
  padding: 18px 24px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  transition: background 0.2s ease;
  cursor: pointer;
}

.test-row:first-child {
  border-top: none;
}

.test-row:hover {
  background: rgba(15, 23, 42, 0.03);
}

.test-row__status {
  display: flex;
  justify-content: center;
}

.test-row__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.test-row__dot--green {
  background: #16a34a;
}

.test-row__dot--yellow {
  background: #f59e0b;
}

.test-row__dot--red {
  background: #ef4444;
}

.test-row__dot--unknown {
  background: rgba(148, 163, 184, 0.7);
}

.test-row__id {
  font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.test-row__name {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 16px;
}

.test-row__name-primary {
  font-size: 15px;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.92);
}

.test-row__name-secondary {
  font-size: 13px;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.test-row__last-run {
  font-size: 13px;
  color: rgba(15, 23, 42, 0.55);
}

.test-row__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.test-row__actions .v-btn {
  text-transform: none;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1200px;
  opacity: 1;
}

@media (max-width: 1024px) {
  .test-row {
    grid-template-columns: 28px 90px 1fr 110px;
    grid-template-areas:
      'status id name name'
      'status name name actions';
    gap: 12px 16px;
  }

  .test-row__status {
    grid-area: status;
  }

  .test-row__id {
    grid-area: id;
  }

  .test-row__name {
    grid-area: name;
  }

  .test-row__last-run {
    display: none;
  }

  .test-row__actions {
    grid-area: actions;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .tests-dashboard__content {
    padding: 24px !important;
  }

  .tests-dashboard__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tests-dashboard__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .tests-dashboard__summary {
    flex-direction: column;
    align-items: stretch;
  }

  .tests-dashboard__summary-status {
    flex-wrap: wrap;
  }
}

</style>

