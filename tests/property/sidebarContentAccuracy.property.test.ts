import * as fc from 'fast-check';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach,describe, expect, it } from 'vitest';

import { useTabStore } from '~/stores/useTabStore';
import { tabGroupsStorage } from '~/types/Storage';
import type { TabGroup } from '~/types/TabGroup';

/**
 * Feature: tab-group-manager, Property 14: Sidebar Content Accuracy
 *
 * For any Management Page load, the sidebar should display "History Tab Group"
 * and all existing Named Tab Groups accurately reflecting the current storage state.
 *
 * Validates: Requirements 5.3
 */
describe('Property 14: Sidebar Content Accuracy', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});

    // Create fresh Pinia instance
    const pinia = createPinia();

    setActivePinia(pinia);
  });

  it('sidebar menu structure should accurately reflect storage state', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random tab groups with mix of history and named groups
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
          { minLength: 0, maxLength: 20 }
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

          // Count history and named groups
          const historyGroups = groups.filter((g) => g.isHistory);
          const namedGroups = groups.filter((g) => !g.isHistory);

          // Verify store computed properties match storage
          expect(store.historyGroups.length).toBe(historyGroups.length);
          expect(store.namedGroups.length).toBe(namedGroups.length);

          // Verify all history groups are accessible
          historyGroups.forEach((group) => {
            const foundGroup = store.historyGroups.find((g) => g.id === group.id);

            expect(foundGroup).toBeDefined();
            expect(foundGroup?.name).toBe(group.name);
            expect(foundGroup?.isHistory).toBe(true);
          });

          // Verify all named groups are accessible
          namedGroups.forEach((group) => {
            const foundGroup = store.namedGroups.find((g) => g.id === group.id);

            expect(foundGroup).toBeDefined();
            expect(foundGroup?.name).toBe(group.name);
            expect(foundGroup?.isHistory).toBe(false);
          });

          // Verify total count
          expect(store.tabGroups.length).toBe(groups.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
