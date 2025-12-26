// utils/init-app.ts
import { createApp, type Component } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Material from '@primeuix/themes/material';
import 'primeicons/primeicons.css';

export function bootstrap(RootComponent: Component) {
  const app = createApp(RootComponent);
  const pinia = createPinia();

  app.use(pinia);
  app.use(PrimeVue, {
    theme: {
      preset: Material,
      options: {
        darkModeSelector: 'system'
      }
    }
  });

  return app;
}