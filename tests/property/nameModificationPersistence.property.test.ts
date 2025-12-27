/**
 * Property-Based Test: Name Modification Persistence
 * Feature: tab-group-manager, Property 8: Name Modification Persistence
 * Validates: Requirements 3.3
 *
 * Property: For any tab group name change, the modification should be immediately
 * persisted and reflected in the UI.
 */

import * as fc from 'fast-check';
import { beforeEach, describe, it, vi } from 'vitest';

import { tabGroupsStorage } from '~/types/Storage';
import type { TabGroup } from '~/types/TabGroup';
import { getTabGroups,updateTabGroup } from '~/utils/storage';

// Arbitrary for generating random TabGroup objects
const tabGroupArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  createdAt: fc.date(),
  tabs: fc.array(
    fc.record({
      id: fc.uuid(),
      url: fc.webUrl({ validSchemes: ['http', 'https'] }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 10 }
  ),
  isHistory: fc.boolean(),
});

describe('Property 8: Name Modification Persistence', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  it('should persist name changes immediately to storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (originalGroup: TabGroup, newName: string) => {
          // Save the original group
          const groups = await tabGroupsStorage.getValue();

          groups[originalGroup.id] = {
            ...originalGroup,
            createdAt: originalGroup.createdAt.toISOString(),
          } as any;
          await tabGroupsStorage.setValue(groups);

          // Update the group name
          await updateTabGroup(originalGroup.id, { name: newName });

          // Retrieve the group from storage
          const updatedGroups = await getTabGroups();
          const updatedGroup = updatedGroups.find((g) => g.id === originalGroup.id);

          // Verify the name was persisted
          if (!updatedGroup) {
            throw new Error('Group not found after update');
          }

          if (updatedGroup.name !== newName) {
            throw new Error(`Name not persisted: expected "${newName}", got "${updatedGroup.name}"`);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all other group properties when updating name', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (originalGroup: TabGroup, newName: string) => {
          // Save the original group
          const groups = await tabGroupsStorage.getValue();

          groups[originalGroup.id] = {
            ...originalGroup,
            createdAt: originalGroup.createdAt.toISOString(),
          } as any;
          await tabGroupsStorage.setValue(groups);

          // Update the group name
          await updateTabGroup(originalGroup.id, { name: newName });

          // Retrieve the group from storage
          const updatedGroups = await getTabGroups();
          const updatedGroup = updatedGroups.find((g) => g.id === originalGroup.id);

          if (!updatedGroup) {
            throw new Error('Group not found after update');
          }

          // Verify all other properties are preserved
          if (updatedGroup.id !== originalGroup.id) {
            throw new Error('Group ID changed');
          }

          if (updatedGroup.tabs.length !== originalGroup.tabs.length) {
            throw new Error('Tab count changed');
          }

          if (updatedGroup.isHistory !== originalGroup.isHistory) {
            throw new Error('isHistory flag changed');
          }

          // Verify tabs are preserved
          for (let i = 0; i < originalGroup.tabs.length; i++) {
            const originalTab = originalGroup.tabs[i];
            const updatedTab = updatedGroup.tabs[i];

            if (updatedTab.id !== originalTab.id) {
              throw new Error(`Tab ${i} ID changed`);
            }

            if (updatedTab.url !== originalTab.url) {
              throw new Error(`Tab ${i} URL changed`);
            }

            if (updatedTab.title !== originalTab.title) {
              throw new Error(`Tab ${i} title changed`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty name updates correctly', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (originalGroup: TabGroup) => {
        // Save the original group with a non-empty name
        const groupWithName = { ...originalGroup, name: 'Original Name' };
        const groups = await tabGroupsStorage.getValue();

        groups[groupWithName.id] = {
          ...groupWithName,
          createdAt: groupWithName.createdAt.toISOString(),
        } as any;
        await tabGroupsStorage.setValue(groups);

        // Try to update with empty name (should be handled by validation)
        await updateTabGroup(groupWithName.id, { name: '' });

        // Retrieve the group from storage
        const updatedGroups = await getTabGroups();
        const updatedGroup = updatedGroups.find((g) => g.id === groupWithName.id);

        if (!updatedGroup) {
          throw new Error('Group not found after update');
        }

        // The empty name should be stored (validation happens at UI level)
        if (updatedGroup.name !== '') {
          throw new Error(`Name not updated: expected "", got "${updatedGroup.name}"`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should handle multiple sequential name updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
        async (originalGroup: TabGroup, nameSequence: string[]) => {
          // Save the original group
          const groups = await tabGroupsStorage.getValue();

          groups[originalGroup.id] = {
            ...originalGroup,
            createdAt: originalGroup.createdAt.toISOString(),
          } as any;
          await tabGroupsStorage.setValue(groups);

          // Apply each name update sequentially
          for (const newName of nameSequence) {
            await updateTabGroup(originalGroup.id, { name: newName });
          }

          // Retrieve the group from storage
          const updatedGroups = await getTabGroups();
          const updatedGroup = updatedGroups.find((g) => g.id === originalGroup.id);

          if (!updatedGroup) {
            throw new Error('Group not found after updates');
          }

          // Verify the final name matches the last update
          const expectedName = nameSequence[nameSequence.length - 1];

          if (updatedGroup.name !== expectedName) {
            throw new Error(`Final name incorrect: expected "${expectedName}", got "${updatedGroup.name}"`);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
