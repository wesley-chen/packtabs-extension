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
    permissions: [
      'tabs', 
      'storage', 
      'sessions', // Useful for the "History Snapshot" feature
      'favicon'   // Allows using chrome://favicon/ protocol
    ],
    action: {
      default_title: "Pack Tabs"
    }
  },
});
