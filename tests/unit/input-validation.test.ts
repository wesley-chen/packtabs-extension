import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTabStore } from '../../stores/useTabStore';
import { setStoreErrorHandler } from '../../stores/useTabStore';
import { tabGroupsStorage } from '../../types/Storage';
import type { TabGroup } from '../../types/TabGroup';

describe('User Input Validation', () => {
  let store: ReturnType<typeof useTabStore>;
  let capturedErrors: Error[] = [];

  beforeEach(async () => {
    // Set up Pinia
    setActivePinia(createPinia());

    // Clear storage
    await tabGroupsStorage.setValue({});

    // Reset error capture
    capturedErrors = [];

    // Set up error handler to capture errors
    setStoreErrorHandler((error: Error) => {
      capturedErrors.push(error);
    });

    // Create fresh store instance
    store = useTabStore();
    await store.loadGroups();
  });

  describe('Group Name Validation', () => {
    it('should reject empty group name when converting', async () => {
      // Create a history group first
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Try to convert with empty name - should not throw but capture error
      try {
        await store.convertToNamed('history-1', '');
      } catch {
        // Error is expected to be caught by error handler
      }

      // Should have captured an error
      expect(capturedErrors.length).toBeGreaterThan(0);
      expect(capturedErrors[0].message).toContain('cannot be empty');
    });

    it('should reject whitespace-only group name', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Try to convert with whitespace-only name
      try {
        await store.convertToNamed('history-1', '   ');
      } catch {
        // Error is expected to be caught by error handler
      }

      // Should have captured an error
      expect(capturedErrors.length).toBeGreaterThan(0);
      expect(capturedErrors[0].message).toContain('cannot be empty');
    });

    it('should accept valid group name', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Convert with valid name
      await store.convertToNamed('history-1', 'My Group');

      // Should not have captured any errors
      expect(capturedErrors.length).toBe(0);

      // Verify the group was converted
      await store.loadGroups();
      const group = store.tabGroups.find((g) => g.id === 'history-1');
      expect(group?.name).toBe('My Group');
      expect(group?.isHistory).toBe(false);
    });

    it('should trim whitespace from group names', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Convert with name that has leading/trailing whitespace
      await store.convertToNamed('history-1', '  My Group  ');

      // Should not have captured any errors
      expect(capturedErrors.length).toBe(0);

      // Verify the group name was trimmed
      await store.loadGroups();
      const group = store.tabGroups.find((g) => g.id === 'history-1');
      expect(group?.name).toBe('My Group');
    });

    it('should accept group names with special characters', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Convert with name containing special characters
      await store.convertToNamed('history-1', 'Work <Project> & Tasks #1');

      // Should not have captured any errors
      expect(capturedErrors.length).toBe(0);

      // Verify the group was converted with special characters
      await store.loadGroups();
      const group = store.tabGroups.find((g) => g.id === 'history-1');
      expect(group?.name).toBe('Work <Project> & Tasks #1');
    });

    it('should accept very long group names', async () => {
      const longName = 'A'.repeat(1000);
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Convert with very long name
      await store.convertToNamed('history-1', longName);

      // Should not have captured any errors
      expect(capturedErrors.length).toBe(0);

      // Verify the group was converted
      await store.loadGroups();
      const group = store.tabGroups.find((g) => g.id === 'history-1');
      expect(group?.name).toBe(longName);
    });
  });

  describe('Error Message Clarity', () => {
    it('should provide clear error message for empty name', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      try {
        await store.convertToNamed('history-1', '');
      } catch {
        // Error is expected to be caught by error handler
      }

      expect(capturedErrors.length).toBeGreaterThan(0);
      expect(capturedErrors[0].message).toBe('Group name cannot be empty');
    });

    it('should provide clear error message for non-existent group', async () => {
      try {
        await store.convertToNamed('non-existent', 'New Name');
      } catch {
        // Error is expected to be caught by error handler
      }

      expect(capturedErrors.length).toBeGreaterThan(0);
      expect(capturedErrors[0].message).toContain('not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null name input', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Try to convert with null name (TypeScript would prevent this, but test runtime behavior)
      try {
        await store.convertToNamed('history-1', null as any);
      } catch {
        // Error is expected to be caught by error handler
      }

      // Should have captured an error
      expect(capturedErrors.length).toBeGreaterThan(0);
    });

    it('should handle undefined name input', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Try to convert with undefined name
      try {
        await store.convertToNamed('history-1', undefined as any);
      } catch {
        // Error is expected to be caught by error handler
      }

      // Should have captured an error
      expect(capturedErrors.length).toBeGreaterThan(0);
    });

    it('should handle numeric name input by converting to string', async () => {
      const historyGroup: TabGroup = {
        id: 'history-1',
        name: null,
        createdAt: new Date(),
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Example' }],
        isHistory: true,
      };

      await tabGroupsStorage.setValue({
        'history-1': {
          id: 'history-1',
          name: null,
          createdAt: historyGroup.createdAt.toISOString(),
          tabs: historyGroup.tabs,
          isHistory: true,
        },
      });

      await store.loadGroups();

      // Convert with numeric name - need to convert to string first
      await store.convertToNamed('history-1', String(123));

      // Should not have captured any errors
      expect(capturedErrors.length).toBe(0);

      // Verify the group was converted
      await store.loadGroups();
      const group = store.tabGroups.find((g) => g.id === 'history-1');
      expect(group?.name).toBe('123');
    });
  });
});
