import { describe, it, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { captureCurrentWindow, openTabs } from '../../utils/tabManager';

/**
 * Feature: tab-group-manager, Property 13: Tab Data Round-Trip Integrity
 * 
 * For any tab group, saving then restoring should preserve all original
 * page titles and URLs exactly.
 * 
 * Validates: Requirements 4.4
 */

// Arbitrary for generating random browser tabs
const browserTabArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  favIconUrl: fc.option(fc.webUrl(), { nil: undefined }),
  windowId: fc.constant(1),
  index: fc.integer({ min: 0, max: 100 }),
  pinned: fc.boolean(),
  highlighted: fc.boolean(),
  active: fc.boolean(),
  incognito: fc.boolean(),
});

describe('Round-Trip Integrity Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('Property 13.1: Capture then restore preserves URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(browserTabArbitrary, { minLength: 1, maxLength: 20 }),
        async (originalBrowserTabs) => {
          const windowId = 1;
          
          // Track tabs created during restoration
          const restoredTabs: { url: string; windowId: number }[] = [];

          // Mock browser.windows.getCurrent
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
          
          // Mock browser.tabs.query for capture
          (global as any).browser.tabs = (global as any).browser.tabs || {};
          (global as any).browser.tabs.query = vi.fn().mockResolvedValue(originalBrowserTabs);

          // Capture tabs
          const capturedTabs = await captureCurrentWindow();

          // Mock browser.tabs.create for restoration
          (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
            restoredTabs.push({
              url: createProperties.url,
              windowId: createProperties.windowId,
            });
            return { id: restoredTabs.length };
          });

          // Restore tabs
          await openTabs(capturedTabs);

          // Verify all URLs are preserved
          if (restoredTabs.length !== originalBrowserTabs.length) {
            throw new Error(
              `Tab count mismatch: expected ${originalBrowserTabs.length}, got ${restoredTabs.length}`
            );
          }

          for (let i = 0; i < originalBrowserTabs.length; i++) {
            const originalUrl = originalBrowserTabs[i].url || '';
            const restoredUrl = restoredTabs[i].url;

            if (restoredUrl !== originalUrl) {
              throw new Error(
                `URL mismatch at position ${i}: expected ${originalUrl}, got ${restoredUrl}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13.2: Capture then restore preserves titles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(browserTabArbitrary, { minLength: 1, maxLength: 20 }),
        async (originalBrowserTabs) => {
          const windowId = 1;

          // Mock browser.windows.getCurrent
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
          
          // Mock browser.tabs.query for capture
          (global as any).browser.tabs = (global as any).browser.tabs || {};
          (global as any).browser.tabs.query = vi.fn().mockResolvedValue(originalBrowserTabs);

          // Capture tabs
          const capturedTabs = await captureCurrentWindow();

          // Verify titles are preserved in captured data
          for (let i = 0; i < originalBrowserTabs.length; i++) {
            const originalTitle = originalBrowserTabs[i].title || 'Untitled';
            const capturedTitle = capturedTabs[i].title;

            if (capturedTitle !== originalTitle) {
              throw new Error(
                `Title mismatch at position ${i}: expected ${originalTitle}, got ${capturedTitle}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13.3: Round-trip maintains data integrity for all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(browserTabArbitrary, { minLength: 1, maxLength: 20 }),
        async (originalBrowserTabs) => {
          const windowId = 1;
          
          // Track tabs created during restoration
          const restoredTabs: { url: string; windowId: number }[] = [];

          // Mock browser.windows.getCurrent
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
          
          // Mock browser.tabs.query for capture
          (global as any).browser.tabs = (global as any).browser.tabs || {};
          (global as any).browser.tabs.query = vi.fn().mockResolvedValue(originalBrowserTabs);

          // Capture tabs
          const capturedTabs = await captureCurrentWindow();

          // Verify captured data integrity
          if (capturedTabs.length !== originalBrowserTabs.length) {
            throw new Error(
              `Capture count mismatch: expected ${originalBrowserTabs.length}, got ${capturedTabs.length}`
            );
          }

          // Verify each captured tab has correct data
          for (let i = 0; i < originalBrowserTabs.length; i++) {
            const original = originalBrowserTabs[i];
            const captured = capturedTabs[i];

            // Verify URL
            const expectedUrl = original.url || '';
            if (captured.url !== expectedUrl) {
              throw new Error(
                `Captured URL mismatch at ${i}: expected ${expectedUrl}, got ${captured.url}`
              );
            }

            // Verify title
            const expectedTitle = original.title || 'Untitled';
            if (captured.title !== expectedTitle) {
              throw new Error(
                `Captured title mismatch at ${i}: expected ${expectedTitle}, got ${captured.title}`
              );
            }

            // Verify favicon
            if (captured.faviconUrl !== original.favIconUrl) {
              throw new Error(
                `Captured favicon mismatch at ${i}: expected ${original.favIconUrl}, got ${captured.faviconUrl}`
              );
            }

            // Verify each captured tab has a unique ID
            if (!captured.id || typeof captured.id !== 'string') {
              throw new Error(`Captured tab ${i} missing valid ID`);
            }
          }

          // Mock browser.tabs.create for restoration
          (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
            restoredTabs.push({
              url: createProperties.url,
              windowId: createProperties.windowId,
            });
            return { id: restoredTabs.length };
          });

          // Restore tabs
          await openTabs(capturedTabs);

          // Verify restoration preserves URLs
          if (restoredTabs.length !== capturedTabs.length) {
            throw new Error(
              `Restoration count mismatch: expected ${capturedTabs.length}, got ${restoredTabs.length}`
            );
          }

          for (let i = 0; i < capturedTabs.length; i++) {
            if (restoredTabs[i].url !== capturedTabs[i].url) {
              throw new Error(
                `Restored URL mismatch at ${i}: expected ${capturedTabs[i].url}, got ${restoredTabs[i].url}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13.4: Round-trip handles tabs with missing optional fields', async () => {
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
        async (originalBrowserTabs) => {
          const windowId = 1;
          
          // Track tabs created during restoration
          const restoredTabs: { url: string }[] = [];

          // Mock browser.windows.getCurrent
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
          
          // Mock browser.tabs.query for capture
          (global as any).browser.tabs = (global as any).browser.tabs || {};
          (global as any).browser.tabs.query = vi.fn().mockResolvedValue(originalBrowserTabs);

          // Capture tabs
          const capturedTabs = await captureCurrentWindow();

          // Filter out tabs that should be excluded (no URL or restricted protocols)
          const validTabs = originalBrowserTabs.filter(tab => {
            if (!tab.url) return false;
            try {
              const urlObj = new URL(tab.url);
              const restrictedProtocols = ['chrome:', 'chrome-extension:', 'about:'];
              return !restrictedProtocols.some(protocol => urlObj.protocol.startsWith(protocol));
            } catch {
              return false;
            }
          });

          // Mock browser.tabs.create for restoration
          (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
            restoredTabs.push({
              url: createProperties.url,
            });
            return { id: restoredTabs.length };
          });

          // Restore tabs
          await openTabs(capturedTabs);

          // Verify URLs are preserved (only valid tabs should be restored)
          if (restoredTabs.length !== validTabs.length) {
            throw new Error(
              `Tab count mismatch: expected ${validTabs.length}, got ${restoredTabs.length}`
            );
          }

          for (let i = 0; i < validTabs.length; i++) {
            const expectedUrl = validTabs[i].url;
            const restoredUrl = restoredTabs[i].url;

            if (restoredUrl !== expectedUrl) {
              throw new Error(
                `URL mismatch at ${i}: expected ${expectedUrl}, got ${restoredUrl}`
              );
            }
          }

          // Verify titles have defaults applied during capture
          for (let i = 0; i < originalBrowserTabs.length; i++) {
            const expectedTitle = originalBrowserTabs[i].title || 'Untitled';
            const capturedTitle = capturedTabs[i].title;

            if (capturedTitle !== expectedTitle) {
              throw new Error(
                `Title default not applied at ${i}: expected ${expectedTitle}, got ${capturedTitle}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13.5: Round-trip maintains tab order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(browserTabArbitrary, { minLength: 2, maxLength: 20 }),
        async (originalBrowserTabs) => {
          const windowId = 1;
          
          // Track tabs created during restoration in order
          const restoredUrls: string[] = [];

          // Mock browser.windows.getCurrent
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
          
          // Mock browser.tabs.query for capture
          (global as any).browser.tabs = (global as any).browser.tabs || {};
          (global as any).browser.tabs.query = vi.fn().mockResolvedValue(originalBrowserTabs);

          // Capture tabs
          const capturedTabs = await captureCurrentWindow();

          // Mock browser.tabs.create for restoration
          (global as any).browser.tabs.create = vi.fn().mockImplementation(async (createProperties) => {
            restoredUrls.push(createProperties.url);
            return { id: restoredUrls.length };
          });

          // Restore tabs
          await openTabs(capturedTabs);

          // Verify order is maintained
          for (let i = 0; i < originalBrowserTabs.length; i++) {
            const originalUrl = originalBrowserTabs[i].url || '';
            const restoredUrl = restoredUrls[i];

            if (restoredUrl !== originalUrl) {
              throw new Error(
                `Order not maintained at position ${i}: expected ${originalUrl}, got ${restoredUrl}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
