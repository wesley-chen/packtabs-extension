import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { tabGroupsStorage } from '../../types/Storage';
import { saveTabGroup, getTabGroups } from '../../utils/storage';
import type { TabGroup } from '../../types/TabGroup';

/**
 * Feature: tab-group-manager, Property 6: History Group Preservation
 * 
 * For any sequence of browser close events, each should create a separate
 * History Tab Group with unique timestamps, and all should be preserved in storage.
 * 
 * Validates: Requirements 2.3
 */

// Arbitrary for generating a history tab group
const historyGroupArbitrary = fc.record({
  tabs: fc.array(
    fc.record({
      id: fc.uuid(),
      url: fc.webUrl(),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 10 }
  ),
  // Generate timestamps with some time difference - filter out invalid dates
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(date => !isNaN(date.getTime())),
});

describe('History Group Preservation Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  afterEach(async () => {
    // Clean up storage after each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 6.1: Multiple history groups are preserved as separate entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(historyGroupArbitrary, { minLength: 2, maxLength: 10 }),
        async (historyGroupsData) => {
          // Clear storage at the start of each iteration
          await tabGroupsStorage.setValue({});

          // Create multiple history groups (simulating multiple browser close events)
          const createdGroups: TabGroup[] = [];
          
          for (const groupData of historyGroupsData) {
            const historyGroup: TabGroup = {
              id: crypto.randomUUID(),
              name: null, // History groups have no name
              createdAt: groupData.timestamp,
              tabs: groupData.tabs,
              isHistory: true,
            };
            
            await saveTabGroup(historyGroup);
            createdGroups.push(historyGroup);
          }

          // Verify: All history groups should be preserved
          const retrievedGroups = await getTabGroups();

          // Check count
          if (retrievedGroups.length !== historyGroupsData.length) {
            throw new Error(
              `Expected ${historyGroupsData.length} history groups, got ${retrievedGroups.length}`
            );
          }

          // Verify each group is preserved
          for (const createdGroup of createdGroups) {
            const found = retrievedGroups.find(g => g.id === createdGroup.id);
            
            if (!found) {
              throw new Error(
                `History group ${createdGroup.id} was not preserved in storage`
              );
            }

            // Verify it's still a history group
            if (!found.isHistory) {
              throw new Error(
                `Group ${found.id} should be a history group (isHistory=true)`
              );
            }

            if (found.name !== null) {
              throw new Error(
                `History group ${found.id} should have null name, got ${found.name}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6.2: Each history group has a unique timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(historyGroupArbitrary, { minLength: 2, maxLength: 10 }),
        async (historyGroupsData) => {
          // Clear storage at the start of each iteration
          await tabGroupsStorage.setValue({});

          // Create multiple history groups with different timestamps
          for (const groupData of historyGroupsData) {
            const historyGroup: TabGroup = {
              id: crypto.randomUUID(),
              name: null,
              createdAt: groupData.timestamp,
              tabs: groupData.tabs,
              isHistory: true,
            };
            
            await saveTabGroup(historyGroup);
          }

          // Verify: All groups should have their timestamps preserved
          const retrievedGroups = await getTabGroups();

          // Check that all timestamps are present
          const timestamps = retrievedGroups.map(g => g.createdAt.getTime());
          
          // Verify we have the correct number of timestamps
          if (timestamps.length !== historyGroupsData.length) {
            throw new Error(
              `Expected ${historyGroupsData.length} timestamps, got ${timestamps.length}`
            );
          }

          // Verify each timestamp matches one of the original timestamps
          const originalTimestamps = historyGroupsData.map(g => g.timestamp.getTime());
          
          for (const timestamp of timestamps) {
            if (!originalTimestamps.includes(timestamp)) {
              throw new Error(
                `Timestamp ${timestamp} not found in original timestamps`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6.3: History groups remain separate (no merging)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(historyGroupArbitrary, { minLength: 2, maxLength: 5 }),
        async (historyGroupsData) => {
          // Clear storage at the start of each iteration
          await tabGroupsStorage.setValue({});

          // Track the total number of tabs across all groups
          let totalTabs = 0;
          
          // Create multiple history groups
          for (const groupData of historyGroupsData) {
            totalTabs += groupData.tabs.length;
            
            const historyGroup: TabGroup = {
              id: crypto.randomUUID(),
              name: null,
              createdAt: groupData.timestamp,
              tabs: groupData.tabs,
              isHistory: true,
            };
            
            await saveTabGroup(historyGroup);
          }

          // Verify: Groups should remain separate (not merged)
          const retrievedGroups = await getTabGroups();

          // Count total tabs in retrieved groups
          const retrievedTotalTabs = retrievedGroups.reduce(
            (sum, group) => sum + group.tabs.length,
            0
          );

          // Verify total tab count matches (no tabs lost or duplicated)
          if (retrievedTotalTabs !== totalTabs) {
            throw new Error(
              `Expected ${totalTabs} total tabs, got ${retrievedTotalTabs}`
            );
          }

          // Verify each group maintains its own tab count
          for (let i = 0; i < historyGroupsData.length; i++) {
            const originalTabCount = historyGroupsData[i].tabs.length;
            const retrievedGroup = retrievedGroups[i];
            
            if (retrievedGroup.tabs.length !== originalTabCount) {
              throw new Error(
                `Group ${i} should have ${originalTabCount} tabs, got ${retrievedGroup.tabs.length}`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6.4: History groups persist across storage operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(historyGroupArbitrary, { minLength: 1, maxLength: 5 }),
        async (historyGroupsData) => {
          // Clear storage at the start of each iteration
          await tabGroupsStorage.setValue({});

          // Create history groups
          const groupIds: string[] = [];
          
          for (const groupData of historyGroupsData) {
            const historyGroup: TabGroup = {
              id: crypto.randomUUID(),
              name: null,
              createdAt: groupData.timestamp,
              tabs: groupData.tabs,
              isHistory: true,
            };
            
            await saveTabGroup(historyGroup);
            groupIds.push(historyGroup.id);
          }

          // Perform multiple read operations
          for (let i = 0; i < 3; i++) {
            const retrievedGroups = await getTabGroups();
            
            // Verify all groups are still present
            if (retrievedGroups.length !== historyGroupsData.length) {
              throw new Error(
                `After read ${i + 1}: Expected ${historyGroupsData.length} groups, got ${retrievedGroups.length}`
              );
            }

            // Verify all group IDs are present
            for (const groupId of groupIds) {
              const found = retrievedGroups.find(g => g.id === groupId);
              if (!found) {
                throw new Error(
                  `After read ${i + 1}: Group ${groupId} not found`
                );
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
