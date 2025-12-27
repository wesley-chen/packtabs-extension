import './style.css';
import type { Component } from 'vue';
import App from './App.vue';
import { bootstrap } from '~/utils/init-app';

// Initialize and mount the Vue application
bootstrap(App as Component).mount('#app');
