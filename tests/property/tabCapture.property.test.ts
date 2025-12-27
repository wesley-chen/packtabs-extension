import { describe, it, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { captureCurrentWindow } from '../../utils/tabManager';

/**
 * Feature: tab-group-manager, Property 1: Tab Capture Completeness
 *
 * For any browser window with open tabs, when the save action is triggered,
 * all tabs from that window should be captured with their URL, title, and
 * favicon reference preserved.
 *
 * Validates: Requirements 1.1, 1.2
 */

// Arbitrary for generating random browser tabs
const browserTabArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  favIconUrl: fc.option(fc.webUrl(), { nil: undefined }),
  windowId: fc.constant(1), // All tabs in the same window
  index: fc.integer({ min: 0, max: 100 }),
  pinned: fc.boolean(),
  highlighted: fc.boolean(),
  active: fc.boolean(),
  incognito: fc.boolean(),
});

describe('Tab Capture Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('Property 1.1: Captures all tabs from current window', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(browserTabArbitrary, { minLength: 1, maxLength: 20 }), async (browserTabs) => {
        // Set up browser API mocks using global browser object
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.query
        (global as any).browser.tabs = (global as any).browser.tabs || {};
        (global as any).browser.tabs.query = vi.fn().mockResolvedValue(browserTabs);

        // Capture tabs
        const captured = await captureCurrentWindow();

        // Verify all tabs were captured
        if (captured.length !== browserTabs.length) {
          throw new Error(`Tab count mismatch: expected ${browserTabs.length}, got ${captured.length}`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.2: Preserves URL, title, and favicon for all tabs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(browserTabArbitrary, { minLength: 1, maxLength: 20 }), async (browserTabs) => {
        // Set up browser API mocks using global browser object
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.query
        (global as any).browser.tabs = (global as any).browser.tabs || {};
        (global as any).browser.tabs.query = vi.fn().mockResolvedValue(browserTabs);

        // Capture tabs
        const captured = await captureCurrentWindow();

        // Verify each tab's data is preserved
        for (let i = 0; i < browserTabs.length; i++) {
          const originalTab = browserTabs[i];
          const capturedTab = captured[i];

          // Verify URL is preserved
          if (capturedTab.url !== originalTab.url) {
            throw new Error(`Tab ${i} URL mismatch: expected ${originalTab.url}, got ${capturedTab.url}`);
          }

          // Verify title is preserved
          if (capturedTab.title !== originalTab.title) {
            throw new Error(`Tab ${i} title mismatch: expected ${originalTab.title}, got ${capturedTab.title}`);
          }

          // Verify favicon is preserved
          if (capturedTab.faviconUrl !== originalTab.favIconUrl) {
            throw new Error(
              `Tab ${i} favicon mismatch: expected ${originalTab.favIconUrl}, got ${capturedTab.faviconUrl}`
            );
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1.3: Handles tabs with missing optional fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100000 }),
            url: fc.option(fc.webUrl(), { nil: undefined }),
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            favIconUrl: fc.option(fc.webUrl(), { nil: undefined }),
            windowId: fc.constant(1),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (browserTabs) => {
          // Set up browser API mocks using global browser object
          const windowId = 1;

          // Mock browser.windows.getCurrent
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

          // Mock browser.tabs.query
          (global as any).browser.tabs = (global as any).browser.tabs || {};
          (global as any).browser.tabs.query = vi.fn().mockResolvedValue(browserTabs);

          // Capture tabs
          const captured = await captureCurrentWindow();

          // Filter out tabs that should be excluded (no URL or restricted protocols)
          const validTabs = browserTabs.filter((tab) => {
            if (!tab.url) return false;
            try {
              const urlObj = new URL(tab.url);
              const restrictedProtocols = ['chrome:', 'chrome-extension:', 'about:'];
              return !restrictedProtocols.some((protocol) => urlObj.protocol.startsWith(protocol));
            } catch {
              return false;
            }
          });

          // Verify correct number of tabs were captured
          if (captured.length !== validTabs.length) {
            throw new Error(`Tab count mismatch: expected ${validTabs.length}, got ${captured.length}`);
          }

          // Verify each tab has valid data (with defaults for missing fields)
          for (let i = 0; i < captured.length; i++) {
            const capturedTab = captured[i];
            const originalTab = validTabs[i];

            // URL should be preserved (we already filtered out undefined)
            if (capturedTab.url !== originalTab.url) {
              throw new Error(`Tab ${i} URL mismatch: expected ${originalTab.url}, got ${capturedTab.url}`);
            }

            // Title should default to 'Untitled' if missing
            const expectedTitle = originalTab.title || 'Untitled';
            if (capturedTab.title !== expectedTitle) {
              throw new Error(`Tab ${i} title mismatch: expected ${expectedTitle}, got ${capturedTab.title}`);
            }

            // Favicon should be preserved as-is (can be undefined)
            if (capturedTab.faviconUrl !== originalTab.favIconUrl) {
              throw new Error(
                `Tab ${i} favicon mismatch: expected ${originalTab.favIconUrl}, got ${capturedTab.faviconUrl}`
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1.4: Generates unique IDs for captured tabs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(browserTabArbitrary, { minLength: 2, maxLength: 20 }), async (browserTabs) => {
        // Set up browser API mocks using global browser object
        const windowId = 1;

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.query
        (global as any).browser.tabs = (global as any).browser.tabs || {};
        (global as any).browser.tabs.query = vi.fn().mockResolvedValue(browserTabs);

        // Capture tabs
        const captured = await captureCurrentWindow();

        // Verify all IDs are unique
        const ids = captured.map((tab) => tab.id);
        const uniqueIds = new Set(ids);

        if (uniqueIds.size !== ids.length) {
          throw new Error(`Duplicate IDs found: expected ${ids.length} unique IDs, got ${uniqueIds.size}`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
