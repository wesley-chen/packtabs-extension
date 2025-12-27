import { defineStore } from 'pinia';
import { computed,ref } from 'vue';

import type { TabGroup } from '~/types/TabGroup';
import {
  deleteTabFromGroup as deleteTabFromGroupInStorage,
  deleteTabGroup as deleteTabGroupFromStorage,
  getTabGroups,
  saveTabGroup as saveTabGroupToStorage,
  StorageQuotaExceededError,
  updateTabGroup as updateTabGroupInStorage,
} from '~/utils/storage';
import { captureCurrentWindow, TabPermissionDeniedError } from '~/utils/tabManager';

/**
 * Error handler that can be set from the Vue app
 */
let errorHandler: ((error: Error) => void) | null = null;

/**
 * Sets the error handler for the store
 */
export function setStoreErrorHandler(handler: (error: Error) => void) {
  errorHandler = handler;
}

/**
 * Handles errors with user-friendly messages
 */
function handleError(error: unknown, defaultMessage: string): never {
  const err = error instanceof Error ? error : new Error(String(error));

  // Use error handler if available
  if (errorHandler) {
    errorHandler(err);
  } else {
    console.error(defaultMessage, err);
  }

  throw err;
}

/**
 * Pinia store for managing tab groups
 */
export const useTabStore = defineStore('tabs', () => {
  // State
  const tabGroups = ref<TabGroup[]>([]);
  const selectedGroupId = ref<string | null>(null);

  // Computed properties
  const historyGroups = computed(() => tabGroups.value.filter((g) => g.isHistory));

  const namedGroups = computed(() => tabGroups.value.filter((g) => !g.isHistory));

  const selectedGroup = computed(() => tabGroups.value.find((g) => g.id === selectedGroupId.value) ?? null);

  // Actions
  /**
   * Loads all tab groups from storage
   */
  async function loadGroups(): Promise<void> {
    try {
      tabGroups.value = await getTabGroups();
    } catch (error) {
      handleError(error, 'Failed to load tab groups');
    }
  }

  /**
   * Saves a new tab group by capturing current window tabs
   * @param name Optional name for the group (null for history groups)
   * @param isHistory Whether this is a history group
   */
  async function saveGroup(name: string | null = null, isHistory = false): Promise<TabGroup> {
    try {
      // Capture current window tabs
      const tabs = await captureCurrentWindow();

      if (tabs.length === 0) {
        throw new Error('No tabs to save');
      }

      // Create new tab group
      const newGroup: TabGroup = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date(),
        tabs,
        isHistory,
      };

      // Save to storage
      await saveTabGroupToStorage(newGroup);

      // Update local state
      await loadGroups();

      return newGroup;
    } catch (error) {
      if (error instanceof StorageQuotaExceededError) {
        handleError(error, 'Storage quota exceeded. Please delete some tab groups to free up space.');
      } else if (error instanceof TabPermissionDeniedError) {
        handleError(error, 'Permission denied to access some tabs. Restricted tabs were skipped.');
      } else {
        handleError(error, 'Failed to save tab group');
      }
      throw error; // Re-throw to satisfy TypeScript
    }
  }

  /**
   * Updates an existing tab group
   * @param id Group ID to update
   * @param updates Partial updates to apply
   */
  async function updateGroup(id: string, updates: Partial<TabGroup>): Promise<void> {
    try {
      await updateTabGroupInStorage(id, updates);
      await loadGroups();
    } catch (error) {
      if (error instanceof StorageQuotaExceededError) {
        handleError(error, 'Storage quota exceeded. Cannot update tab group.');
      } else {
        handleError(error, 'Failed to update tab group');
      }
    }
  }

  /**
   * Deletes a tab group
   * @param id Group ID to delete
   */
  async function deleteGroup(id: string): Promise<void> {
    try {
      await deleteTabGroupFromStorage(id);
      await loadGroups();

      // Clear selection if deleted group was selected
      if (selectedGroupId.value === id) {
        selectedGroupId.value = null;
      }
    } catch (error) {
      handleError(error, 'Failed to delete tab group');
    }
  }

  /**
   * Deletes a single tab from a group
   * @param groupId Group ID containing the tab
   * @param tabId Tab ID to delete
   */
  async function deleteTab(groupId: string, tabId: string): Promise<void> {
    try {
      await deleteTabFromGroupInStorage(groupId, tabId);
      await loadGroups();
    } catch (error) {
      handleError(error, 'Failed to delete tab');
    }
  }

  /**
   * Converts a history group to a named group
   * @param groupId Group ID to convert
   * @param name New name for the group
   */
  async function convertToNamed(groupId: string, name: string): Promise<void> {
    try {
      if (!name || name.trim().length === 0) {
        throw new Error('Group name cannot be empty');
      }

      await updateTabGroupInStorage(groupId, {
        name: name.trim(),
        isHistory: false,
      });
      await loadGroups();
    } catch (error) {
      handleError(error, 'Failed to convert tab group');
    }
  }

  return {
    // State
    tabGroups,
    selectedGroupId,
    // Computed
    historyGroups,
    namedGroups,
    selectedGroup,
    // Actions
    loadGroups,
    saveGroup,
    updateGroup,
    deleteGroup,
    deleteTab,
    convertToNamed,
  };
});
