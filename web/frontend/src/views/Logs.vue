<template>
  <v-container fluid class="logs-view">
    <v-row justify="center">
      <v-col cols="12" lg="10">
        <v-card class="logs-card pa-6">
          <div class="d-flex align-center mb-4">
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

          <v-alert type="info" variant="tonal" border="start" class="mb-4">
            Live log streaming will be available soon. For now, use the CLI to
            tail logs and monitor daemon activity.
          </v-alert>

          <v-card variant="outlined" class="mb-4">
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

          <v-card variant="outlined">
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
// Placeholder view; functionality will be added in future iterations.
</script>

<style scoped>
.logs-view {
  padding-bottom: 48px;
}

.logs-card {
  border-radius: 20px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

@media (max-width: 960px) {
  .logs-card {
    padding: 16px !important;
  }
}
</style>

