/**
 * Toast notification composable
 * Manages snackbar notifications with auto-dismiss and sticky errors
 *
 * @author Markus Barta (mba) with assistance from Cursor AI
 */
import { ref } from 'vue';

const toasts = ref([]);
let nextId = 0;

export function useToast() {
  function addToast(message, type = 'info', timeout = 3000) {
    const id = nextId++;
    const toast = {
      id,
      message,
      type,
      timeout,
      show: true,
    };

    toasts.value.push(toast);

    // Auto-remove after timeout (unless sticky error)
    if (timeout > 0) {
      setTimeout(() => {
        removeToast(id);
      }, timeout);
    }

    return id;
  }

  function removeToast(id) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  function success(message, timeout = 3000) {
    return addToast(message, 'success', timeout);
  }

  function error(message, sticky = true) {
    return addToast(message, 'error', sticky ? -1 : 5000);
  }

  function warning(message, timeout = 5000) {
    return addToast(message, 'warning', timeout);
  }

  function info(message, timeout = 4000) {
    return addToast(message, 'info', timeout);
  }

  function clearAll() {
    toasts.value = [];
  }

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast,
    clearAll,
  };
}
