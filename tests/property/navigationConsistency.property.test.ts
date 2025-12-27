import * as fc from 'fast-check';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTabStore } from '~/stores/useTabStore';
import { tabGroupsStorage } from '~/types/Storage';
import type { TabGroup } from '~/types/TabGroup';

/**
 * Feature: tab-group-manager, Property 15: Navigation Consistency
 *
 * For any sidebar item click, the content area should display the corresponding
 * tab group data accurately.
 *
 * Validates: Requirements 5.4
 */
describe('Property 15: Navigation Consistency', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});

    // Create fresh Pinia instance
    const pinia = createPinia();

    setActivePinia(pinia);
  });

  it('selecting a group should display that group accurately', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random tab groups
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            createdAt: fc.date(),
            tabs: fc.array(
              fc.record({
                id: fc.uuid(),
                url: fc.webUrl(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            isHistory: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (groups: TabGroup[]) => {
          // Save groups to storage
          const groupsMap: Record<string, TabGroup> = {};

          groups.forEach((group) => {
            groupsMap[group.id] = group;
          });
          await tabGroupsStorage.setValue(groupsMap);

          // Create Pinia instance and load store
          const pinia = createPinia();

          setActivePinia(pinia);
          const store = useTabStore();

          await store.loadGroups();

          // Test selecting each group
          for (const group of groups) {
            // Select the group
            store.selectedGroupId = group.id;

            // Verify selectedGroup computed property returns correct group
            expect(store.selectedGroup).toBeDefined();
            expect(store.selectedGroup?.id).toBe(group.id);
            expect(store.selectedGroup?.name).toBe(group.name);
            expect(store.selectedGroup?.isHistory).toBe(group.isHistory);
            expect(store.selectedGroup?.tabs.length).toBe(group.tabs.length);

            // Verify all tabs are present
            group.tabs.forEach((tab, index) => {
              const selectedTab = store.selectedGroup?.tabs[index];

              expect(selectedTab?.id).toBe(tab.id);
              expect(selectedTab?.url).toBe(tab.url);
              expect(selectedTab?.title).toBe(tab.title);
            });
          }

          // Test selecting 'history' (special case for history groups view)
          store.selectedGroupId = 'history';
          expect(store.selectedGroup).toBeNull(); // 'history' is not a real group ID

          // Test selecting non-existent group
          store.selectedGroupId = 'non-existent-id';
          expect(store.selectedGroup).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
