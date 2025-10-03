<template>
  <div class="toast-container">
    <v-snackbar
      v-for="toast in toasts"
      :key="toast.id"
      v-model="toast.show"
      :color="getColor(toast.type)"
      :timeout="toast.timeout"
      location="top right"
      multi-line
      @update:model-value="(val) => !val && removeToast(toast.id)"
    >
      <div class="d-flex align-center">
        <v-icon :icon="getIcon(toast.type)" class="mr-3" />
        <span>{{ toast.message }}</span>
      </div>
      <template v-slot:actions>
        <v-btn
          variant="text"
          size="small"
          icon="mdi-close"
          @click="removeToast(toast.id)"
        />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();

function getColor(type) {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };
  return colors[type] || 'info';
}

function getIcon(type) {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
  };
  return icons[type] || 'mdi-information';
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 9999;
}
</style>

