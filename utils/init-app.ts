// utils/init-app.ts
import 'primeicons/primeicons.css';

import Material from '@primeuix/themes/material';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import type { Component } from 'vue';
import { createApp } from 'vue';

export function bootstrap(RootComponent: Component) {
  const app = createApp(RootComponent);
  const pinia = createPinia();

  app.use(pinia);
  app.use(PrimeVue, {
    theme: {
      preset: Material,
      options: {
        darkModeSelector: 'system',
      },
    },
  });
  app.use(ToastService);
  app.use(ConfirmationService);

  // Global error handler
  app.config.errorHandler = (err, _instance, info) => {
    console.error('Global error:', err, info);

    // Get the toast service from the app instance
    const toast = app.config.globalProperties.$toast as
      | { add: (options: { severity: string; summary: string; detail: string; life: number }) => void }
      | undefined;

    if (toast !== undefined) {
      // Extract error message
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Display error using PrimeVue Toast
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000,
      });
    }
  };

  return app;
}
