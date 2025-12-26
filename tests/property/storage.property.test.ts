import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { TabGroup, TabItem } from '../../types/TabGroup';
import {
  saveTabGroup,
  getTabGroups,
  updateTabGroup,
  deleteTabGroup,
  deleteTabFromGroup,
} from '../../utils/storage';
import { tabGroupsStorage } from '../../types/Storage';

/**
 * Feature: tab-group-manager, Property 2: Tab Group Data Persistence
 * 
 * For any tab group operation (save, update, delete, individual tab modification),
 * the changes should be persisted using Chrome Storage Sync and be retrievable
 * in subsequent operations.
 * 
 * Validates: Requirements 1.5, 2.4, 7.1, 8.4
 */

// Arbitraries for generating random test data
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

// Generate valid dates only (not NaN)
const validDateArbitrary = fc.date({ min: new Date('1970-01-01'), max: new Date('2100-01-01') })
  .filter(date => !isNaN(date.getTime()));

const tabGroupArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  createdAt: validDateArbitrary,
  tabs: fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }),
  isHistory: fc.boolean(),
}).filter(group => !isNaN(group.createdAt.getTime())); // Extra safety check

describe('Storage Persistence Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test using WXT storage API
    await tabGroupsStorage.setValue({});
  });

  it('Property 2.1: Save then retrieve preserves tab group data', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (group) => {
        // Save the group
        await saveTabGroup(group);

        // Retrieve all groups
        const retrieved = await getTabGroups();

        // Find the saved group
        const found = retrieved.find((g) => g.id === group.id);

        // Assertions
        if (!found) {
          throw new Error(`Group ${group.id} not found after save`);
        }

        // Verify all fields match
        if (found.id !== group.id) {
          throw new Error(`ID mismatch: expected ${group.id}, got ${found.id}`);
        }
        if (found.name !== group.name) {
          throw new Error(`Name mismatch: expected ${group.name}, got ${found.name}`);
        }
        if (found.isHistory !== group.isHistory) {
          throw new Error(`isHistory mismatch: expected ${group.isHistory}, got ${found.isHistory}`);
        }
        if (found.tabs.length !== group.tabs.length) {
          throw new Error(`Tabs length mismatch: expected ${group.tabs.length}, got ${found.tabs.length}`);
        }

        // Verify createdAt is preserved (allowing for millisecond precision)
        const timeDiff = Math.abs(found.createdAt.getTime() - group.createdAt.getTime());
        if (timeDiff > 1) {
          throw new Error(`CreatedAt mismatch: expected ${group.createdAt.toISOString()}, got ${found.createdAt.toISOString()}`);
        }

        // Verify each tab
        for (let i = 0; i < group.tabs.length; i++) {
          const originalTab = group.tabs[i];
          const retrievedTab = found.tabs[i];

          if (retrievedTab.id !== originalTab.id) {
            throw new Error(`Tab ${i} ID mismatch`);
          }
          if (retrievedTab.url !== originalTab.url) {
            throw new Error(`Tab ${i} URL mismatch`);
          }
          if (retrievedTab.title !== originalTab.title) {
            throw new Error(`Tab ${i} title mismatch`);
          }
          if (retrievedTab.faviconUrl !== originalTab.faviconUrl) {
            throw new Error(`Tab ${i} faviconUrl mismatch`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2.2: Update operation persists changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (group, newName) => {
          // Save initial group
          await saveTabGroup(group);

          // Update the group name
          await updateTabGroup(group.id, { name: newName });

          // Retrieve and verify
          const retrieved = await getTabGroups();
          const found = retrieved.find((g) => g.id === group.id);

          if (!found) {
            throw new Error(`Group ${group.id} not found after update`);
          }

          if (found.name !== newName) {
            throw new Error(`Name not updated: expected ${newName}, got ${found.name}`);
          }

          // Verify other fields remain unchanged
          if (found.id !== group.id) {
            throw new Error(`ID changed after update`);
          }
          if (found.isHistory !== group.isHistory) {
            throw new Error(`isHistory changed after update`);
          }
          if (found.tabs.length !== group.tabs.length) {
            throw new Error(`Tabs changed after name update`);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2.3: Delete operation removes group from storage', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (group) => {
        // Save the group
        await saveTabGroup(group);

        // Verify it exists
        let retrieved = await getTabGroups();
        let found = retrieved.find((g) => g.id === group.id);
        if (!found) {
          throw new Error(`Group ${group.id} not found after save`);
        }

        // Delete the group
        await deleteTabGroup(group.id);

        // Verify it's gone
        retrieved = await getTabGroups();
        found = retrieved.find((g) => g.id === group.id);
        if (found) {
          throw new Error(`Group ${group.id} still exists after delete`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2.4: Individual tab deletion persists correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
          createdAt: validDateArbitrary,
          tabs: fc.array(tabItemArbitrary, { minLength: 2, maxLength: 20 }), // At least 2 tabs
          isHistory: fc.boolean(),
        }),
        async (group) => {
          // Save the group
          await saveTabGroup(group);

          // Pick a random tab to delete (first one for consistency)
          const tabToDelete = group.tabs[0];
          const remainingTabs = group.tabs.slice(1);

          // Delete the tab
          await deleteTabFromGroup(group.id, tabToDelete.id);

          // Retrieve and verify
          const retrieved = await getTabGroups();
          const found = retrieved.find((g) => g.id === group.id);

          if (!found) {
            throw new Error(`Group ${group.id} not found after tab deletion`);
          }

          // Verify the tab was removed
          if (found.tabs.length !== remainingTabs.length) {
            throw new Error(
              `Tab count mismatch: expected ${remainingTabs.length}, got ${found.tabs.length}`
            );
          }

          // Verify the deleted tab is not present
          const deletedTabStillExists = found.tabs.some((t) => t.id === tabToDelete.id);
          if (deletedTabStillExists) {
            throw new Error(`Deleted tab ${tabToDelete.id} still exists in group`);
          }

          // Verify remaining tabs are intact
          for (const remainingTab of remainingTabs) {
            const foundTab = found.tabs.find((t) => t.id === remainingTab.id);
            if (!foundTab) {
              throw new Error(`Remaining tab ${remainingTab.id} not found after deletion`);
            }
            if (foundTab.url !== remainingTab.url || foundTab.title !== remainingTab.title) {
              throw new Error(`Remaining tab ${remainingTab.id} data corrupted`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2.5: Multiple save operations maintain data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(tabGroupArbitrary, { minLength: 2, maxLength: 10 })
          .chain(groups => {
            // Ensure all groups have unique IDs
            const uniqueGroups = groups.map((group, index) => ({
              ...group,
              id: `${group.id}-${index}` // Make IDs unique
            }));
            return fc.constant(uniqueGroups);
          }),
        async (groups) => {
          // Clear storage at the start of this test
          await tabGroupsStorage.setValue({});
          
          // Save all groups
          for (const group of groups) {
            await saveTabGroup(group);
          }

          // Retrieve all groups
          const retrieved = await getTabGroups();

          // Verify all groups are present
          if (retrieved.length !== groups.length) {
            throw new Error(
              `Group count mismatch: expected ${groups.length}, got ${retrieved.length}`
            );
          }

          // Verify each group
          for (const originalGroup of groups) {
            const found = retrieved.find((g) => g.id === originalGroup.id);
            if (!found) {
              throw new Error(`Group ${originalGroup.id} not found`);
            }

            // Basic integrity checks
            if (found.name !== originalGroup.name) {
              throw new Error(`Group ${originalGroup.id} name mismatch`);
            }
            if (found.tabs.length !== originalGroup.tabs.length) {
              throw new Error(`Group ${originalGroup.id} tabs count mismatch`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
