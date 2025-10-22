/**
 * Scene state management
 * Handles available scenes list and scene metadata
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

function normalizeScenePath(filePath) {
  if (!filePath) {
    return '';
  }
  return filePath.replace(/\\/g, '/');
}

export const useSceneStore = defineStore('scenes', () => {
  // State
  const scenes = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const sceneNames = computed(() => scenes.value.map((s) => s.name));
  const scenesByCategory = computed(() => {
    const grouped = {};
    scenes.value.forEach((scene) => {
      const category = scene.category || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(scene);
    });
    return grouped;
  });
  const animatedScenes = computed(() =>
    scenes.value.filter((s) => s.wantsLoop),
  );
  const hasDevScenes = computed(() =>
    scenes.value.some((scene) => scene.isDevScene),
  );
  const availableTags = computed(() => {
    const tagSet = new Set();
    scenes.value.forEach((scene) => {
      (scene.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  });

  // Actions
  function setScenes(newScenes) {
    scenes.value = newScenes.map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1,
      filePath: normalizeScenePath(scene.filePath),
      isDevScene: Boolean(scene.isDevScene),
      tags: Array.isArray(scene.tags) ? scene.tags : [],
    }));
  }

  function setLoading(value) {
    loading.value = value;
  }

  function setError(value) {
    error.value = value;
  }

  function clearError() {
    error.value = null;
  }

  function getSceneByName(name) {
    return scenes.value.find((s) => s.name === name);
  }

  return {
    scenes,
    loading,
    error,
    sceneNames,
    scenesByCategory,
    animatedScenes,
    hasDevScenes,
    availableTags,
    setScenes,
    setLoading,
    setError,
    clearError,
    getSceneByName,
  };
});
