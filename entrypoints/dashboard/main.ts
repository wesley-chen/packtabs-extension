import './style.css';

import type { Component } from 'vue';

import { bootstrap } from '~/utils/init-app';

import App from './App.vue';

// Initialize and mount the Vue application
bootstrap(App as Component).mount('#app');
