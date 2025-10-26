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
          primary: '#8B5CF6', // Softer purple
          secondary: '#A78BFA',
          accent: '#C4B5FD',
          error: '#FCA5A5', // Softer red
          info: '#93C5FD', // Softer blue
          success: '#86EFAC', // Softer green
          warning: '#FCD34D', // Softer yellow
          background: '#FAFAFA',
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
    VAppBar: {
      flat: true,
      elevation: 0,
      density: 'comfortable',
      border: 'b thin',
    },
    VMain: {
      class: 'py-6 py-md-8',
    },
    VContainer: {
      class: 'mx-auto px-4 px-md-6 px-lg-8',
      maxWidth: 1920,
    },
  },
});
