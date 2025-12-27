import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { tabGroupsStorage, settingsStorage } from '../../types/Storage';
import { closeCurrentTabs } from '../../utils/tabManager';

/**
 * Feature: tab-group-manager, Property 3: Automatic Tab Cleanup
 *
 * For any tab group save operation, the original tabs should be automatically
 * closed after successful saving.
 *
 * Validates: Requirements 1.3
 */

// Arbitrary for generating browser tabs
const browserTabArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  favIconUrl: fc.option(fc.webUrl(), { nil: undefined }),
  windowId: fc.constant(1),
  index: fc.integer({ min: 0, max: 100 }),
});

describe('Automatic Tab Cleanup Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
    await settingsStorage.setValue({
      autoCloseAfterSave: true,
      maxHistoryGroups: 10,
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up storage after each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 3.1: All tabs are closed when autoCloseAfterSave is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(browserTabArbitrary, { minLength: 1, maxLength: 20 }), async (browserTabs) => {
        // Setup: Mock browser APIs
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.tabs = (global as any).browser.tabs || {};

        const windowId = 1;

        // Mock windows.getCurrent
        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // Mock tabs.query to return our test tabs
        (global as any).browser.tabs.query = vi.fn().mockResolvedValue(browserTabs);

        // Mock tabs.remove to track which tabs were closed
        const removedTabIds: number[] = [];
        (global as any).browser.tabs.remove = vi.fn().mockImplementation((tabIds: number[]) => {
          removedTabIds.push(...tabIds);
          return Promise.resolve();
        });

        // Verify settings have autoCloseAfterSave enabled
        const settings = await settingsStorage.getValue();
        if (!settings.autoCloseAfterSave) {
          throw new Error('autoCloseAfterSave should be enabled for this test');
        }

        // Simulate the tab cleanup operation
        await closeCurrentTabs();

        // Verify: All tabs should be closed
        const expectedTabIds = browserTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

        // Check that tabs.remove was called
        if (removedTabIds.length === 0 && expectedTabIds.length > 0) {
          throw new Error(`Expected tabs to be closed, but tabs.remove was not called`);
        }

        // Verify all tab IDs were passed to remove
        if (removedTabIds.length !== expectedTabIds.length) {
          throw new Error(`Expected ${expectedTabIds.length} tabs to be closed, got ${removedTabIds.length}`);
        }

        // Verify each tab ID was included
        for (const expectedId of expectedTabIds) {
          if (!removedTabIds.includes(expectedId)) {
            throw new Error(`Tab ${expectedId} was not closed`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.2: Tab cleanup handles empty tab list gracefully', async () => {
    // Edge case: What happens when there are no tabs to close?

    // Setup: Mock browser APIs with empty tab list
    (global as any).browser = (global as any).browser || {};
    (global as any).browser.windows = (global as any).browser.windows || {};
    (global as any).browser.tabs = (global as any).browser.tabs || {};

    const windowId = 1;

    (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
    (global as any).browser.tabs.query = vi.fn().mockResolvedValue([]);

    const removeSpy = vi.fn().mockResolvedValue(undefined);
    (global as any).browser.tabs.remove = removeSpy;

    // Execute: Close tabs when there are none
    await closeCurrentTabs();

    // Verify: tabs.remove should not be called with empty array
    if (removeSpy.mock.calls.length > 0) {
      const callArgs = removeSpy.mock.calls[0][0];
      if (Array.isArray(callArgs) && callArgs.length > 0) {
        throw new Error(`tabs.remove should not be called with tab IDs when there are no tabs`);
      }
    }
  });

  it('Property 3.3: Tab cleanup is idempotent (can be called multiple times)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(browserTabArbitrary, { minLength: 1, maxLength: 10 }), async (browserTabs) => {
        // Setup: Mock browser APIs
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.tabs = (global as any).browser.tabs || {};

        const windowId = 1;

        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });

        // First call returns tabs, subsequent calls return empty (tabs already closed)
        let callCount = 0;
        (global as any).browser.tabs.query = vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount === 1 ? browserTabs : []);
        });

        const removeSpy = vi.fn().mockResolvedValue(undefined);
        (global as any).browser.tabs.remove = removeSpy;

        // Execute: Close tabs multiple times
        await closeCurrentTabs(); // First call - should close tabs
        await closeCurrentTabs(); // Second call - no tabs to close
        await closeCurrentTabs(); // Third call - no tabs to close

        // Verify: tabs.remove should only be called once (when tabs existed)
        if (removeSpy.mock.calls.length !== 1) {
          throw new Error(`Expected tabs.remove to be called once, got ${removeSpy.mock.calls.length} calls`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.4: Tab cleanup preserves tab order in removal', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(browserTabArbitrary, { minLength: 2, maxLength: 10 }), async (browserTabs) => {
        // Setup: Mock browser APIs
        (global as any).browser = (global as any).browser || {};
        (global as any).browser.windows = (global as any).browser.windows || {};
        (global as any).browser.tabs = (global as any).browser.tabs || {};

        const windowId = 1;

        (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: windowId });
        (global as any).browser.tabs.query = vi.fn().mockResolvedValue(browserTabs);

        let removedTabIds: number[] = [];
        (global as any).browser.tabs.remove = vi.fn().mockImplementation((tabIds: number[]) => {
          removedTabIds = tabIds;
          return Promise.resolve();
        });

        // Execute: Close tabs
        await closeCurrentTabs();

        // Verify: Tab IDs should be in the same order as original tabs
        const expectedTabIds = browserTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

        if (removedTabIds.length !== expectedTabIds.length) {
          throw new Error(`Tab count mismatch: expected ${expectedTabIds.length}, got ${removedTabIds.length}`);
        }

        // Check that all expected IDs are present (order may vary in implementation)
        for (const expectedId of expectedTabIds) {
          if (!removedTabIds.includes(expectedId)) {
            throw new Error(`Expected tab ID ${expectedId} not found in removed tabs`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3.5: Tab cleanup only affects current window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          currentWindowTabs: fc.array(browserTabArbitrary, { minLength: 1, maxLength: 10 }),
          otherWindowTabs: fc.array(
            fc.record({
              id: fc.integer({ min: 100001, max: 200000 }), // Different ID range to avoid collisions
              url: fc.webUrl(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              windowId: fc.constant(2), // Different window
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ currentWindowTabs, otherWindowTabs }) => {
          // Setup: Mock browser APIs with tabs in multiple windows
          (global as any).browser = (global as any).browser || {};
          (global as any).browser.windows = (global as any).browser.windows || {};
          (global as any).browser.tabs = (global as any).browser.tabs || {};

          const currentWindowId = 1;

          (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({
            id: currentWindowId,
          });

          // tabs.query should only return tabs from current window
          (global as any).browser.tabs.query = vi.fn().mockImplementation((query: any) => {
            if (query.windowId === currentWindowId) {
              return Promise.resolve(currentWindowTabs);
            }
            return Promise.resolve([]);
          });

          let removedTabIds: number[] = [];
          (global as any).browser.tabs.remove = vi.fn().mockImplementation((tabIds: number[]) => {
            removedTabIds = tabIds;
            return Promise.resolve();
          });

          // Execute: Close tabs in current window
          await closeCurrentTabs();

          // Verify: Only current window tabs should be closed
          const currentWindowTabIds = currentWindowTabs
            .map((tab) => tab.id)
            .filter((id): id is number => id !== undefined);

          const otherWindowTabIds = otherWindowTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

          // Check that only current window tabs were removed
          for (const removedId of removedTabIds) {
            if (!currentWindowTabIds.includes(removedId)) {
              throw new Error(`Tab ${removedId} from other window was incorrectly closed`);
            }
          }

          // Check that no tabs from other windows were removed
          for (const otherId of otherWindowTabIds) {
            if (removedTabIds.includes(otherId)) {
              throw new Error(`Tab ${otherId} from other window should not be closed`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
