import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDevModeStore = defineStore('devMode', () => {
  const enabled = ref(false);

  function set(enabledValue) {
    enabled.value = !!enabledValue;
  }

  return { enabled, set };
});
