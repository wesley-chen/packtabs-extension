import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
   webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
   },
   manifest: {
    name: "PackTabs",
    permissions: [
      "tabs", 
      "storage", 
      "sessions", // Useful for the "History Snapshot" feature
      "favicon"   // Allows using chrome://favicon2/ protocol
    ],
    action: {
      default_title: "Pack Tabs"
    }
  },
});
