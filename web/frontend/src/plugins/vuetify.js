/**
 * Vuetify 3 plugin configuration
 * Dark theme by default with Material Design components
 */
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#7C3AED', // Purple from Figma
          secondary: '#8B5CF6',
          accent: '#A78BFA',
          error: '#EF4444',
          info: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          background: '#F9FAFB',
          surface: '#FFFFFF',
        },
      },
    },
  },
  defaults: {
    VCard: {
      elevation: 1,
      rounded: 'lg',
    },
    VBtn: {
      variant: 'flat',
      rounded: 'lg',
    },
    VChip: {
      rounded: 'lg',
    },
  },
});
