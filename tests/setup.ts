import { TextDecoder,TextEncoder } from 'util';
import { beforeEach, vi } from 'vitest';

// Fix for jsdom TextEncoder issue with esbuild
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Mock browser APIs before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Ensure browser.windows.getCurrent is mocked
  if (!vi.isMockFunction(browser.windows.getCurrent)) {
    vi.mocked(browser.windows.getCurrent);
  }

  // Ensure browser.tabs.query is mocked
  if (!vi.isMockFunction(browser.tabs.query)) {
    vi.mocked(browser.tabs.query);
  }
});
