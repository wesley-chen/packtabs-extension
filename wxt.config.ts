import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
  manifest: {
    name: 'PackTabs',
    description: 'A simple, efficient Chrome extension to save and manage groups of browser tabs.',
    version: '1.0.0',
    permissions: [
      'tabs', // Required for capturing and opening tabs
      'storage', // Required for persisting tab groups
      'sessions', // Useful for the "History Snapshot" feature
      'favicon', // Allows using chrome://favicon/ protocol
    ],
    action: {
      default_title: 'PackTabs Manager',
      default_icon: {
        '16': '/icon/16.png',
        '32': '/icon/32.png',
        '48': '/icon/48.png',
        '96': '/icon/96.png',
        '128': '/icon/128.png',
      },
    },
    icons: {
      '16': '/icon/16.png',
      '32': '/icon/32.png',
      '48': '/icon/48.png',
      '96': '/icon/96.png',
      '128': '/icon/128.png',
    },
  },
});
