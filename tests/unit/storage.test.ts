import { describe, it, expect, beforeEach } from 'vitest';
import { saveTabGroup, getTabGroups, updateTabGroup, deleteTabGroup, deleteTabFromGroup } from '../../utils/storage';
import type { TabGroup } from '../../types/TabGroup';
import { tabGroupsStorage } from '../../types/Storage';

describe('Storage Service', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await tabGroupsStorage.setValue({});
  });

  describe('saveTabGroup', () => {
    it('should save a tab group to storage', async () => {
      const testGroup: TabGroup = {
        id: 'test-1',
        name: 'Test Group',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        tabs: [
          {
            id: 'tab-1',
            url: 'https://example.com',
            title: 'Example',
            faviconUrl: 'https://example.com/favicon.ico',
          },
        ],
        isHistory: false,
      };

      await saveTabGroup(testGroup);

      const groups = await getTabGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('test-1');
      expect(groups[0].name).toBe('Test Group');
      expect(groups[0].tabs).toHaveLength(1);
    });

    it('should serialize Date objects correctly', async () => {
      const testDate = new Date('2024-01-01T12:30:00Z');
      const testGroup: TabGroup = {
        id: 'test-2',
        name: 'Date Test',
        createdAt: testDate,
        tabs: [],
        isHistory: false,
      };

      await saveTabGroup(testGroup);

      const groups = await getTabGroups();
      expect(groups[0].createdAt).toBeInstanceOf(Date);
      expect(groups[0].createdAt.toISOString()).toBe(testDate.toISOString());
    });
  });

  describe('getTabGroups', () => {
    it('should return empty array when no groups exist', async () => {
      const groups = await getTabGroups();
      expect(groups).toEqual([]);
    });

    it('should retrieve multiple tab groups', async () => {
      const group1: TabGroup = {
        id: 'group-1',
        name: 'Group 1',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      const group2: TabGroup = {
        id: 'group-2',
        name: null,
        createdAt: new Date(),
        tabs: [],
        isHistory: true,
      };

      await saveTabGroup(group1);
      await saveTabGroup(group2);

      const groups = await getTabGroups();
      expect(groups).toHaveLength(2);
    });
  });

  describe('updateTabGroup', () => {
    it('should update tab group properties', async () => {
      const originalGroup: TabGroup = {
        id: 'update-1',
        name: 'Original Name',
        createdAt: new Date(),
        tabs: [],
        isHistory: true,
      };

      await saveTabGroup(originalGroup);

      await updateTabGroup('update-1', {
        name: 'Updated Name',
        isHistory: false,
      });

      const groups = await getTabGroups();
      expect(groups[0].name).toBe('Updated Name');
      expect(groups[0].isHistory).toBe(false);
    });

    it('should throw error when updating non-existent group', async () => {
      await expect(updateTabGroup('non-existent', { name: 'Test' })).rejects.toThrow(
        'Tab group with id non-existent not found'
      );
    });

    it('should not allow changing the id', async () => {
      const group: TabGroup = {
        id: 'original-id',
        name: 'Test',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await saveTabGroup(group);

      await updateTabGroup('original-id', {
        id: 'new-id' as any,
        name: 'Updated',
      });

      const groups = await getTabGroups();
      expect(groups[0].id).toBe('original-id');
    });
  });

  describe('deleteTabGroup', () => {
    it('should delete a tab group', async () => {
      const group: TabGroup = {
        id: 'delete-1',
        name: 'To Delete',
        createdAt: new Date(),
        tabs: [],
        isHistory: false,
      };

      await saveTabGroup(group);
      expect(await getTabGroups()).toHaveLength(1);

      await deleteTabGroup('delete-1');
      expect(await getTabGroups()).toHaveLength(0);
    });

    it('should throw error when deleting non-existent group', async () => {
      await expect(deleteTabGroup('non-existent')).rejects.toThrow('Tab group with id non-existent not found');
    });
  });

  describe('deleteTabFromGroup', () => {
    it('should delete a specific tab from a group', async () => {
      const group: TabGroup = {
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

      await saveTabGroup(group);

      await deleteTabFromGroup('group-1', 'tab-2');

      const groups = await getTabGroups();
      expect(groups[0].tabs).toHaveLength(2);
      expect(groups[0].tabs.find((t) => t.id === 'tab-2')).toBeUndefined();
      expect(groups[0].tabs.find((t) => t.id === 'tab-1')).toBeDefined();
      expect(groups[0].tabs.find((t) => t.id === 'tab-3')).toBeDefined();
    });

    it('should throw error when group does not exist', async () => {
      await expect(deleteTabFromGroup('non-existent', 'tab-1')).rejects.toThrow(
        'Tab group with id non-existent not found'
      );
    });

    it('should throw error when tab does not exist in group', async () => {
      const group: TabGroup = {
        id: 'group-1',
        name: 'Test',
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: false,
      };

      await saveTabGroup(group);

      await expect(deleteTabFromGroup('group-1', 'non-existent-tab')).rejects.toThrow(
        'Tab with id non-existent-tab not found in group group-1'
      );
    });
  });
});
