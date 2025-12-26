import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { TabGroup, TabItem } from '../../types/TabGroup';
import {
  saveTabGroup,
  getTabGroups,
  deleteTabFromGroup,
} from '../../utils/storage';
import { tabGroupsStorage } from '../../types/Storage';

/**
 * Feature: tab-group-manager, Property 19: Individual Tab Deletion Precision
 * 
 * For any tab deletion within a group, only that specific tab should be removed
 * while all other tabs in the group remain unchanged.
 * 
 * Validates: Requirements 8.1
 */

// Arbitraries for generating random test data
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

const validDateArbitrary = fc.date({ min: new Date('1970-01-01'), max: new Date('2100-01-01') })
  .filter(date => !isNaN(date.getTime()));

const tabGroupArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  createdAt: validDateArbitrary,
  tabs: fc.array(tabItemArbitrary, { minLength: 3, maxLength: 20 }), // At least 3 tabs for meaningful testing
  isHistory: fc.boolean(),
}).filter(group => !isNaN(group.createdAt.getTime()));

describe('Individual Tab Deletion Precision Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 19.1: Deleting a specific tab removes only that tab', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        fc.integer({ min: 0, max: 100 }), // Random index selector
        async (group, indexSelector) => {
          // Save the group
          await saveTabGroup(group);

          // Select a tab to delete (use modulo to ensure valid index)
          const tabIndexToDelete = indexSelector % group.tabs.length;
          const tabToDelete = group.tabs[tabIndexToDelete];
          const expectedRemainingTabs = group.tabs.filter(t => t.id !== tabToDelete.id);

          // Delete the specific tab
          await deleteTabFromGroup(group.id, tabToDelete.id);

          // Retrieve the group after deletion
          const retrieved = await getTabGroups();
          const updatedGroup = retrieved.find(g => g.id === group.id);

          if (!updatedGroup) {
            throw new Error(`Group ${group.id} not found after tab deletion`);
          }

          // Verify the deleted tab is gone
          const deletedTabStillExists = updatedGroup.tabs.some(t => t.id === tabToDelete.id);
          if (deletedTabStillExists) {
            throw new Error(`Deleted tab ${tabToDelete.id} still exists in group`);
          }

          // Verify the correct number of tabs remain
          if (updatedGroup.tabs.length !== expectedRemainingTabs.length) {
            throw new Error(
              `Expected ${expectedRemainingTabs.length} tabs after deletion, but found ${updatedGroup.tabs.length}`
            );
          }

          // Verify all remaining tabs are present and unchanged
          for (const expectedTab of expectedRemainingTabs) {
            const foundTab = updatedGroup.tabs.find(t => t.id === expectedTab.id);
            
            if (!foundTab) {
              throw new Error(`Expected tab ${expectedTab.id} not found after deletion`);
            }

            // Verify tab data is completely unchanged
            if (foundTab.url !== expectedTab.url) {
              throw new Error(
                `Tab ${expectedTab.id} URL changed: expected ${expectedTab.url}, got ${foundTab.url}`
              );
            }
            if (foundTab.title !== expectedTab.title) {
              throw new Error(
                `Tab ${expectedTab.id} title changed: expected ${expectedTab.title}, got ${foundTab.title}`
              );
            }
            if (foundTab.faviconUrl !== expectedTab.faviconUrl) {
              throw new Error(
                `Tab ${expectedTab.id} faviconUrl changed: expected ${expectedTab.faviconUrl}, got ${foundTab.faviconUrl}`
              );
            }
          }

          // Verify group metadata is unchanged
          if (updatedGroup.name !== group.name) {
            throw new Error(`Group name changed after tab deletion`);
          }
          if (updatedGroup.isHistory !== group.isHistory) {
            throw new Error(`Group isHistory changed after tab deletion`);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19.2: Deleting first tab preserves all other tabs', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (group) => {
        // Save the group
        await saveTabGroup(group);

        // Delete the first tab
        const firstTab = group.tabs[0];
        const expectedRemainingTabs = group.tabs.slice(1);

        await deleteTabFromGroup(group.id, firstTab.id);

        // Retrieve and verify
        const retrieved = await getTabGroups();
        const updatedGroup = retrieved.find(g => g.id === group.id);

        if (!updatedGroup) {
          throw new Error(`Group ${group.id} not found after deletion`);
        }

        // Verify first tab is gone
        if (updatedGroup.tabs.some(t => t.id === firstTab.id)) {
          throw new Error(`First tab ${firstTab.id} still exists`);
        }

        // Verify all other tabs remain in correct order
        if (updatedGroup.tabs.length !== expectedRemainingTabs.length) {
          throw new Error(
            `Expected ${expectedRemainingTabs.length} tabs, got ${updatedGroup.tabs.length}`
          );
        }

        for (let i = 0; i < expectedRemainingTabs.length; i++) {
          const expected = expectedRemainingTabs[i];
          const actual = updatedGroup.tabs[i];

          if (actual.id !== expected.id) {
            throw new Error(`Tab at position ${i} has wrong ID: expected ${expected.id}, got ${actual.id}`);
          }
          if (actual.url !== expected.url) {
            throw new Error(`Tab ${expected.id} URL changed`);
          }
          if (actual.title !== expected.title) {
            throw new Error(`Tab ${expected.id} title changed`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 19.3: Deleting last tab preserves all other tabs', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (group) => {
        // Save the group
        await saveTabGroup(group);

        // Delete the last tab
        const lastTab = group.tabs[group.tabs.length - 1];
        const expectedRemainingTabs = group.tabs.slice(0, -1);

        await deleteTabFromGroup(group.id, lastTab.id);

        // Retrieve and verify
        const retrieved = await getTabGroups();
        const updatedGroup = retrieved.find(g => g.id === group.id);

        if (!updatedGroup) {
          throw new Error(`Group ${group.id} not found after deletion`);
        }

        // Verify last tab is gone
        if (updatedGroup.tabs.some(t => t.id === lastTab.id)) {
          throw new Error(`Last tab ${lastTab.id} still exists`);
        }

        // Verify all other tabs remain in correct order
        if (updatedGroup.tabs.length !== expectedRemainingTabs.length) {
          throw new Error(
            `Expected ${expectedRemainingTabs.length} tabs, got ${updatedGroup.tabs.length}`
          );
        }

        for (let i = 0; i < expectedRemainingTabs.length; i++) {
          const expected = expectedRemainingTabs[i];
          const actual = updatedGroup.tabs[i];

          if (actual.id !== expected.id) {
            throw new Error(`Tab at position ${i} has wrong ID`);
          }
          if (actual.url !== expected.url) {
            throw new Error(`Tab ${expected.id} URL changed`);
          }
          if (actual.title !== expected.title) {
            throw new Error(`Tab ${expected.id} title changed`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 19.4: Deleting middle tab preserves order of remaining tabs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
          createdAt: validDateArbitrary,
          tabs: fc.array(tabItemArbitrary, { minLength: 5, maxLength: 20 }), // At least 5 for meaningful middle
          isHistory: fc.boolean(),
        }).filter(group => !isNaN(group.createdAt.getTime())),
        async (group) => {
          // Save the group
          await saveTabGroup(group);

          // Delete a middle tab (not first or last)
          const middleIndex = Math.floor(group.tabs.length / 2);
          const middleTab = group.tabs[middleIndex];
          const expectedRemainingTabs = group.tabs.filter(t => t.id !== middleTab.id);

          await deleteTabFromGroup(group.id, middleTab.id);

          // Retrieve and verify
          const retrieved = await getTabGroups();
          const updatedGroup = retrieved.find(g => g.id === group.id);

          if (!updatedGroup) {
            throw new Error(`Group ${group.id} not found after deletion`);
          }

          // Verify middle tab is gone
          if (updatedGroup.tabs.some(t => t.id === middleTab.id)) {
            throw new Error(`Middle tab ${middleTab.id} still exists`);
          }

          // Verify remaining tabs maintain their relative order
          if (updatedGroup.tabs.length !== expectedRemainingTabs.length) {
            throw new Error(
              `Expected ${expectedRemainingTabs.length} tabs, got ${updatedGroup.tabs.length}`
            );
          }

          for (let i = 0; i < expectedRemainingTabs.length; i++) {
            const expected = expectedRemainingTabs[i];
            const actual = updatedGroup.tabs[i];

            if (actual.id !== expected.id) {
              throw new Error(
                `Tab order changed: position ${i} expected ${expected.id}, got ${actual.id}`
              );
            }
            if (actual.url !== expected.url || actual.title !== expected.title) {
              throw new Error(`Tab ${expected.id} data changed`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19.5: Multiple sequential deletions maintain precision', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
          createdAt: validDateArbitrary,
          tabs: fc.array(tabItemArbitrary, { minLength: 5, maxLength: 10 }), // Enough tabs for multiple deletions
          isHistory: fc.boolean(),
        }).filter(group => !isNaN(group.createdAt.getTime())),
        fc.integer({ min: 2, max: 3 }), // Number of tabs to delete
        async (group, numToDelete) => {
          // Save the group
          await saveTabGroup(group);

          // Ensure we don't try to delete more tabs than exist
          const actualNumToDelete = Math.min(numToDelete, group.tabs.length - 1);
          
          // Track which tabs we're deleting
          const tabsToDelete = group.tabs.slice(0, actualNumToDelete);
          const expectedRemainingTabs = group.tabs.slice(actualNumToDelete);

          // Delete tabs one by one
          for (const tab of tabsToDelete) {
            await deleteTabFromGroup(group.id, tab.id);
          }

          // Retrieve and verify final state
          const retrieved = await getTabGroups();
          const updatedGroup = retrieved.find(g => g.id === group.id);

          if (!updatedGroup) {
            throw new Error(`Group ${group.id} not found after deletions`);
          }

          // Verify all deleted tabs are gone
          for (const deletedTab of tabsToDelete) {
            if (updatedGroup.tabs.some(t => t.id === deletedTab.id)) {
              throw new Error(`Deleted tab ${deletedTab.id} still exists`);
            }
          }

          // Verify correct number of tabs remain
          if (updatedGroup.tabs.length !== expectedRemainingTabs.length) {
            throw new Error(
              `Expected ${expectedRemainingTabs.length} tabs, got ${updatedGroup.tabs.length}`
            );
          }

          // Verify all remaining tabs are intact and in order
          for (let i = 0; i < expectedRemainingTabs.length; i++) {
            const expected = expectedRemainingTabs[i];
            const actual = updatedGroup.tabs[i];

            if (actual.id !== expected.id) {
              throw new Error(`Tab order changed at position ${i}`);
            }
            if (actual.url !== expected.url || actual.title !== expected.title) {
              throw new Error(`Tab ${expected.id} data changed after deletions`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
