import { beforeEach, vi } from 'vitest';

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
