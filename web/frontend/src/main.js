/**
 * Vue app entry point
 * Bootstraps Vue 3 + Vuetify 3 + Pinia
 *
 * @author Markus Barta (mba) with assistance from Cursor AI
 */
import { createApp } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import { pinia } from './store';

const app = createApp(App);

app.use(vuetify);
app.use(pinia);

app.mount('#app');
