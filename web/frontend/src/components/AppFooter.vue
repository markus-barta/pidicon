<template>
  <v-footer app color="white" elevation="1" class="app-footer">
    <v-container fluid class="footer-container">
      <div class="d-flex align-center justify-space-between flex-wrap text-caption text-medium-emphasis">
        <!-- Left: License & Author -->
        <div class="d-flex align-center">
          <v-icon size="x-small" class="mr-1" style="vertical-align: middle;">mdi-license</v-icon>
          <span><strong>GNU GPL v3.0</strong> • Created by <a href="https://x.com/markusbarta" target="_blank" class="text-decoration-none text-primary">Markus Barta</a> with Cursor AI</span>
        </div>

        <!-- Center: Dev Toggle -->
        <div class="dev-toggle-container">
          <button
            class="dev-toggle"
            :class="{ 'dev-toggle--active': devMode.enabled, 'dev-toggle--hidden': !devMode.enabled }"
            :disabled="!hasDevScenes"
            @click="toggleDiagnostics"
            data-test="diagnostics-toggle"
          >
            <span class="dev-toggle__icon">
              <v-icon size="x-small">{{ devMode.enabled ? 'mdi-rocket-launch' : 'mdi-rocket' }}</v-icon>
            </span>
            <span class="dev-toggle__label">Dev Mode</span>
            <span class="dev-toggle__pill" aria-hidden="true"></span>
          </button>
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
import { useDevModeStore } from '../store/dev-mode';

const devMode = useDevModeStore();

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

const hasDevScenes = ref(false);

const toggleDiagnostics = () => {
  devMode.set(!devMode.enabled);
};

onMounted(async () => {
  try {
    const status = await api.getSystemStatus();
    buildNumber.value = status.buildNumber;
    gitCommit.value = status.gitCommit;
    hasDevScenes.value = Boolean(status.devSceneCount);
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

.footer-container {
  padding: 6px 20px;
}

.dev-toggle-container {
  position: relative;
}

.dev-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(17, 24, 39, 0.04);
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.dev-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.dev-toggle__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  color: inherit;
}

.dev-toggle__pill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.dev-toggle--hidden {
  color: rgba(148, 163, 184, 0.2);
  border-color: rgba(148, 163, 184, 0.15);
  background: transparent;
}

.dev-toggle--hidden:hover {
  color: rgba(59, 130, 246, 0.9);
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
}

.dev-toggle--active {
  color: #0f172a;
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.18);
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.25);
}

.dev-toggle--active .dev-toggle__pill {
  opacity: 1;
}

.dev-toggle--active .dev-toggle__icon {
  background: rgba(79, 70, 229, 0.16);
  color: #4f46e5;
}

.dev-toggle:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 2px;
}
</style>

