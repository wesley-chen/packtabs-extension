import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { setActivePinia, createPinia } from 'pinia';
import { tabGroupsStorage } from '../../types/Storage';
import { saveTabGroup } from '../../utils/storage';
import { useTabStore } from '../../stores/useTabStore';
import type { TabGroup } from '../../types/TabGroup';

/**
 * Feature: tab-group-manager, Property 20: UI State Consistency After Conversion
 * 
 * For any group conversion from History to Named, the sidebar navigation should
 * immediately reflect the change by moving the group from history to named groups list.
 * 
 * Validates: Requirements 9.5
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
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
  tabs: fc.array(tabItemArbitrary, { minLength: 1, maxLength: 20 }),
  isHistory: fc.constant(true), // History groups have isHistory=true
});

// Arbitrary for generating group names
const groupNameArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

describe('UI State Consistency After Conversion Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia());
  });

  afterEach(async () => {
    // Clean up storage after each test
    await tabGroupsStorage.setValue({});
  });

  it('Property 20.1: Converted group moves from historyGroups to namedGroups', async () => {
    await fc.assert(
      fc.asyncProperty(
        historyGroupArbitrary,
        groupNameArbitrary,
        async (historyGroup, newName) => {
          // Setup: Clear storage and save a history group
          await tabGroupsStorage.setValue({});
          await saveTabGroup(historyGroup);

          // Create store and load groups
          const store = useTabStore();
          await store.loadGroups();

          // Verify initial state: group is in historyGroups
          if (store.historyGroups.length !== 1) {
            throw new Error(
              `Expected 1 history group initially, got ${store.historyGroups.length}`
            );
          }

          if (store.namedGroups.length !== 0) {
            throw new Error(
              `Expected 0 named groups initially, got ${store.namedGroups.length}`
            );
          }

          const initialHistoryGroup = store.historyGroups[0];
          if (initialHistoryGroup.id !== historyGroup.id) {
            throw new Error(
              `History group ID mismatch: expected ${historyGroup.id}, got ${initialHistoryGroup.id}`
            );
          }

          // Action: Convert history group to named group
          await store.convertToNamed(historyGroup.id, newName);

          // Verify: Group moved from historyGroups to namedGroups
          if (store.historyGroups.length !== 0) {
            throw new Error(
              `Expected 0 history groups after conversion, got ${store.historyGroups.length}`
            );
          }

          if (store.namedGroups.length !== 1) {
            throw new Error(
              `Expected 1 named group after conversion, got ${store.namedGroups.length}`
            );
          }

          const convertedGroup = store.namedGroups[0];

          // Verify the converted group has correct properties
          if (convertedGroup.id !== historyGroup.id) {
            throw new Error(
              `Converted group ID mismatch: expected ${historyGroup.id}, got ${convertedGroup.id}`
            );
          }

          // Name should be trimmed
          const expectedName = newName.trim();
          if (convertedGroup.name !== expectedName) {
            throw new Error(
              `Converted group name mismatch: expected "${expectedName}", got "${convertedGroup.name}"`
            );
          }

          if (convertedGroup.isHistory) {
            throw new Error(
              `Converted group should have isHistory=false, got ${convertedGroup.isHistory}`
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20.2: Total group count remains constant after conversion', async () => {
    await fc.assert(
      fc.asyncProperty(
        historyGroupArbitrary,
        groupNameArbitrary,
        async (historyGroup, newName) => {
          // Setup: Clear storage and save a history group
          await tabGroupsStorage.setValue({});
          await saveTabGroup(historyGroup);

          // Create store and load groups
          const store = useTabStore();
          await store.loadGroups();

          const initialTotalCount = store.tabGroups.length;

          // Action: Convert history group to named group
          await store.convertToNamed(historyGroup.id, newName);

          // Verify: Total count remains the same
          const finalTotalCount = store.tabGroups.length;

          if (finalTotalCount !== initialTotalCount) {
            throw new Error(
              `Total group count changed: expected ${initialTotalCount}, got ${finalTotalCount}`
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20.3: Multiple conversions maintain correct list separation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(historyGroupArbitrary, { minLength: 3, maxLength: 5 }),
        fc.array(groupNameArbitrary, { minLength: 3, maxLength: 5 }),
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

          // Create store and load groups
          const store = useTabStore();
          await store.loadGroups();

          // Verify initial state: all groups are history groups
          if (store.historyGroups.length !== testGroups.length) {
            throw new Error(
              `Expected ${testGroups.length} history groups initially, got ${store.historyGroups.length}`
            );
          }

          if (store.namedGroups.length !== 0) {
            throw new Error(
              `Expected 0 named groups initially, got ${store.namedGroups.length}`
            );
          }

          // Action: Convert first two groups
          const numToConvert = Math.min(2, testGroups.length);
          for (let i = 0; i < numToConvert; i++) {
            await store.convertToNamed(testGroups[i].id, testNames[i]);
          }

          // Verify: Correct number in each list
          const expectedHistoryCount = testGroups.length - numToConvert;
          const expectedNamedCount = numToConvert;

          if (store.historyGroups.length !== expectedHistoryCount) {
            throw new Error(
              `Expected ${expectedHistoryCount} history groups after conversion, got ${store.historyGroups.length}`
            );
          }

          if (store.namedGroups.length !== expectedNamedCount) {
            throw new Error(
              `Expected ${expectedNamedCount} named groups after conversion, got ${store.namedGroups.length}`
            );
          }

          // Verify: Converted groups are in namedGroups
          for (let i = 0; i < numToConvert; i++) {
            const convertedGroup = store.namedGroups.find(g => g.id === testGroups[i].id);
            if (!convertedGroup) {
              throw new Error(
                `Converted group ${i} (ID: ${testGroups[i].id}) not found in namedGroups`
              );
            }

            // Name should be trimmed
            const expectedName = testNames[i].trim();
            if (convertedGroup.name !== expectedName) {
              throw new Error(
                `Converted group ${i} name mismatch: expected "${expectedName}", got "${convertedGroup.name}"`
              );
            }

            if (convertedGroup.isHistory) {
              throw new Error(
                `Converted group ${i} should have isHistory=false`
              );
            }
          }

          // Verify: Remaining groups are still in historyGroups
          for (let i = numToConvert; i < testGroups.length; i++) {
            const historyGroup = store.historyGroups.find(g => g.id === testGroups[i].id);
            if (!historyGroup) {
              throw new Error(
                `History group ${i} (ID: ${testGroups[i].id}) not found in historyGroups`
              );
            }

            if (historyGroup.name !== null) {
              throw new Error(
                `History group ${i} should have null name, got "${historyGroup.name}"`
              );
            }

            if (!historyGroup.isHistory) {
              throw new Error(
                `History group ${i} should have isHistory=true`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20.4: Conversion updates selectedGroup if it was selected', async () => {
    await fc.assert(
      fc.asyncProperty(
        historyGroupArbitrary,
        groupNameArbitrary,
        async (historyGroup, newName) => {
          // Setup: Clear storage and save a history group
          await tabGroupsStorage.setValue({});
          await saveTabGroup(historyGroup);

          // Create store and load groups
          const store = useTabStore();
          await store.loadGroups();

          // Select the history group
          store.selectedGroupId = historyGroup.id;

          // Verify initial selection
          const initialSelectedGroup = store.selectedGroup;
          if (!initialSelectedGroup) {
            throw new Error('Selected group should not be null');
          }

          if (initialSelectedGroup.id !== historyGroup.id) {
            throw new Error(
              `Selected group ID mismatch: expected ${historyGroup.id}, got ${initialSelectedGroup.id}`
            );
          }

          if (!initialSelectedGroup.isHistory) {
            throw new Error('Initially selected group should be a history group');
          }

          // Action: Convert the selected history group to named group
          await store.convertToNamed(historyGroup.id, newName);

          // Verify: selectedGroup still points to the same group (by ID)
          const finalSelectedGroup = store.selectedGroup;
          if (!finalSelectedGroup) {
            throw new Error('Selected group should not be null after conversion');
          }

          if (finalSelectedGroup.id !== historyGroup.id) {
            throw new Error(
              `Selected group ID changed: expected ${historyGroup.id}, got ${finalSelectedGroup.id}`
            );
          }

          // Verify: selectedGroup now reflects the converted state
          // Name should be trimmed
          const expectedName = newName.trim();
          if (finalSelectedGroup.name !== expectedName) {
            throw new Error(
              `Selected group name mismatch: expected "${expectedName}", got "${finalSelectedGroup.name}"`
            );
          }

          if (finalSelectedGroup.isHistory) {
            throw new Error(
              `Selected group should have isHistory=false after conversion`
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
