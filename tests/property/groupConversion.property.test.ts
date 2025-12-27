import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { tabGroupsStorage } from '../../types/Storage';
import { getTabGroups, saveTabGroup, updateTabGroup } from '../../utils/storage';
import type { TabGroup } from '../../types/TabGroup';

/**
 * Feature: tab-group-manager, Property 7: Group Conversion
 *
 * For any History Tab Group, when a user provides a name, it should be converted
 * to a Named Tab Group and moved from history to the named groups list.
 *
 * Validates: Requirements 3.1, 9.2, 9.3
 */

// Arbitrary for generating random tab items
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

// Arbitrary for generating history tab groups
const historyGroupArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.constant(null), // History groups have null name
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter((d) => !isNaN(d.getTime())),
  tabs: fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }),
  isHistory: fc.constant(true), // History groups have isHistory=true
});

// Arbitrary for generating group names
const groupNameArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

describe('Group Conversion Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  afterEach(async () => {
    // Clean up storage after each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 7.1: Converting history group to named group changes name and isHistory flag', async () => {
    await fc.assert(
      fc.asyncProperty(historyGroupArbitrary, groupNameArbitrary, async (historyGroup, newName) => {
        // Setup: Clear storage and save a history group
        await tabGroupsStorage.setValue({});
        await saveTabGroup(historyGroup);

        // Verify initial state
        let groups = await getTabGroups();
        if (groups.length !== 1) {
          throw new Error(`Expected 1 group initially, got ${groups.length}`);
        }

        const initialGroup = groups[0];
        if (initialGroup.name !== null) {
          throw new Error(`Initial group should have null name, got ${initialGroup.name}`);
        }
        if (!initialGroup.isHistory) {
          throw new Error(`Initial group should have isHistory=true, got ${initialGroup.isHistory}`);
        }

        // Action: Convert history group to named group
        await updateTabGroup(historyGroup.id, {
          name: newName,
          isHistory: false,
        });

        // Verify: Group is now a named group
        groups = await getTabGroups();
        if (groups.length !== 1) {
          throw new Error(`Expected 1 group after conversion, got ${groups.length}`);
        }

        const convertedGroup = groups[0];

        // Verify name was set
        if (convertedGroup.name !== newName) {
          throw new Error(`Expected group name to be "${newName}", got "${convertedGroup.name}"`);
        }

        // Verify isHistory flag was changed
        if (convertedGroup.isHistory) {
          throw new Error(`Expected isHistory to be false after conversion, got ${convertedGroup.isHistory}`);
        }

        // Verify tabs were preserved
        if (convertedGroup.tabs.length !== historyGroup.tabs.length) {
          throw new Error(
            `Expected ${historyGroup.tabs.length} tabs after conversion, got ${convertedGroup.tabs.length}`
          );
        }

        // Verify tab data integrity
        for (let i = 0; i < historyGroup.tabs.length; i++) {
          const originalTab = historyGroup.tabs[i];
          const convertedTab = convertedGroup.tabs[i];

          if (convertedTab.url !== originalTab.url) {
            throw new Error(
              `Tab ${i} URL changed during conversion: expected ${originalTab.url}, got ${convertedTab.url}`
            );
          }

          if (convertedTab.title !== originalTab.title) {
            throw new Error(
              `Tab ${i} title changed during conversion: expected ${originalTab.title}, got ${convertedTab.title}`
            );
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7.2: Converted group maintains same ID', async () => {
    await fc.assert(
      fc.asyncProperty(historyGroupArbitrary, groupNameArbitrary, async (historyGroup, newName) => {
        // Setup: Clear storage and save a history group
        await tabGroupsStorage.setValue({});
        await saveTabGroup(historyGroup);

        const originalId = historyGroup.id;

        // Action: Convert history group to named group
        await updateTabGroup(historyGroup.id, {
          name: newName,
          isHistory: false,
        });

        // Verify: Group ID remains the same
        const groups = await getTabGroups();
        const convertedGroup = groups.find((g) => g.id === originalId);

        if (!convertedGroup) {
          throw new Error(`Group with ID ${originalId} not found after conversion`);
        }

        if (convertedGroup.id !== originalId) {
          throw new Error(`Group ID changed during conversion: expected ${originalId}, got ${convertedGroup.id}`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7.3: Multiple history groups can be converted independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(historyGroupArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(groupNameArbitrary, { minLength: 2, maxLength: 5 }),
        async (historyGroups, names) => {
          // Ensure we have matching arrays
          const groupCount = Math.min(historyGroups.length, names.length);
          const testGroups = historyGroups.slice(0, groupCount);
          const testNames = names.slice(0, groupCount);

          // Setup: Clear storage and save multiple history groups
          await tabGroupsStorage.setValue({});
          for (const group of testGroups) {
            await saveTabGroup(group);
          }

          // Verify initial state
          let groups = await getTabGroups();
          if (groups.length !== testGroups.length) {
            throw new Error(`Expected ${testGroups.length} groups initially, got ${groups.length}`);
          }

          // All should be history groups
          const allHistory = groups.every((g) => g.isHistory && g.name === null);
          if (!allHistory) {
            throw new Error('Not all initial groups are history groups');
          }

          // Action: Convert first group only
          await updateTabGroup(testGroups[0].id, {
            name: testNames[0],
            isHistory: false,
          });

          // Verify: Only first group was converted
          groups = await getTabGroups();
          if (groups.length !== testGroups.length) {
            throw new Error(`Expected ${testGroups.length} groups after conversion, got ${groups.length}`);
          }

          const convertedGroup = groups.find((g) => g.id === testGroups[0].id);
          if (!convertedGroup) {
            throw new Error('Converted group not found');
          }

          if (convertedGroup.name !== testNames[0]) {
            throw new Error(`Expected converted group name to be "${testNames[0]}", got "${convertedGroup.name}"`);
          }

          if (convertedGroup.isHistory) {
            throw new Error('Converted group should have isHistory=false');
          }

          // Verify other groups remain as history groups
          for (let i = 1; i < testGroups.length; i++) {
            const otherGroup = groups.find((g) => g.id === testGroups[i].id);
            if (!otherGroup) {
              throw new Error(`Group ${i} not found`);
            }

            if (otherGroup.name !== null) {
              throw new Error(`Group ${i} should still have null name, got "${otherGroup.name}"`);
            }

            if (!otherGroup.isHistory) {
              throw new Error(`Group ${i} should still have isHistory=true, got ${otherGroup.isHistory}`);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7.4: Conversion preserves creation timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(historyGroupArbitrary, groupNameArbitrary, async (historyGroup, newName) => {
        // Setup: Clear storage and save a history group
        await tabGroupsStorage.setValue({});
        await saveTabGroup(historyGroup);

        // Get initial timestamp
        let groups = await getTabGroups();
        const initialTimestamp = groups[0].createdAt.getTime();

        // Action: Convert history group to named group
        await updateTabGroup(historyGroup.id, {
          name: newName,
          isHistory: false,
        });

        // Verify: Timestamp is preserved
        groups = await getTabGroups();
        const convertedGroup = groups[0];
        const convertedTimestamp = convertedGroup.createdAt.getTime();

        if (convertedTimestamp !== initialTimestamp) {
          throw new Error(
            `Timestamp changed during conversion: expected ${initialTimestamp}, got ${convertedTimestamp}`
          );
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
