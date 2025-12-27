import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  plugins: [WxtVitest(), vue()],
  test: {
    mockReset: true,
    restoreMocks: true,
    setupFiles: ['./tests/vitest-setup.ts', './tests/setup.ts'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '.wxt/', '.output/'],
    },
    globals: true,
  },
});
