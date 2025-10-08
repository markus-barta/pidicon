<template>
  <div class="metadata-viewer">
    <!-- Simple key-value pairs -->
    <v-table v-if="isSimple" density="compact">
      <tbody>
        <tr v-for="(value, key) in maskedMetadata" :key="key">
          <td class="font-weight-medium text-caption">{{ formatKey(key) }}</td>
          <td class="text-right">
            <v-chip v-if="typeof value === 'boolean'" size="small" :color="value ? 'success' : 'error'">
              {{ value }}
            </v-chip>
            <code v-else-if="isNumeric(value)" class="metric-value">{{ value }}</code>
            <code v-else-if="value === null" class="text-grey">null</code>
            <span v-else class="text-body-2">{{ truncate(String(value), 50) }}</span>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Complex nested data -->
    <v-card v-else variant="outlined" class="pa-3">
      <pre class="metadata-json">{{ formatJSON(maskedMetadata) }}</pre>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  metadata: {
    type: Object,
    required: true
  }
});

// Mask sensitive fields
const maskedMetadata = computed(() => {
  const masked = { ...props.metadata };
  const sensitiveKeys = ['apikey', 'password', 'secret', 'token', 'auth'];
  
  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      masked[key] = '***';
    }
  }
  
  return masked;
});

// Simple if flat object with <= 8 keys and no nested objects/arrays
const isSimple = computed(() => {
  const keys = Object.keys(props.metadata || {});
  if (keys.length === 0 || keys.length > 8) return false;
  
  return keys.every(key => {
    const val = props.metadata[key];
    return typeof val !== 'object' || val === null;
  });
});

function formatKey(key) {
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function isNumeric(val) {
  return typeof val === 'number';
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '...';
}
</script>

<style scoped>
.metadata-json {
  font-family: 'Courier New', Monaco, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #2c3e50;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 300px;
  margin: 0;
}

.metadata-viewer {
  max-width: 100%;
}

.metric-value {
  font-family: 'Courier New', Monaco, monospace;
  font-size: 12px;
  background: #e3f2fd;
  padding: 2px 6px;
  border-radius: 4px;
  color: #1565c0;
}

.metadata-viewer :deep(.v-table) {
  background: transparent;
}

.metadata-viewer :deep(.v-table tbody tr:hover) {
  background: rgba(0, 0, 0, 0.02);
}
</style>

