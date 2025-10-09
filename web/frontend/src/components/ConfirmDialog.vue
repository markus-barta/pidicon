<template>
  <v-dialog v-model="dialog" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon 
          :color="iconColor" 
          :icon="icon" 
          class="mr-3"
          size="large"
        />
        <span class="text-h6">{{ title }}</span>
      </v-card-title>

      <v-card-text class="pa-4 pt-2">
        <div class="text-body-1">{{ message }}</div>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          :color="confirmColor"
          variant="flat"
          @click="handleConfirm"
          :loading="loading"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue';

const emit = defineEmits(['confirm', 'cancel']);

const dialog = ref(false);
const loading = ref(false);

// Dialog options - updated dynamically when show() is called
const options = reactive({
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: 'primary',
  icon: 'mdi-help-circle',
  iconColor: 'primary'
});

// Computed properties to use options as template data
const title = ref('');
const message = ref('');
const confirmText = ref('');
const cancelText = ref('');
const confirmColor = ref('');
const icon = ref('');
const iconColor = ref('');

let resolvePromise = null;

function show(opts = {}) {
  // Update dialog options
  title.value = opts.title || 'Confirm Action';
  message.value = opts.message || '';
  confirmText.value = opts.confirmText || 'Confirm';
  cancelText.value = opts.cancelText || 'Cancel';
  confirmColor.value = opts.confirmColor || 'primary';
  icon.value = opts.icon || 'mdi-help-circle';
  iconColor.value = opts.iconColor || 'primary';

  dialog.value = true;

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}

function handleConfirm() {
  dialog.value = false;
  emit('confirm');
  if (resolvePromise) {
    resolvePromise(true);
    resolvePromise = null;
  }
}

function handleCancel() {
  dialog.value = false;
  emit('cancel');
  if (resolvePromise) {
    resolvePromise(false);
    resolvePromise = null;
  }
}

// Expose show method to parent
defineExpose({
  show
});
</script>

<style scoped>
.v-card-title {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
</style>

