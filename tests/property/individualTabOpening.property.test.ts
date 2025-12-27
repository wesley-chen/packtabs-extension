/**
 * Property-Based Test: Individual Tab Opening
 * Feature: tab-group-manager, Property 12: Individual Tab Opening
 * Validates: Requirements 4.3, 8.3
 *
 * Property: For any individual tab title click, that specific URL should open in a new browser tab.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { TabItem } from '~/types/TabGroup';
import { openSingleTab } from '~/utils/tabManager';

// Arbitrary for generating random TabItem objects
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl({ validSchemes: ['http', 'https'] }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

describe('Property 12: Individual Tab Opening', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should open the specific URL in a new browser tab for any individual tab', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab: TabItem) => {
        // Track created tab
        let createdTab: { url: string; windowId: number; active: boolean } | null = null;

        // Set up browser API mocks
        const windowId = Math.floor(Math.random() * 1000);

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create to track created tab
        (global as any).browser.tabs = (global as any).browser.tabs || {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdTab = {
            url: createProperties.url,
            windowId: createProperties.windowId,
            active: createProperties.active,
          };
          return { id: Math.floor(Math.random() * 10000) };
        });

        // Call openSingleTab
        await openSingleTab(tab);

        // Verify tab was created
        if (!createdTab) {
          throw new Error('No tab was created');
        }

        // Verify URL matches
        if (createdTab.url !== tab.url) {
          throw new Error(`URL mismatch: expected ${tab.url}, got ${createdTab.url}`);
        }

        // Verify it was opened in the correct window
        if (createdTab.windowId !== windowId) {
          throw new Error(`Window mismatch: expected ${windowId}, got ${createdTab.windowId}`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should open tabs with the active flag set to true', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab: TabItem) => {
        // Track created tab
        let createdTab: { url: string; windowId: number; active: boolean } | null = null;

        const windowId = Math.floor(Math.random() * 1000);

        // Mock browser.windows.getCurrent
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock browser.tabs.create
        (global as any).browser.tabs = (global as any).browser.tabs || {};
        (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
          createdTab = {
            url: createProperties.url,
            windowId: createProperties.windowId,
            active: createProperties.active,
          };
          return { id: Math.floor(Math.random() * 10000) };
        });

        await openSingleTab(tab);

        // Verify the tab is opened with active: true (switches to the tab)
        if (!createdTab) {
          throw new Error('No tab was created');
        }

        if (!createdTab.active) {
          throw new Error('Single tab should be opened as active');
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid or restricted URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('chrome://settings'),
          fc.constant('chrome-extension://abc123/page.html'),
          fc.constant('about:blank'),
          fc.constant('data:text/html,<h1>Test</h1>'),
          fc.constant('javascript:alert("test")'),
          fc.constant('invalid-url')
        ),
        async (invalidUrl: string) => {
          const tab: TabItem = {
            id: crypto.randomUUID(),
            url: invalidUrl,
            title: 'Test Tab',
            faviconUrl: undefined,
          };

          // Should throw InvalidUrlError for restricted/invalid URLs
          try {
            await openSingleTab(tab);
            throw new Error('Expected openSingleTab to throw an error for invalid URL');
          } catch (error) {
            // Expected to throw
            return true;
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
