<template>
  <v-container fluid class="logs-view">
        <v-card class="logs-card">
          <div class="logs-header d-flex align-center">
            <v-avatar color="primary" size="36" class="mr-3">
              <v-icon color="white" size="22">mdi-file-document-outline</v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h6 text-lg-h5 mb-1">Daemon Logs</h1>
              <p class="text-body-2 text-medium-emphasis mb-0">
                View recent daemon activity, connection events, and warnings.
              </p>
            </div>
          </div>

          <div class="logs-filter">
            <span class="text-caption text-medium-emphasis mr-3">Quick filter</span>
            <v-chip-group
              v-model="activeFilters"
              multiple
              class="logs-filter-group"
              selected-class="logs-filter-chip--active"
            >
              <v-chip value="daemon" class="logs-filter-chip">
                <v-icon size="small" class="mr-1">mdi-square-wave</v-icon>
                Daemon
              </v-chip>
              <v-chip value="ui" class="logs-filter-chip">
                <v-icon size="small" class="mr-1">mdi-monitor-dashboard</v-icon>
                UI
              </v-chip>
            </v-chip-group>
            <v-chip class="logs-filter-chip logs-filter-chip--disabled" label>
              Filtering engine coming soon
            </v-chip>
          </div>

          <v-alert type="info" variant="tonal" border="start" class="mb-4">
            Live log streaming will be available soon. For now, use the CLI to
            tail logs and monitor daemon activity.
          </v-alert>

          <v-card variant="outlined" class="mb-4 logs-subcard">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-console</v-icon>
                <span class="text-subtitle-1">Quick Commands</span>
              </div>
              <v-chip size="small" color="primary" variant="tonal">
                SSH access required
              </v-chip>
            </v-card-title>
            <v-divider />
            <v-card-text>
              <p class="text-body-2 text-medium-emphasis mb-3">
                Run these commands inside the miniserver24 environment to inspect
                daemon behaviour:
              </p>
              <v-code>
                ssh pidicon@miniserver24
                <br />
                docker logs -f pidicon-daemon
              </v-code>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" class="logs-subcard">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="warning">mdi-lightning-bolt</v-icon>
              <span class="text-subtitle-1">Coming Soon</span>
            </v-card-title>
            <v-divider />
            <v-card-text>
              <ul class="text-body-2 text-medium-emphasis mb-0">
                <li>Live log streaming with filtering and search</li>
                <li>Error-level highlighting and quick remediation tips</li>
                <li>Downloadable archives for support investigations</li>
              </ul>
            </v-card-text>
          </v-card>
        </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';

const activeFilters = ref(['daemon', 'ui']);
</script>

<style scoped>
.logs-view {
  padding-bottom: 48px;
}

.logs-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.logs-header {
  margin-bottom: 16px;
}

.logs-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 8px;
  background-color: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.12);
}

.logs-filter-group {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.logs-filter-chip {
  font-weight: 500;
}

.logs-filter-chip--disabled {
  opacity: 0.6;
  font-style: italic;
}

.logs-subcard {
  border-radius: 8px !important;
}

/* Responsive breakpoints */
@media (max-width: 1024px) {
  .logs-card {
    padding: 20px;
  }
}

@media (max-width: 800px) {
  .logs-card {
    padding: 16px;
  }

  .logs-filter {
    flex-direction: column;
    align-items: flex-start;
  }

  .logs-filter-group {
    width: 100%;
  }
}
</style>

