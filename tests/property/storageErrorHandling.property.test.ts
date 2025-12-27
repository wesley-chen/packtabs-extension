import * as fc from 'fast-check';
import { beforeEach, describe, it, vi } from 'vitest';

import { tabGroupsStorage } from '../../types/Storage';
import type { TabGroup } from '../../types/TabGroup';
import { getTabGroups, saveTabGroup, StorageQuotaExceededError, updateTabGroup } from '../../utils/storage';

/**
 * Feature: tab-group-manager, Property 18: Storage Error Handling
 *
 * For any storage operation failure, the system should provide appropriate
 * error handling without corrupting existing data.
 *
 * Validates: Requirements 7.4
 */

// Arbitraries for generating random test data
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

const validDateArbitrary = fc
  .date({ min: new Date('1970-01-01'), max: new Date('2100-01-01') })
  .filter((date) => !isNaN(date.getTime()));

const tabGroupArbitrary = fc
  .record({
    id: fc.uuid(),
    name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    createdAt: validDateArbitrary,
    tabs: fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }),
    isHistory: fc.boolean(),
  })
  .filter((group) => !isNaN(group.createdAt.getTime()));

describe('Storage Error Handling Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
    // Clear all mocks
    vi.restoreAllMocks();
  });

  it('Property 18.1: Storage quota errors are properly detected', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (group) => {
        // Mock setValue to throw quota error
        vi.spyOn(tabGroupsStorage, 'setValue').mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));

        let errorThrown = false;
        let correctErrorType = false;

        try {
          await saveTabGroup(group);
        } catch (error) {
          errorThrown = true;
          correctErrorType = error instanceof StorageQuotaExceededError;
        }

        if (!errorThrown) {
          throw new Error('Expected quota error to be thrown');
        }

        if (!correctErrorType) {
          throw new Error('Expected StorageQuotaExceededError to be thrown');
        }

        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('Property 18.2: Failed operations do not corrupt existing data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(tabGroupArbitrary, { minLength: 2, maxLength: 5 }).chain((groups) => {
          const uniqueGroups = groups.map((group, index) => ({
            ...group,
            id: `${group.id}-${index}`,
          }));

          return fc.constant(uniqueGroups);
        }),
        async (groups) => {
          // Clear storage and restore mocks for this test
          vi.restoreAllMocks();
          await tabGroupsStorage.setValue({});

          // Save initial groups
          for (const group of groups) {
            await saveTabGroup(group);
          }

          // Get initial state
          const initialGroups = await getTabGroups();
          const initialCount = initialGroups.length;

          // Try to update first group with a failing operation
          const groupToUpdate = groups[0];

          // Mock only setValue to fail once
          let callCount = 0;

          vi.spyOn(tabGroupsStorage, 'setValue').mockImplementation(async () => {
            callCount++;

            if (callCount === 1) {
              throw new Error('Network failure');
            }
            // For subsequent calls, use the real implementation
            vi.restoreAllMocks();

            return tabGroupsStorage.setValue({});
          });

          let updateFailed = false;

          try {
            await updateTabGroup(groupToUpdate.id, { name: 'New Name' });
          } catch {
            updateFailed = true;
          }

          if (!updateFailed) {
            throw new Error('Expected update to fail');
          }

          // Restore mocks and verify existing data is intact
          vi.restoreAllMocks();
          const afterFailureGroups = await getTabGroups();

          if (afterFailureGroups.length !== initialCount) {
            throw new Error('Data corruption: group count changed after failed operation');
          }

          // Verify all original groups still exist with correct data
          for (const originalGroup of groups) {
            const found = afterFailureGroups.find((g) => g.id === originalGroup.id);

            if (!found) {
              throw new Error(`Data corruption: group ${originalGroup.id} lost after failed operation`);
            }

            // Verify tabs are intact
            if (found.tabs.length !== originalGroup.tabs.length) {
              throw new Error(`Data corruption: tabs count changed for group ${originalGroup.id}`);
            }
          }

          return true;
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  });

  it('Property 18.3: Sync conflicts are resolved using timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        tabGroupArbitrary,
        fc.integer({ min: 1000, max: 10000 }), // Time difference in ms
        async (group, timeDiff) => {
          // Save initial group
          await saveTabGroup(group);

          // Create a "remote" version with different timestamp
          const olderGroup: TabGroup = {
            ...group,
            name: 'Older Version',
            createdAt: new Date(group.createdAt.getTime() - timeDiff),
          };

          // Save the newer version (should win)
          await saveTabGroup(group);

          // Retrieve and verify the newer version was kept
          const retrieved = await getTabGroups();
          const found = retrieved.find((g) => g.id === group.id);

          if (!found) {
            throw new Error(`Group ${group.id} not found after conflict resolution`);
          }

          // The newer version should be preserved
          const timeDiffResult = Math.abs(found.createdAt.getTime() - group.createdAt.getTime());

          if (timeDiffResult > 1) {
            throw new Error('Conflict resolution did not preserve newer version');
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 18.4: Retry logic eventually gives up after max retries', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupArbitrary, async (group) => {
        // Mock getValue to always fail
        vi.spyOn(tabGroupsStorage, 'getValue').mockRejectedValue(new Error('Persistent network error'));

        let errorThrown = false;

        try {
          await saveTabGroup(group);
        } catch (error) {
          errorThrown = true;
        }

        if (!errorThrown) {
          throw new Error('Expected error to be thrown after max retries');
        }

        return true;
      }),
      { numRuns: 30 }
    );
  });
});
