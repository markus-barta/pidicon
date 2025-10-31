import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  root: path.resolve(__dirname, 'web/frontend'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'web/frontend/src'),
      '@pidicon/lib': path.resolve(__dirname, 'lib'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'web/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vuetify: ['vuetify'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:10829',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
