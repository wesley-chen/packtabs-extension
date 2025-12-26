import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { TabGroup } from '../../types/TabGroup';
import {
  saveTabGroup,
  getTabGroups,
  deleteTabGroup,
} from '../../utils/storage';
import { tabGroupsStorage } from '../../types/Storage';

/**
 * Feature: tab-group-manager, Property 9: Complete Group Deletion
 * 
 * For any tab group deletion operation, all associated data should be completely
 * removed from storage and the group should no longer appear in any UI lists.
 * 
 * Validates: Requirements 3.4
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
  tabs: fc.array(tabItemArbitrary, { minLength: 1, maxLength: 10 }),
  isHistory: fc.boolean(),
}).filter(group => !isNaN(group.createdAt.getTime()));

describe('Complete Group Deletion Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 9.1: Deleted group is completely removed from storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        async (group) => {
          // Save the group
          await saveTabGroup(group);

          // Verify it exists
          const beforeDelete = await getTabGroups();
          const existsBefore = beforeDelete.some(g => g.id === group.id);
          if (!existsBefore) {
            throw new Error(`Group ${group.id} not found after saving`);
          }

          // Delete the group
          await deleteTabGroup(group.id);

          // Verify it no longer exists
          const afterDelete = await getTabGroups();
          const existsAfter = afterDelete.some(g => g.id === group.id);
          
          if (existsAfter) {
            throw new Error(`Group ${group.id} still exists after deletion`);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9.2: Deleting a group removes all associated data', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        async (group) => {
          // Save the group
          await saveTabGroup(group);

          // Delete the group
          await deleteTabGroup(group.id);

          // Verify no data remains
          const allGroups = await getTabGroups();
          
          // Check that no group with this ID exists
          const deletedGroup = allGroups.find(g => g.id === group.id);
          if (deletedGroup) {
            throw new Error(`Deleted group ${group.id} still has data in storage`);
          }

          // Check that none of the tabs from the deleted group exist in any other group
          // (This ensures we didn't accidentally move tabs to another group)
          const allTabIds = allGroups.flatMap(g => g.tabs.map(t => t.id));
          const deletedTabIds = group.tabs.map(t => t.id);
          
          for (const deletedTabId of deletedTabIds) {
            if (allTabIds.includes(deletedTabId)) {
              throw new Error(`Tab ${deletedTabId} from deleted group still exists in storage`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9.3: Deleting one group does not affect other groups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(tabGroupArbitrary, { minLength: 3, maxLength: 5 })
          .chain(groups => {
            // Ensure all groups have unique IDs
            const uniqueGroups = groups.map((group, index) => ({
              ...group,
              id: `group-${index}-${group.id}`,
            }));
            return fc.constant(uniqueGroups);
          }),
        async (groups) => {
          // Save all groups
          for (const group of groups) {
            await saveTabGroup(group);
          }

          // Take a snapshot of all groups before deletion
          const beforeDelete = await getTabGroups();
          
          // Pick the first group to delete
          const targetGroup = groups[0];
          const otherGroups = groups.slice(1);

          // Delete the target group
          await deleteTabGroup(targetGroup.id);

          // Retrieve all groups after deletion
          const afterDelete = await getTabGroups();

          // Verify the target group is gone
          const deletedGroupExists = afterDelete.some(g => g.id === targetGroup.id);
          if (deletedGroupExists) {
            throw new Error(`Deleted group ${targetGroup.id} still exists`);
          }

          // Verify all other groups remain unchanged
          for (const otherGroup of otherGroups) {
            const beforeGroup = beforeDelete.find(g => g.id === otherGroup.id);
            const afterGroup = afterDelete.find(g => g.id === otherGroup.id);

            if (!beforeGroup || !afterGroup) {
              throw new Error(`Group ${otherGroup.id} missing before or after deletion`);
            }

            // Check all fields remain the same
            if (afterGroup.name !== beforeGroup.name) {
              throw new Error(`Group ${otherGroup.id} name changed unexpectedly`);
            }
            if (afterGroup.isHistory !== beforeGroup.isHistory) {
              throw new Error(`Group ${otherGroup.id} isHistory changed unexpectedly`);
            }
            if (afterGroup.tabs.length !== beforeGroup.tabs.length) {
              throw new Error(`Group ${otherGroup.id} tabs count changed unexpectedly`);
            }

            // Verify tabs are identical
            for (let i = 0; i < beforeGroup.tabs.length; i++) {
              const beforeTab = beforeGroup.tabs[i];
              const afterTab = afterGroup.tabs[i];

              if (afterTab.id !== beforeTab.id) {
                throw new Error(`Group ${otherGroup.id} tab ${i} ID changed`);
              }
              if (afterTab.url !== beforeTab.url) {
                throw new Error(`Group ${otherGroup.id} tab ${i} URL changed`);
              }
              if (afterTab.title !== beforeTab.title) {
                throw new Error(`Group ${otherGroup.id} tab ${i} title changed`);
              }
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9.4: Deletion is idempotent - deleting non-existent group throws error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (nonExistentId) => {
          // Ensure the ID doesn't exist by using a unique prefix
          const uniqueId = `nonexistent-${nonExistentId}`;
          
          // Attempt to delete non-existent group should throw error
          let errorThrown = false;
          try {
            await deleteTabGroup(uniqueId);
          } catch (error) {
            errorThrown = true;
            // Verify it's the expected error
            if (error instanceof Error && !error.message.includes('not found')) {
              throw new Error(`Unexpected error message: ${error.message}`);
            }
          }

          if (!errorThrown) {
            throw new Error('Deleting non-existent group should throw an error');
          }

          return true;
        }
      ),
      { numRuns: 20 } // Reduced runs since each failure triggers retry logic
    );
  }, 30000); // 30 second timeout for this test due to retry logic

  it('Property 9.5: Multiple sequential deletions work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(tabGroupArbitrary, { minLength: 3, maxLength: 5 })
          .chain(groups => {
            // Ensure all groups have unique IDs
            const uniqueGroups = groups.map((group, index) => ({
              ...group,
              id: `group-${index}-${group.id}`,
            }));
            return fc.constant(uniqueGroups);
          }),
        async (groups) => {
          // Save all groups
          for (const group of groups) {
            await saveTabGroup(group);
          }

          // Verify all groups exist
          let currentGroups = await getTabGroups();
          if (currentGroups.length !== groups.length) {
            throw new Error(`Expected ${groups.length} groups, found ${currentGroups.length}`);
          }

          // Delete groups one by one
          for (let i = 0; i < groups.length; i++) {
            const groupToDelete = groups[i];
            
            // Delete the group
            await deleteTabGroup(groupToDelete.id);

            // Verify the count decreased by 1
            currentGroups = await getTabGroups();
            const expectedCount = groups.length - (i + 1);
            
            if (currentGroups.length !== expectedCount) {
              throw new Error(`After deleting ${i + 1} groups, expected ${expectedCount} remaining, found ${currentGroups.length}`);
            }

            // Verify the deleted group is gone
            const stillExists = currentGroups.some(g => g.id === groupToDelete.id);
            if (stillExists) {
              throw new Error(`Group ${groupToDelete.id} still exists after deletion`);
            }

            // Verify remaining groups are the ones we haven't deleted yet
            const remainingIds = groups.slice(i + 1).map(g => g.id);
            for (const remainingId of remainingIds) {
              const exists = currentGroups.some(g => g.id === remainingId);
              if (!exists) {
                throw new Error(`Group ${remainingId} was unexpectedly deleted`);
              }
            }
          }

          // Verify storage is empty
          const finalGroups = await getTabGroups();
          if (finalGroups.length !== 0) {
            throw new Error(`Expected empty storage, found ${finalGroups.length} groups`);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
