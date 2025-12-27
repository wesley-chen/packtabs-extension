import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { TabGroup } from '../../types/TabGroup';
import {
  saveTabGroup,
  getTabGroups,
  updateTabGroup,
  deleteTabFromGroup,
} from '../../utils/storage';
import { tabGroupsStorage } from '../../types/Storage';

/**
 * Feature: tab-group-manager, Property 10: Group Operation Isolation
 * 
 * For any operation on a specific tab group (adding, removing, or modifying tabs),
 * other tab groups should remain completely unaffected.
 * 
 * Validates: Requirements 3.5, 8.2
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
  tabs: fc.array(tabItemArbitrary, { minLength: 2, maxLength: 10 }),
  isHistory: fc.boolean(),
}).filter(group => !isNaN(group.createdAt.getTime()));

describe('Group Operation Isolation Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 10.1: Updating one group does not affect other groups', async () => {
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
        fc.string({ minLength: 1, maxLength: 50 }),
        async (groups, newName) => {
          // Save all groups
          for (const group of groups) {
            await saveTabGroup(group);
          }

          // Take a snapshot of all groups before modification
          const beforeUpdate = await getTabGroups();
          
          // Pick the first group to update
          const targetGroup = groups[0];
          const otherGroups = groups.slice(1);

          // Update the target group's name
          await updateTabGroup(targetGroup.id, { name: newName });

          // Retrieve all groups after update
          const afterUpdate = await getTabGroups();

          // Verify the target group was updated
          const updatedTarget = afterUpdate.find(g => g.id === targetGroup.id);
          if (!updatedTarget) {
            throw new Error(`Target group ${targetGroup.id} not found after update`);
          }
          if (updatedTarget.name !== newName) {
            throw new Error(`Target group name not updated: expected ${newName}, got ${updatedTarget.name}`);
          }

          // Verify all other groups remain unchanged
          for (const otherGroup of otherGroups) {
            const beforeGroup = beforeUpdate.find(g => g.id === otherGroup.id);
            const afterGroup = afterUpdate.find(g => g.id === otherGroup.id);

            if (!beforeGroup || !afterGroup) {
              throw new Error(`Group ${otherGroup.id} missing before or after update`);
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

  it('Property 10.2: Deleting a tab from one group does not affect other groups', async () => {
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

          // Take a snapshot of all groups before modification
          const beforeDelete = await getTabGroups();
          
          // Pick the first group and delete its first tab
          const targetGroup = groups[0];
          const tabToDelete = targetGroup.tabs[0];
          const otherGroups = groups.slice(1);

          // Delete the tab from the target group
          await deleteTabFromGroup(targetGroup.id, tabToDelete.id);

          // Retrieve all groups after deletion
          const afterDelete = await getTabGroups();

          // Verify the target group had the tab removed
          const updatedTarget = afterDelete.find(g => g.id === targetGroup.id);
          if (!updatedTarget) {
            throw new Error(`Target group ${targetGroup.id} not found after tab deletion`);
          }
          if (updatedTarget.tabs.length !== targetGroup.tabs.length - 1) {
            throw new Error(`Target group tab count incorrect after deletion`);
          }
          if (updatedTarget.tabs.some(t => t.id === tabToDelete.id)) {
            throw new Error(`Deleted tab ${tabToDelete.id} still exists in target group`);
          }

          // Verify all other groups remain completely unchanged
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
              throw new Error(`Group ${otherGroup.id} tabs count changed from ${beforeGroup.tabs.length} to ${afterGroup.tabs.length}`);
            }

            // Verify every single tab is identical
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
              if (afterTab.faviconUrl !== beforeTab.faviconUrl) {
                throw new Error(`Group ${otherGroup.id} tab ${i} faviconUrl changed`);
              }
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10.3: Converting a group to named does not affect other groups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.constant(null), // Start as history groups
            createdAt: validDateArbitrary,
            tabs: fc.array(tabItemArbitrary, { minLength: 2, maxLength: 10 }),
            isHistory: fc.constant(true), // All start as history
          }),
          { minLength: 3, maxLength: 5 }
        ).chain(groups => {
          // Ensure all groups have unique IDs
          const uniqueGroups = groups.map((group, index) => ({
            ...group,
            id: `group-${index}-${group.id}`,
          }));
          return fc.constant(uniqueGroups);
        }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (groups, newName) => {
          // Save all groups as history groups
          for (const group of groups) {
            await saveTabGroup(group);
          }

          // Take a snapshot of all groups before conversion
          const beforeConversion = await getTabGroups();
          
          // Pick the first group to convert
          const targetGroup = groups[0];
          const otherGroups = groups.slice(1);

          // Convert the target group to named
          await updateTabGroup(targetGroup.id, { name: newName, isHistory: false });

          // Retrieve all groups after conversion
          const afterConversion = await getTabGroups();

          // Verify the target group was converted
          const convertedTarget = afterConversion.find(g => g.id === targetGroup.id);
          if (!convertedTarget) {
            throw new Error(`Target group ${targetGroup.id} not found after conversion`);
          }
          if (convertedTarget.name !== newName) {
            throw new Error(`Target group name not updated: expected ${newName}, got ${convertedTarget.name}`);
          }
          if (convertedTarget.isHistory) {
            throw new Error(`Target group isHistory not updated to false`);
          }

          // Verify all other groups remain unchanged (still history groups)
          for (const otherGroup of otherGroups) {
            const beforeGroup = beforeConversion.find(g => g.id === otherGroup.id);
            const afterGroup = afterConversion.find(g => g.id === otherGroup.id);

            if (!beforeGroup || !afterGroup) {
              throw new Error(`Group ${otherGroup.id} missing before or after conversion`);
            }

            // Check all fields remain the same
            if (afterGroup.name !== beforeGroup.name) {
              throw new Error(`Group ${otherGroup.id} name changed unexpectedly from ${beforeGroup.name} to ${afterGroup.name}`);
            }
            if (afterGroup.isHistory !== beforeGroup.isHistory) {
              throw new Error(`Group ${otherGroup.id} isHistory changed unexpectedly from ${beforeGroup.isHistory} to ${afterGroup.isHistory}`);
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
});
