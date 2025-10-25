<template>
  <v-container fluid class="logs-view">
    <v-row justify="center">
      <v-col cols="12" lg="9">
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
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';

const activeFilters = ref(['daemon', 'ui']);
</script>

<style scoped>
.logs-view {
  padding: 16px 32px 48px;
}

.logs-card {
  border-radius: 18px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
  padding: 20px 24px 24px;
}

.logs-header {
  margin-bottom: 12px;
}

.logs-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background-color: rgba(79, 70, 229, 0.08);
}

.logs-filter-group {
  display: inline-flex;
  gap: 8px;
}

.logs-filter-chip {
  border-radius: 999px !important;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.logs-filter-chip--active {
  background-color: rgba(79, 70, 229, 0.12) !important;
  color: #312e81 !important;
}

.logs-filter-chip--disabled {
  background-color: transparent !important;
  border: 1px dashed rgba(79, 70, 229, 0.25) !important;
  color: rgba(49, 46, 129, 0.6) !important;
}

.logs-subcard {
  border-radius: 14px !important;
}

@media (max-width: 960px) {
  .logs-view {
    padding: 12px 16px 32px;
  }

  .logs-card {
    padding: 16px !important;
  }
}
</style>

