<template>
  <div class="scene-selector">
    <v-select
      v-model="selectedScene"
      :items="sceneItems"
      item-title="title"
      item-value="name"
      label="Select Scene"
      density="comfortable"
      variant="outlined"
      :disabled="disabled || loading"
      :loading="loading"
      @update:model-value="handleSceneChange"
    >
      <template v-slot:prepend-inner>
        <v-icon icon="mdi-palette-swatch" size="small" />
      </template>
      <template v-slot:item="{ props, item }">
        <v-list-item v-bind="props">
          <template v-slot:prepend>
            <v-icon
              :icon="item.raw.wantsLoop ? 'mdi-play-circle' : 'mdi-image'"
              :color="item.raw.wantsLoop ? 'success' : 'info'"
            />
          </template>
          <template v-slot:title>
            {{ item.raw.title }}
          </template>
          <template v-slot:subtitle>
            {{ item.raw.description }}
          </template>
        </v-list-item>
      </template>
    </v-select>

    <div class="scene-controls mt-2">
      <v-btn
        icon="mdi-chevron-left"
        size="small"
        variant="tonal"
        :disabled="disabled || loading || !canGoPrev"
        @click="prevScene"
      >
        <v-icon>mdi-chevron-left</v-icon>
        <v-tooltip activator="parent" location="top">Previous Scene</v-tooltip>
      </v-btn>

      <v-spacer />

      <v-chip
        v-if="currentSceneInfo"
        :color="currentSceneInfo.wantsLoop ? 'success' : 'info'"
        size="small"
        variant="tonal"
      >
        <v-icon
          :icon="currentSceneInfo.wantsLoop ? 'mdi-play-circle' : 'mdi-image'"
          size="small"
          class="mr-1"
        />
        {{ currentSceneInfo.category || 'General' }}
      </v-chip>

      <v-spacer />

      <v-btn
        icon="mdi-chevron-right"
        size="small"
        variant="tonal"
        :disabled="disabled || loading || !canGoNext"
        @click="nextScene"
      >
        <v-icon>mdi-chevron-right</v-icon>
        <v-tooltip activator="parent" location="top">Next Scene</v-tooltip>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useSceneStore } from '../store/scenes';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const sceneStore = useSceneStore();
const selectedScene = ref(props.modelValue);

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newVal) => {
    selectedScene.value = newVal;
  },
);

const sceneItems = computed(() => {
  return sceneStore.scenes.map((scene) => ({
    name: scene.name,
    title: scene.name,
    description: scene.description || `Scene: ${scene.name}`,
    wantsLoop: scene.wantsLoop || false,
    category: scene.category || 'General',
  }));
});

const currentSceneInfo = computed(() => {
  return sceneStore.scenes.find((s) => s.name === selectedScene.value);
});

const currentSceneIndex = computed(() => {
  return sceneStore.sceneNames.indexOf(selectedScene.value);
});

const canGoPrev = computed(() => {
  return currentSceneIndex.value > 0;
});

const canGoNext = computed(() => {
  return (
    currentSceneIndex.value >= 0 &&
    currentSceneIndex.value < sceneStore.sceneNames.length - 1
  );
});

function handleSceneChange(newScene) {
  emit('update:modelValue', newScene);
  emit('change', newScene);
}

function prevScene() {
  if (!canGoPrev.value) return;
  const prevIndex = currentSceneIndex.value - 1;
  const prevSceneName = sceneStore.sceneNames[prevIndex];
  selectedScene.value = prevSceneName;
  handleSceneChange(prevSceneName);
}

function nextScene() {
  if (!canGoNext.value) return;
  const nextIndex = currentSceneIndex.value + 1;
  const nextSceneName = sceneStore.sceneNames[nextIndex];
  selectedScene.value = nextSceneName;
  handleSceneChange(nextSceneName);
}
</script>

<style scoped>
.scene-selector {
  width: 100%;
}

.scene-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

