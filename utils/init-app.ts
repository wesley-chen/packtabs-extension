// utils/init-app.ts
import { createApp, type Component } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Material from '@primeuix/themes/material';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
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
  app.use(ToastService);
  app.use(ConfirmationService);

  return app;
}