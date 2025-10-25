<template>
  <v-dialog v-model="modelValue" max-width="720">
    <v-card class="test-details">
      <v-card-title class="test-details__header">
        <div class="test-details__title">
          <span class="test-details__status" :class="`test-details__status--${testStatus}`" />
          <div>
            <div class="test-details__name">
              {{ test?.name || 'Test Details' }}
            </div>
            <div class="test-details__meta">
              <code>{{ test?.id }}</code>
              <span class="separator">•</span>
              {{ categoryLabel }}
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="emitClose" />
      </v-card-title>

      <v-card-text class="test-details__content">
        <div class="test-details__section">
          <div class="test-details__label">Description</div>
          <div class="test-details__description">
            {{ test?.description || 'No description provided.' }}
          </div>
        </div>

        <div class="test-details__metrics" v-if="metricsVisible">
          <div class="test-details__metric">
            <div class="test-details__metric-label">Last Run</div>
            <div class="test-details__metric-value">{{ relativeLastRun }}</div>
            <div class="test-details__metric-sub">{{ formattedLastRun }}</div>
          </div>
          <div class="test-details__metric">
            <div class="test-details__metric-label">Status</div>
            <div class="test-details__metric-value">{{ statusLabel }}</div>
            <div class="test-details__metric-sub">
              Duration {{ durationLabel }}
            </div>
          </div>
        </div>

        <v-alert
          v-if="test?.latest?.message"
          type="info"
          border="start"
          class="mb-4"
        >
          {{ test.latest.message }}
        </v-alert>

        <div v-if="detailsEntries.length" class="test-details__section">
          <div class="test-details__label">Details</div>
          <div class="test-details__details-grid">
            <div
              v-for="([key, value], index) in detailsEntries"
              :key="`${key}-${index}`"
              class="test-details__details-item"
            >
              <div class="test-details__details-key">{{ key }}</div>
              <div class="test-details__details-value">{{ value }}</div>
            </div>
          </div>
        </div>

        <v-expand-transition>
          <div v-if="failureMessages.length" class="test-details__section">
            <div class="test-details__label">Failure Messages</div>
            <v-alert
              v-for="(message, index) in failureMessages"
              :key="index"
              type="error"
              border="start"
              class="mb-2"
            >
              <pre class="test-details__failure">{{ message }}</pre>
            </v-alert>
          </div>
        </v-expand-transition>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  test: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue']);

const metricsVisible = computed(() => Boolean(props.test?.latest));

const testStatus = computed(() => props.test?.latest?.status || 'unknown');

const statusLabel = computed(() => {
  switch (props.test?.latest?.status) {
    case 'green':
      return 'Passed';
    case 'yellow':
      return 'Pending';
    case 'red':
      return 'Failed';
    default:
      return 'Unknown';
  }
});

const durationLabel = computed(() => {
  const duration = props.test?.latest?.durationMs;
  if (typeof duration !== 'number') return '–';
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(2)} s`;
});

const formattedLastRun = computed(() => {
  const value = props.test?.latest?.lastRun;
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
});

const relativeLastRun = computed(() => {
  const value = props.test?.latest?.lastRun;
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} minute(s) ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hour(s) ago`;
  return `${Math.floor(diff / 86_400_000)} day(s) ago`;
});

const categoryLabel = computed(() => {
  if (!props.test?.category) return 'Uncategorised';
  const categories = {
    system: 'System Diagnostics',
    device: 'Device Diagnostics',
    integration: 'Integration Diagnostics',
    mqtt: 'MQTT Diagnostics',
    'unit-tests': 'Unit Tests',
    'integration-tests': 'Integration Tests',
    'contract-tests': 'Contract Tests',
  };
  return categories[props.test.category] || props.test.category;
});

const detailsEntries = computed(() => {
  const details = props.test?.latest?.details;
  if (!details || typeof details !== 'object') {
    return [];
  }

  const normalised = { ...details };
  if (Array.isArray(normalised.ancestorTitles)) {
    normalised.suite = normalised.ancestorTitles.join(' › ');
    delete normalised.ancestorTitles;
  }
  if (Array.isArray(normalised.failureMessages)) {
    delete normalised.failureMessages;
  }

  return Object.entries(normalised).map(([key, value]) => [
    key,
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
  ]);
});

const failureMessages = computed(
  () => props.test?.latest?.details?.failureMessages || [],
);

function emitClose() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.test-details {
  border-radius: 16px;
  overflow: hidden;
}

.test-details__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
}

.test-details__title {
  display: flex;
  gap: 12px;
}

.test-details__status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 6px;
}

.test-details__status--green {
  background: #16a34a;
}

.test-details__status--yellow {
  background: #f59e0b;
}

.test-details__status--red {
  background: #ef4444;
}

.test-details__status--unknown {
  background: rgba(148, 163, 184, 0.6);
}

.test-details__name {
  font-size: 18px;
  font-weight: 600;
}

.test-details__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.6);
}

.test-details__content {
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.test-details__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-details__label {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.5);
}

.test-details__description {
  font-size: 14px;
  color: rgba(15, 23, 42, 0.82);
  line-height: 1.5;
}

.test-details__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  padding: 16px;
  background: rgba(15, 23, 42, 0.03);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 12px;
}

.test-details__metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.test-details__metric-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(15, 23, 42, 0.45);
}

.test-details__metric-value {
  font-size: 16px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.85);
}

.test-details__metric-sub {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.test-details__details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.test-details__details-item {
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.02);
}

.test-details__details-key {
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.5);
  margin-bottom: 6px;
}

.test-details__details-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.8);
  white-space: pre-wrap;
  word-break: break-word;
}

.test-details__failure {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.separator {
  opacity: 0.4;
}

@media (max-width: 600px) {
  .test-details__content {
    padding: 0 16px 16px;
  }

  .test-details__details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
