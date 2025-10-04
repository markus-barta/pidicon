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

