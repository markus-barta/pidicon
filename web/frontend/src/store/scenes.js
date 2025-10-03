/**
 * Scene state management
 * Handles available scenes list and scene metadata
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

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

  // Actions
  function setScenes(newScenes) {
    scenes.value = newScenes;
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
    setScenes,
    setLoading,
    setError,
    clearError,
    getSceneByName,
  };
});
