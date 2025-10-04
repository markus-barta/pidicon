<template>
  <v-footer app color="white" elevation="4" class="app-footer">
    <v-container fluid class="py-6">
      <v-row align="center">
        <!-- Left: License & Author -->
        <v-col cols="12" md="4" class="text-center text-md-left">
          <div class="text-body-2 text-medium-emphasis mb-2">
            <v-icon size="small" class="mr-1">mdi-license</v-icon>
            <strong>MIT License</strong> • Open Source
          </div>
          <div class="text-caption text-medium-emphasis">
            <v-icon size="x-small" class="mr-1">mdi-account-circle</v-icon>
            Created by <strong>Markus Barta</strong> with assistance from Cursor AI
          </div>
        </v-col>

        <!-- Center: Project Info -->
        <v-col cols="12" md="4" class="text-center">
          <div class="text-h6 font-weight-bold primary--text mb-1">
            <v-icon color="primary" class="mr-2">mdi-television</v-icon>
            Pixoo Daemon
          </div>
          <div class="text-caption text-medium-emphasis">
            IoT Display Management System
          </div>
        </v-col>

        <!-- Right: Build Info & Links -->
        <v-col cols="12" md="4" class="text-center text-md-right">
          <div class="d-flex align-center justify-center justify-md-end flex-wrap gap-2 mb-2">
            <v-chip
              v-if="buildNumber"
              size="small"
              color="primary"
              variant="outlined"
              :href="`https://github.com/markus-barta/pixoo-daemon/commit/${gitCommit}`"
              target="_blank"
              link
            >
              <v-icon size="x-small" class="mr-1">mdi-github</v-icon>
              Build #{{ buildNumber }}
            </v-chip>
            <v-chip
              v-if="gitCommit"
              size="small"
              color="grey"
              variant="text"
            >
              {{ gitCommit.slice(0, 7) }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis">
            <a
              href="https://github.com/markus-barta/pixoo-daemon"
              target="_blank"
              class="text-decoration-none text-primary"
            >
              <v-icon size="x-small" class="mr-1">mdi-github</v-icon>
              View on GitHub
            </a>
          </div>
        </v-col>
      </v-row>
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
  margin-top: 48px;
}

.gap-2 {
  gap: 8px;
}
</style>

