<template>
  <div class="scene-selector">
    <v-select
      v-model="selectedScene"
      :items="sceneItems"
      item-title="title"
      item-value="name"
      placeholder="Select Scene"
      density="comfortable"
      variant="outlined"
      :disabled="disabled || loading"
      :loading="loading"
      data-test="scene-selector"
      @update:model-value="handleSceneChange"
      hide-details
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
            <v-chip
              v-if="item.raw.isDevScene"
              size="x-small"
              color="warning"
              variant="flat"
              class="ml-2"
            >
              DEV
            </v-chip>
          </template>
          <template v-slot:subtitle>
            {{ item.raw.description }}
          </template>
        </v-list-item>
      </template>
    </v-select>
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
  showDevScenes: {
    type: Boolean,
    default: false,
  },
  deviceType: {
    type: String,
    default: null, // e.g., 'pixoo64', 'awtrix', etc.
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
  // Filter scenes based on showDevScenes prop and device type
  let filteredScenes = sceneStore.scenes;
  
  if (!props.showDevScenes) {
    filteredScenes = filteredScenes.filter((scene) => !scene.isDevScene);
  }

  // Filter out scenes flagged as dev if not requested, and example tags if needed
  filteredScenes = filteredScenes.filter((scene) => {
    const tags = scene.tags || [];
    if (!props.showDevScenes && tags.includes('dev')) {
      return false;
    }
    return true;
  });

  // Filter by device type if specified
  if (props.deviceType) {
    const normalizedType = props.deviceType.toLowerCase();
    filteredScenes = filteredScenes.filter((scene) => {
      const sceneTypes = scene.deviceTypes || [];
      if (sceneTypes.length === 0) {
        return true;
      }
      const target = sceneTypes.map((type) => type.toLowerCase());
      return target.includes(normalizedType);
    });
  }
  
  return filteredScenes.map((scene) => {
    const folder = scene.filePath?.includes('/') 
      ? scene.filePath.split('/')[0] + '/' 
      : '';
    const displayName = `${scene.sceneNumber}. ${folder}${scene.name}`;
    
    return {
      name: scene.name,
      title: displayName,
      description: scene.description || `Scene: ${scene.name}`,
      wantsLoop: scene.wantsLoop || false,
      category: scene.category || 'General',
      filePath: scene.filePath,
      deviceTypes: scene.deviceTypes,
      isDevScene: scene.isDevScene,
      tags: scene.tags || [],
    };
  });
});

function handleSceneChange(newScene) {
  emit('update:modelValue', newScene);
  emit('change', newScene);
}
</script>

<style scoped>
.scene-selector {
  width: 100%;
}
</style>

