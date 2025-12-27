import * as fc from 'fast-check';
import { beforeEach, describe, it, vi } from 'vitest';

import type { TabItem } from '../../types/TabGroup';
import { openSingleTab,openTabs } from '../../utils/tabManager';

/**
 * Feature: tab-group-manager, Property 11: Tab Restoration Completeness
 *
 * For any tab group "Open All" operation, all URLs from that group should be
 * opened as new tabs in the current browser window.
 *
 * Validates: Requirements 4.1, 4.2
 */

// Arbitrary for generating random TabItem objects
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

describe('Tab Restoration Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('Property 11.1: Opens all tabs from a tab group', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }), async (tabs) => {
        // Track created tabs
        const createdTabs: { url: string; windowId: number }[] = [];

        // Set up browser API mocks
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser ?? {};
        (global as any).browser.windows = (global as any).browser.windows ?? {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create to track created tabs
        (global as any).browser.tabs = (global as any).browser.tabs ?? {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdTabs.push({
            url: createProperties.url,
            windowId: createProperties.windowId,
          });

          return { id: createdTabs.length };
        });

        // Open all tabs
        await openTabs(tabs);

        // Verify all tabs were created
        if (createdTabs.length !== tabs.length) {
          throw new Error(`Tab count mismatch: expected ${tabs.length} tabs to be opened, got ${createdTabs.length}`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11.2: Opens tabs in the current window', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }), async (tabs) => {
        // Track created tabs
        const createdTabs: { url: string; windowId: number }[] = [];

        // Set up browser API mocks
        const windowId = 42; // Use a specific window ID to verify

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser ?? {};
        (global as any).browser.windows = (global as any).browser.windows ?? {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create to track created tabs
        (global as any).browser.tabs = (global as any).browser.tabs ?? {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdTabs.push({
            url: createProperties.url,
            windowId: createProperties.windowId,
          });

          return { id: createdTabs.length };
        });

        // Open all tabs
        await openTabs(tabs);

        // Verify all tabs were opened in the correct window
        for (let i = 0; i < createdTabs.length; i++) {
          if (createdTabs[i].windowId !== windowId) {
            throw new Error(
              `Tab ${i} opened in wrong window: expected window ${windowId}, got ${createdTabs[i].windowId}`
            );
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11.3: Preserves original URLs when opening tabs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }), async (tabs) => {
        // Track created tabs
        const createdTabs: { url: string; windowId: number }[] = [];

        // Set up browser API mocks
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser ?? {};
        (global as any).browser.windows = (global as any).browser.windows ?? {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create to track created tabs
        (global as any).browser.tabs = (global as any).browser.tabs ?? {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdTabs.push({
            url: createProperties.url,
            windowId: createProperties.windowId,
          });

          return { id: createdTabs.length };
        });

        // Open all tabs
        await openTabs(tabs);

        // Verify each URL matches the original
        for (let i = 0; i < tabs.length; i++) {
          const originalUrl = tabs[i].url;
          const createdUrl = createdTabs[i].url;

          if (createdUrl !== originalUrl) {
            throw new Error(`Tab ${i} URL mismatch: expected ${originalUrl}, got ${createdUrl}`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11.4: Maintains tab order during restoration', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabItemArbitrary, { minLength: 2, maxLength: 20 }), async (tabs) => {
        // Track created tabs in order
        const createdUrls: string[] = [];

        // Set up browser API mocks
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser ?? {};
        (global as any).browser.windows = (global as any).browser.windows ?? {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create to track created tabs
        (global as any).browser.tabs = (global as any).browser.tabs ?? {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdUrls.push(createProperties.url);

          return { id: createdUrls.length };
        });

        // Open all tabs
        await openTabs(tabs);

        // Verify the order matches
        for (let i = 0; i < tabs.length; i++) {
          if (createdUrls[i] !== tabs[i].url) {
            throw new Error(`Tab order mismatch at position ${i}: expected ${tabs[i].url}, got ${createdUrls[i]}`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11.5: Individual tab opening works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab) => {
        // Track created tab
        let createdTab: { url: string; windowId: number; active: boolean } | null = null;

        // Set up browser API mocks
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser ?? {};
        (global as any).browser.windows = (global as any).browser.windows ?? {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create to track created tab
        (global as any).browser.tabs = (global as any).browser.tabs ?? {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdTab = {
            url: createProperties.url,
            windowId: createProperties.windowId,
            active: createProperties.active,
          };

          return { id: 1 };
        });

        // Open single tab
        await openSingleTab(tab);

        // Verify tab was created
        expect(createdTab).toBeTruthy();
        expect(createdTab?.url).toBe(tab.url);
        expect(createdTab?.windowId).toBe(windowId);
        expect(createdTab?.active).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
