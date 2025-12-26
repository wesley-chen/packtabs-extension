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

  // Global error handler
  app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err, info);
    
    // Get the toast service from the app instance
    const toast = app.config.globalProperties.$toast;
    
    if (toast) {
      // Extract error message
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Display error using PrimeVue Toast
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000
      });
    }
  };

  return app;
}