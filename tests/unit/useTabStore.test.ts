import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTabStore } from '../../stores/useTabStore';
import { tabGroupsStorage } from '../../types/Storage';
import type { TabGroup, TabItem } from '../../types/TabGroup';

describe('useTabStore', () => {
  beforeEach(async () => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia());

    // Clear storage before each test
    await tabGroupsStorage.setValue({});

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('State and Computed Properties', () => {
    it('should initialize with empty state', () => {
      const store = useTabStore();

      expect(store.tabGroups).toEqual([]);
      expect(store.selectedGroupId).toBeNull();
      expect(store.historyGroups).toEqual([]);
      expect(store.namedGroups).toEqual([]);
      expect(store.selectedGroup).toBeNull();
    });

    it('should filter history groups correctly', async () => {
      const store = useTabStore();

      // Create test groups
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [],
        isHistory: true,
      };

      const namedGroup: TabGroup = {
        id: 'named-1',
        name: 'My Group',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      // Save groups to storage
      await tabGroupsStorage.setValue({
        'history-1': {
          ...historyGroup,
          createdAt: historyGroup.createdAt.toISOString(),
        },
        'named-1': {
          ...namedGroup,
          createdAt: namedGroup.createdAt.toISOString(),
        },
      });

      // Load groups
      await store.loadGroups();

      // Verify filtering
      expect(store.historyGroups).toHaveLength(1);
      expect(store.historyGroups[0].id).toBe('history-1');
      expect(store.historyGroups[0].isHistory).toBe(true);
    });

    it('should filter named groups correctly', async () => {
      const store = useTabStore();

      // Create test groups
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [],
        isHistory: true,
      };

      const namedGroup1: TabGroup = {
        id: 'named-1',
        name: 'Group 1',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      const namedGroup2: TabGroup = {
        id: 'named-2',
        name: 'Group 2',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      // Save groups to storage
      await tabGroupsStorage.setValue({
        'history-1': {
          ...historyGroup,
          createdAt: historyGroup.createdAt.toISOString(),
        },
        'named-1': {
          ...namedGroup1,
          createdAt: namedGroup1.createdAt.toISOString(),
        },
        'named-2': {
          ...namedGroup2,
          createdAt: namedGroup2.createdAt.toISOString(),
        },
      });

      // Load groups
      await store.loadGroups();

      // Verify filtering
      expect(store.namedGroups).toHaveLength(2);
      expect(store.namedGroups.every((g) => !g.isHistory)).toBe(true);
      expect(store.namedGroups.map((g) => g.id)).toContain('named-1');
      expect(store.namedGroups.map((g) => g.id)).toContain('named-2');
    });

    it('should return selected group when selectedGroupId is set', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'test-1',
        name: 'Test Group',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      // Save group to storage
      await tabGroupsStorage.setValue({
        'test-1': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      // Load groups and set selection
      await store.loadGroups();
      store.selectedGroupId = 'test-1';

      // Verify selected group
      expect(store.selectedGroup).not.toBeNull();
      expect(store.selectedGroup?.id).toBe('test-1');
      expect(store.selectedGroup?.name).toBe('Test Group');
    });

    it('should return null for selectedGroup when no group is selected', () => {
      const store = useTabStore();

      expect(store.selectedGroup).toBeNull();
    });

    it('should return null for selectedGroup when selected id does not exist', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'test-1',
        name: 'Test Group',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'test-1': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      store.selectedGroupId = 'non-existent';

      expect(store.selectedGroup).toBeNull();
    });
  });

  describe('loadGroups', () => {
    it('should load groups from storage', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'load-1',
        name: 'Load Test',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        tabs: [
          {
            id: 'tab-1',
            url: 'https://example.com',
            title: 'Example',
          },
        ],
        isHistory: false,
      };

      // Save to storage
      await tabGroupsStorage.setValue({
        'load-1': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      // Load groups
      await store.loadGroups();

      expect(store.tabGroups).toHaveLength(1);
      expect(store.tabGroups[0].id).toBe('load-1');
      expect(store.tabGroups[0].name).toBe('Load Test');
      expect(store.tabGroups[0].tabs).toHaveLength(1);
    });

    it('should handle empty storage', async () => {
      const store = useTabStore();

      await store.loadGroups();

      expect(store.tabGroups).toEqual([]);
    });
  });

  describe('saveGroup', () => {
    it('should capture current window tabs and save as named group', async () => {
      const store = useTabStore();

      // Mock browser APIs using global browser object
      (global as any).browser = (global as any).browser ?? {};
      (global as any).browser.windows = (global as any).browser.windows ?? {};
      (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: 1 });

      (global as any).browser.tabs = (global as any).browser.tabs ?? {};
      (global as any).browser.tabs.query = vi.fn().mockResolvedValue([
        {
          url: 'https://example1.com',
          title: 'Example 1',
          favIconUrl: 'https://example1.com/favicon.ico',
        },
        {
          url: 'https://example2.com',
          title: 'Example 2',
        },
      ]);

      // Save group
      const result = await store.saveGroup('My Group', false);

      // Verify result
      expect(result.name).toBe('My Group');
      expect(result.isHistory).toBe(false);
      expect(result.tabs).toHaveLength(2);
      expect(result.tabs[0].url).toBe('https://example1.com');
      expect(result.tabs[1].url).toBe('https://example2.com');

      // Verify state updated
      expect(store.tabGroups).toHaveLength(1);
      expect(store.tabGroups[0].name).toBe('My Group');
    });

    it('should save as history group when isHistory is true', async () => {
      const store = useTabStore();

      (global as any).browser = (global as any).browser ?? {};
      (global as any).browser.windows = (global as any).browser.windows ?? {};
      (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: 1 });

      (global as any).browser.tabs = (global as any).browser.tabs ?? {};
      (global as any).browser.tabs.query = vi
        .fn()
        .mockResolvedValue([{ url: 'https://example.com', title: 'Example' }]);

      const result = await store.saveGroup(null, true);

      expect(result.name).toBeNull();
      expect(result.isHistory).toBe(true);
      expect(store.historyGroups).toHaveLength(1);
    });

    it('should generate unique IDs for new groups', async () => {
      const store = useTabStore();

      (global as any).browser = (global as any).browser ?? {};
      (global as any).browser.windows = (global as any).browser.windows ?? {};
      (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: 1 });

      (global as any).browser.tabs = (global as any).browser.tabs ?? {};
      (global as any).browser.tabs.query = vi
        .fn()
        .mockResolvedValue([{ url: 'https://example.com', title: 'Example' }]);

      const group1 = await store.saveGroup('Group 1');
      const group2 = await store.saveGroup('Group 2');

      expect(group1.id).not.toBe(group2.id);
      expect(store.tabGroups).toHaveLength(2);
    });

    it('should assign current timestamp to new groups', async () => {
      const store = useTabStore();

      (global as any).browser = (global as any).browser ?? {};
      (global as any).browser.windows = (global as any).browser.windows ?? {};
      (global as any).browser.windows.getCurrent = vi.fn().mockResolvedValue({ id: 1 });

      (global as any).browser.tabs = (global as any).browser.tabs ?? {};
      (global as any).browser.tabs.query = vi
        .fn()
        .mockResolvedValue([{ url: 'https://example.com', title: 'Example' }]);

      const beforeSave = new Date();
      const result = await store.saveGroup('Test');
      const afterSave = new Date();

      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });
  });

  describe('updateGroup', () => {
    it('should update group name', async () => {
      const store = useTabStore();

      // Create initial group
      const testGroup: TabGroup = {
        id: 'update-1',
        name: 'Original Name',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'update-1': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();

      // Update group
      await store.updateGroup('update-1', { name: 'Updated Name' });

      // Verify update
      expect(store.tabGroups[0].name).toBe('Updated Name');
    });

    it('should update isHistory flag', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'update-2',
        name: null,
        createdAt: new Date(),
        tabs: [],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'update-2': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      expect(store.historyGroups).toHaveLength(1);

      // Update to named group
      await store.updateGroup('update-2', { isHistory: false });

      // Verify update
      expect(store.historyGroups).toHaveLength(0);
      expect(store.namedGroups).toHaveLength(1);
    });

    it('should update multiple properties at once', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'update-3',
        name: 'Original',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'update-3': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();

      // Update multiple properties
      await store.updateGroup('update-3', {
        name: 'New Name',
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
      });

      // Verify updates
      const updatedGroup = store.tabGroups[0];

      expect(updatedGroup.name).toBe('New Name');
      expect(updatedGroup.tabs).toHaveLength(1);
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group from storage and state', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'delete-1',
        name: 'To Delete',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'delete-1': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      expect(store.tabGroups).toHaveLength(1);

      // Delete group
      await store.deleteGroup('delete-1');

      // Verify deletion
      expect(store.tabGroups).toHaveLength(0);
    });

    it('should clear selectedGroupId when deleting selected group', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'delete-2',
        name: 'Selected Group',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'delete-2': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      store.selectedGroupId = 'delete-2';

      expect(store.selectedGroupId).toBe('delete-2');

      // Delete selected group
      await store.deleteGroup('delete-2');

      // Verify selection cleared
      expect(store.selectedGroupId).toBeNull();
    });

    it('should not affect other groups when deleting one', async () => {
      const store = useTabStore();

      const group1: TabGroup = {
        id: 'keep-1',
        name: 'Keep This',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      const group2: TabGroup = {
        id: 'delete-3',
        name: 'Delete This',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'keep-1': {
          ...group1,
          createdAt: group1.createdAt.toISOString(),
        },
        'delete-3': {
          ...group2,
          createdAt: group2.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      expect(store.tabGroups).toHaveLength(2);

      // Delete one group
      await store.deleteGroup('delete-3');

      // Verify only one deleted
      expect(store.tabGroups).toHaveLength(1);
      expect(store.tabGroups[0].id).toBe('keep-1');
    });
  });

  describe('deleteTab', () => {
    it('should delete a specific tab from a group', async () => {
      const store = useTabStore();

      const testGroup: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        createdAt: new Date(),
        tabs: [
          { id: 'tab-1', url: 'https://example1.com', title: 'Example 1' },
          { id: 'tab-2', url: 'https://example2.com', title: 'Example 2' },
          { id: 'tab-3', url: 'https://example3.com', title: 'Example 3' },
        ],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'group-1': {
          ...testGroup,
          createdAt: testGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      expect(store.tabGroups[0].tabs).toHaveLength(3);

      // Delete middle tab
      await store.deleteTab('group-1', 'tab-2');

      // Verify deletion
      expect(store.tabGroups[0].tabs).toHaveLength(2);
      expect(store.tabGroups[0].tabs.find((t) => t.id === 'tab-2')).toBeUndefined();
      expect(store.tabGroups[0].tabs.find((t) => t.id === 'tab-1')).toBeDefined();
      expect(store.tabGroups[0].tabs.find((t) => t.id === 'tab-3')).toBeDefined();
    });

    it('should not affect other groups when deleting tab', async () => {
      const store = useTabStore();

      const group1: TabGroup = {
        id: 'group-1',
        name: 'Group 1',
        createdAt: new Date(),
        tabs: [
          { id: 'tab-1', url: 'https://example1.com', title: 'Example 1' },
          { id: 'tab-2', url: 'https://example2.com', title: 'Example 2' },
        ],
        isHistory: false,
      };

      const group2: TabGroup = {
        id: 'group-2',
        name: 'Group 2',
        createdAt: new Date(),
        tabs: [{ id: 'tab-3', url: 'https://example3.com', title: 'Example 3' }],
        isHistory: false,
      };

      await tabGroupsStorage.setValue({
        'group-1': {
          ...group1,
          createdAt: group1.createdAt.toISOString(),
        },
        'group-2': {
          ...group2,
          createdAt: group2.createdAt.toISOString(),
        },
      });

      await store.loadGroups();

      // Delete tab from group 1
      await store.deleteTab('group-1', 'tab-1');

      // Verify group 1 affected
      const updatedGroup1 = store.tabGroups.find((g) => g.id === 'group-1');

      expect(updatedGroup1?.tabs).toHaveLength(1);

      // Verify group 2 unaffected
      const updatedGroup2 = store.tabGroups.find((g) => g.id === 'group-2');

      expect(updatedGroup2?.tabs).toHaveLength(1);
      expect(updatedGroup2?.tabs[0].id).toBe('tab-3');
    });
  });

  describe('convertToNamed', () => {
    it('should convert history group to named group', async () => {
      const store = useTabStore();

      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          ...historyGroup,
          createdAt: historyGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();
      expect(store.historyGroups).toHaveLength(1);
      expect(store.namedGroups).toHaveLength(0);

      // Convert to named
      await store.convertToNamed('history-1', 'My Named Group');

      // Verify conversion
      expect(store.historyGroups).toHaveLength(0);
      expect(store.namedGroups).toHaveLength(1);
      expect(store.namedGroups[0].name).toBe('My Named Group');
      expect(store.namedGroups[0].isHistory).toBe(false);
    });

    it('should preserve tabs when converting', async () => {
      const store = useTabStore();

      const historyGroup: TabGroup = {
        id: 'history-2',
        name: null,
        createdAt: new Date(),
        tabs: [
          { id: 'tab-1', url: 'https://example1.com', title: 'Example 1' },
          { id: 'tab-2', url: 'https://example2.com', title: 'Example 2' },
        ],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-2': {
          ...historyGroup,
          createdAt: historyGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();

      // Convert to named
      await store.convertToNamed('history-2', 'Converted Group');

      // Verify tabs preserved
      const convertedGroup = store.namedGroups[0];

      expect(convertedGroup.tabs).toHaveLength(2);
      expect(convertedGroup.tabs[0].url).toBe('https://example1.com');
      expect(convertedGroup.tabs[1].url).toBe('https://example2.com');
    });

    it('should preserve createdAt timestamp when converting', async () => {
      const store = useTabStore();

      const originalDate = new Date('2024-01-01T00:00:00Z');
      const historyGroup: TabGroup = {
        id: 'history-3',
        name: null,
        createdAt: originalDate,
        tabs: [],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-3': {
          ...historyGroup,
          createdAt: historyGroup.createdAt.toISOString(),
        },
      });

      await store.loadGroups();

      // Convert to named
      await store.convertToNamed('history-3', 'Converted');

      // Verify timestamp preserved
      const convertedGroup = store.namedGroups[0];

      expect(convertedGroup.createdAt.toISOString()).toBe(originalDate.toISOString());
    });
  });
});
