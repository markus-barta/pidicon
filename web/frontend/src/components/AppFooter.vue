<template>
  <v-footer app color="white" elevation="1" class="app-footer">
    <v-container fluid class="py-3">
      <div class="d-flex align-center justify-space-between flex-wrap text-caption text-medium-emphasis">
        <!-- Left: License & Author -->
        <div class="d-flex align-center">
          <v-icon size="x-small" class="mr-1" style="vertical-align: middle;">mdi-license</v-icon>
          <span><strong>GNU GPL v3.0</strong> • Created by <a href="https://x.com/markusbarta" target="_blank" class="text-decoration-none text-primary">Markus Barta</a> with Cursor AI</span>
        </div>

        <!-- Center: Dev Scenes Toggle -->
        <div class="d-flex align-center">
          <v-btn
            variant="text"
            size="x-small"
            @click="toggleDevScenes"
            class="dev-scenes-toggle text-caption"
            data-test="dev-scenes-toggle"
          >
            <span :style="{
              textDecoration: showDevScenes ? 'none' : 'line-through',
              color: showDevScenes ? '#f59e0b' : '#9ca3af',
              fontSize: '0.75rem'
            }">
              {DEV}
            </span>
          </v-btn>
        </div>

        <!-- Right: Build Info -->
        <div class="d-flex align-center">
          <v-icon size="x-small" class="mr-1" style="vertical-align: middle;">mdi-source-commit</v-icon>
          <span v-if="buildNumber && gitCommit">
            <a :href="`https://github.com/markus-barta/pidicon/commit/${gitCommit}`" target="_blank" class="text-decoration-none text-primary">{{ gitCommit.slice(0, 7) }}</a>
            (Build #{{ buildNumber}}) •
          </span>
          <a href="https://github.com/markus-barta/pidicon" target="_blank" class="text-decoration-none text-primary ml-1">
            <v-icon size="x-small" style="vertical-align: middle;">mdi-github</v-icon>
            View on GitHub
          </a>
        </div>
      </div>
    </v-container>
  </v-footer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApi } from '../composables/useApi';

const api = useApi();

const buildNumber = ref(null);
const gitCommit = ref(null);

// Dev scenes toggle (shared via props with parent)
const props = defineProps({
  showDevScenes: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:show-dev-scenes']);

const toggleDevScenes = () => {
  emit('update:show-dev-scenes', !props.showDevScenes);
};

onMounted(async () => {
  try {
    const status = await api.getSystemStatus();
    buildNumber.value = status.buildNumber;
    gitCommit.value = status.gitCommit;
  } catch (error) {
    console.error('Failed to load build info:', error);
  }
});
</script>

<style scoped>
.app-footer {
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

.dev-scenes-toggle {
  min-width: auto !important;
  padding: 0 8px !important;
  height: auto !important;
}
</style>

