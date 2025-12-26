import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TabGroup } from '~/types/TabGroup';
import { 
  getTabGroups, 
  saveTabGroup as saveTabGroupToStorage,
  updateTabGroup as updateTabGroupInStorage,
  deleteTabGroup as deleteTabGroupFromStorage,
  deleteTabFromGroup as deleteTabFromGroupInStorage
} from '~/utils/storage';
import { captureCurrentWindow } from '~/utils/tabManager';

/**
 * Pinia store for managing tab groups
 */
export const useTabStore = defineStore('tabs', () => {
  // State
  const tabGroups = ref<TabGroup[]>([]);
  const selectedGroupId = ref<string | null>(null);

  // Computed properties
  const historyGroups = computed(() => 
    tabGroups.value.filter(g => g.isHistory)
  );

  const namedGroups = computed(() => 
    tabGroups.value.filter(g => !g.isHistory)
  );

  const selectedGroup = computed(() => 
    tabGroups.value.find(g => g.id === selectedGroupId.value) || null
  );

  // Actions
  /**
   * Loads all tab groups from storage
   */
  async function loadGroups(): Promise<void> {
    tabGroups.value = await getTabGroups();
  }

  /**
   * Saves a new tab group by capturing current window tabs
   * @param name Optional name for the group (null for history groups)
   * @param isHistory Whether this is a history group
   */
  async function saveGroup(name: string | null = null, isHistory: boolean = false): Promise<TabGroup> {
    // Capture current window tabs
    const tabs = await captureCurrentWindow();
    
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
  }

  /**
   * Updates an existing tab group
   * @param id Group ID to update
   * @param updates Partial updates to apply
   */
  async function updateGroup(id: string, updates: Partial<TabGroup>): Promise<void> {
    await updateTabGroupInStorage(id, updates);
    await loadGroups();
  }

  /**
   * Deletes a tab group
   * @param id Group ID to delete
   */
  async function deleteGroup(id: string): Promise<void> {
    await deleteTabGroupFromStorage(id);
    await loadGroups();
    
    // Clear selection if deleted group was selected
    if (selectedGroupId.value === id) {
      selectedGroupId.value = null;
    }
  }

  /**
   * Deletes a single tab from a group
   * @param groupId Group ID containing the tab
   * @param tabId Tab ID to delete
   */
  async function deleteTab(groupId: string, tabId: string): Promise<void> {
    await deleteTabFromGroupInStorage(groupId, tabId);
    await loadGroups();
  }

  /**
   * Converts a history group to a named group
   * @param groupId Group ID to convert
   * @param name New name for the group
   */
  async function convertToNamed(groupId: string, name: string): Promise<void> {
    await updateTabGroupInStorage(groupId, {
      name,
      isHistory: false,
    });
    await loadGroups();
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