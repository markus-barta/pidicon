<template>
  <v-footer app color="white" elevation="1" class="app-footer">
    <v-container fluid class="py-3">
      <div class="d-flex align-center justify-space-between flex-wrap text-caption text-medium-emphasis">
        <!-- Left: License & Author -->
        <div class="d-flex align-center">
          <v-icon size="x-small" class="mr-1" style="vertical-align: middle;">mdi-license</v-icon>
          <span><strong>MIT License</strong> • Created by <a href="https://x.com/markusbarta" target="_blank" class="text-decoration-none text-primary">Markus Barta</a> with Cursor AI</span>
        </div>

        <!-- Right: Build Info -->
        <div class="d-flex align-center">
          <v-icon size="x-small" class="mr-1" style="vertical-align: middle;">mdi-source-commit</v-icon>
          <span v-if="buildNumber && gitCommit">
            <a :href="`https://github.com/markus-barta/pixoo-daemon/commit/${gitCommit}`" target="_blank" class="text-decoration-none text-primary">{{ gitCommit.slice(0, 7) }}</a>
            (Build #{{ buildNumber}}) •
          </span>
          <a href="https://github.com/markus-barta/pixoo-daemon" target="_blank" class="text-decoration-none text-primary ml-1">
            <v-icon size="x-small" style="vertical-align: middle;">mdi-github</v-icon>
            View on GitHub
          </a>
        </div>
      </div>
    </v-container>
  </v-footer>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useApi } from '../composables/useApi';

const api = useApi();

const buildNumber = ref(null);
const gitCommit = ref(null);

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
</style>

