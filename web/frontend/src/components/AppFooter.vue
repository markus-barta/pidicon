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
          <v-icon 
            size="x-small" 
            class="mr-1 commit-check-icon" 
            style="vertical-align: middle;"
            @click="checkForNewBuild"
            :class="{ 'checking': checkingForUpdate }"
            title="Check for updates"
          >
            {{ checkingForUpdate ? 'mdi-loading' : 'mdi-source-commit' }}
          </v-icon>
          <span v-if="buildNumber && gitCommit">
            <a :href="`https://github.com/markus-barta/pidicon/commit/${gitCommit}`" target="_blank" class="text-decoration-none text-primary">{{ gitCommit.slice(0, 7) }}</a>
            (Build #{{ buildNumber}})
            <span v-if="newVersionAvailable" class="new-version-glow"> • New version available</span>
            •
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
import { useToast } from '../composables/useToast';
import { useDevModeStore } from '../store/dev-mode';

const devMode = useDevModeStore();

const api = useApi();
const toast = useToast();

const buildNumber = ref(null);
const gitCommit = ref(null);
const currentBuildNumber = ref(null);
const currentGitCommit = ref(null);
const newVersionAvailable = ref(false);
const checkingForUpdate = ref(false);

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

async function checkForNewBuild(showToast = true) {
  if (checkingForUpdate.value) return; // Prevent multiple simultaneous checks
  
  try {
    checkingForUpdate.value = true;
    
    // Show checking toast (only if requested)
    if (showToast) {
      toast.info('🔄 Checking for updates...', 2000);
    }
    
    // Check GitHub Pages for latest release
    const releaseInfo = await api.getLatestRelease();
    
    if (releaseInfo.updateAvailable) {
      newVersionAvailable.value = true;
      
      // Show update available toast with details (only if requested)
      if (showToast) {
        toast.warning(
          `🎉 New version available!\n\nCurrent: Build #${releaseInfo.current.buildNumber}\nLatest: Build #${releaseInfo.latest.buildNumber}\n\nUpdate your container to get the latest features!`,
          8000
        );
      }
      
      console.log(`🎉 New version available! Current: Build #${releaseInfo.current.buildNumber}, Latest: Build #${releaseInfo.latest.buildNumber}`);
    } else {
      newVersionAvailable.value = false;
      
      // Show up-to-date toast (only if requested)
      if (showToast) {
        toast.success(
          `✓ You're up to date!\n\nCurrent: Build #${releaseInfo.current.buildNumber}\nLatest: Build #${releaseInfo.latest.buildNumber}`,
          5000
        );
      }
      
      console.log(`✓ You're up to date (Build #${releaseInfo.current.buildNumber})`);
    }
    
    // Also update local build info
    buildNumber.value = releaseInfo.current.buildNumber;
    gitCommit.value = releaseInfo.current.gitCommit;
    
  } catch (error) {
    console.error('Failed to check for updates:', error);
    
    // Show error toast (only if requested)
    if (showToast) {
      toast.error(
        '⚠️ Could not check for updates\n\nPlease try again later or check your network connection.',
        5000
      );
    }
  } finally {
    checkingForUpdate.value = false;
  }
}

onMounted(async () => {
  try {
    // Get system status for dev scenes count
    const status = await api.getSystemStatus();
    buildNumber.value = status.buildNumber;
    gitCommit.value = status.gitCommit;
    currentBuildNumber.value = status.buildNumber;
    currentGitCommit.value = status.gitCommit;
    hasDevScenes.value = Boolean(status.devSceneCount);
    
    // Auto-check for updates on mount (silent, no toast)
    checkForNewBuild(false);
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

/* Commit check icon - clickable */
.commit-check-icon {
  cursor: pointer;
  transition: all 0.2s ease;
}

.commit-check-icon:hover {
  color: #8b5cf6 !important;
  transform: scale(1.2);
}

.commit-check-icon.checking {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* New version available glow effect */
.new-version-glow {
  font-weight: 600;
  color: #f59e0b;
  animation: glow-pulse 2.5s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 4px rgba(245, 158, 11, 0.6), 0 0 8px rgba(245, 158, 11, 0.3);
  }
  50% {
    opacity: 0.7;
    text-shadow: 0 0 8px rgba(245, 158, 11, 0.8), 0 0 16px rgba(245, 158, 11, 0.5), 0 0 24px rgba(245, 158, 11, 0.3);
  }
}

/* Responsive breakpoints */
@media (max-width: 800px) {
  .footer-container {
    padding: 12px 16px;
  }

  .footer-container > div {
    flex-direction: column;
    gap: 12px;
    align-items: center !important;
    text-align: center;
  }

  .footer-container > div > div {
    justify-content: center !important;
  }

  .dev-toggle-container {
    order: -1;
  }
}
</style>

