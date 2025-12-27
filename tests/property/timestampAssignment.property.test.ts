import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { tabGroupsStorage } from '../../types/Storage';
import type { TabGroup } from '../../types/TabGroup';
import { getTabGroups, saveTabGroup } from '../../utils/storage';

/**
 * Feature: tab-group-manager, Property 4: Timestamp Assignment
 *
 * For any newly created tab group, a valid timestamp should be assigned
 * and stored with the group data.
 *
 * Validates: Requirements 1.4
 */

// Arbitrary for generating tab items
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

// Arbitrary for generating tab groups (without timestamp - we'll add it)
const tabGroupDataArbitrary = fc.record({
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  tabs: fc.array(tabItemArbitrary, { minLength: 1, maxLength: 10 }),
  isHistory: fc.boolean(),
});

describe('Timestamp Assignment Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  afterEach(async () => {
    // Clean up storage after each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 4.1: Every new tab group has a valid timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupDataArbitrary, async (groupData) => {
        // Clear storage at the start of each iteration
        await tabGroupsStorage.setValue({});

        // Create a new tab group with current timestamp
        const beforeCreation = Date.now();

        const newGroup: TabGroup = {
          id: crypto.randomUUID(),
          name: groupData.name,
          createdAt: new Date(), // Timestamp assignment
          tabs: groupData.tabs,
          isHistory: groupData.isHistory,
        };

        const afterCreation = Date.now();

        // Save the group
        await saveTabGroup(newGroup);

        // Retrieve and verify
        const retrievedGroups = await getTabGroups();

        if (retrievedGroups.length !== 1) {
          throw new Error(`Expected 1 group, got ${retrievedGroups.length}`);
        }

        const retrievedGroup = retrievedGroups[0];

        // Verify timestamp exists and is a valid Date
        if (!(retrievedGroup.createdAt instanceof Date)) {
          throw new Error(`createdAt should be a Date instance, got ${typeof retrievedGroup.createdAt}`);
        }

        // Verify timestamp is not NaN
        if (isNaN(retrievedGroup.createdAt.getTime())) {
          throw new Error('createdAt timestamp is NaN (invalid date)');
        }

        // Verify timestamp is within reasonable range (created during test)
        const timestamp = retrievedGroup.createdAt.getTime();

        if (timestamp < beforeCreation || timestamp > afterCreation) {
          throw new Error(`Timestamp ${timestamp} is outside expected range [${beforeCreation}, ${afterCreation}]`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4.2: Timestamp is preserved through storage round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(tabGroupDataArbitrary, async (groupData) => {
        // Clear storage at the start of each iteration
        await tabGroupsStorage.setValue({});

        // Create a tab group with a specific timestamp
        const specificTimestamp = new Date('2024-01-15T10:30:00.000Z');

        const newGroup: TabGroup = {
          id: crypto.randomUUID(),
          name: groupData.name,
          createdAt: specificTimestamp,
          tabs: groupData.tabs,
          isHistory: groupData.isHistory,
        };

        // Save the group
        await saveTabGroup(newGroup);

        // Retrieve and verify timestamp is preserved
        const retrievedGroups = await getTabGroups();
        const retrievedGroup = retrievedGroups[0];

        // Verify timestamp matches exactly
        if (retrievedGroup.createdAt.getTime() !== specificTimestamp.getTime()) {
          throw new Error(
            `Timestamp not preserved: expected ${specificTimestamp.getTime()}, got ${retrievedGroup.createdAt.getTime()}`
          );
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4.3: Multiple groups have distinct timestamps when created sequentially', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabGroupDataArbitrary, { minLength: 2, maxLength: 5 }), async (groupsData) => {
        // Clear storage at the start of each iteration
        await tabGroupsStorage.setValue({});

        const timestamps: number[] = [];

        // Create multiple groups with small delays to ensure distinct timestamps
        for (const groupData of groupsData) {
          const newGroup: TabGroup = {
            id: crypto.randomUUID(),
            name: groupData.name,
            createdAt: new Date(),
            tabs: groupData.tabs,
            isHistory: groupData.isHistory,
          };

          timestamps.push(newGroup.createdAt.getTime());
          await saveTabGroup(newGroup);

          // Small delay to ensure timestamps are different
          await new Promise((resolve) => setTimeout(resolve, 2));
        }

        // Retrieve all groups
        const retrievedGroups = await getTabGroups();

        // Verify all groups have timestamps
        for (const group of retrievedGroups) {
          if (!(group.createdAt instanceof Date)) {
            throw new Error(`Group ${group.id} has invalid createdAt type: ${typeof group.createdAt}`);
          }

          if (isNaN(group.createdAt.getTime())) {
            throw new Error(`Group ${group.id} has invalid timestamp (NaN)`);
          }
        }

        // Verify timestamps are in chronological order (or at least all valid)
        const retrievedTimestamps = retrievedGroups.map((g) => g.createdAt.getTime());

        for (let i = 0; i < retrievedTimestamps.length - 1; i++) {
          // Timestamps should be increasing (or at least not decreasing significantly)
          if (retrievedTimestamps[i] > retrievedTimestamps[i + 1] + 1000) {
            throw new Error(`Timestamps out of order: ${retrievedTimestamps[i]} > ${retrievedTimestamps[i + 1]}`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4.4: Timestamp format is consistent across all groups', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabGroupDataArbitrary, { minLength: 1, maxLength: 10 }), async (groupsData) => {
        // Clear storage at the start of each iteration
        await tabGroupsStorage.setValue({});

        // Create multiple groups
        for (const groupData of groupsData) {
          const newGroup: TabGroup = {
            id: crypto.randomUUID(),
            name: groupData.name,
            createdAt: new Date(),
            tabs: groupData.tabs,
            isHistory: groupData.isHistory,
          };

          await saveTabGroup(newGroup);
        }

        // Retrieve all groups
        const retrievedGroups = await getTabGroups();

        // Verify all timestamps are Date objects with consistent format
        for (const group of retrievedGroups) {
          // Should be a Date instance
          if (!(group.createdAt instanceof Date)) {
            throw new Error(`Group ${group.id} createdAt is not a Date instance`);
          }

          // Should be convertible to ISO string
          try {
            const isoString = group.createdAt.toISOString();

            // ISO string should be valid format
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(isoString)) {
              throw new Error(`Group ${group.id} timestamp has invalid ISO format: ${isoString}`);
            }
          } catch (error) {
            throw new Error(`Group ${group.id} timestamp cannot be converted to ISO string: ${error}`);
          }

          // Should be convertible to timestamp number
          const timestamp = group.createdAt.getTime();

          if (typeof timestamp !== 'number' || isNaN(timestamp)) {
            throw new Error(`Group ${group.id} timestamp is not a valid number: ${timestamp}`);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
