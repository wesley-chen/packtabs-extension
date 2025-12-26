import type { TabGroup } from '../types/TabGroup';
import { tabGroupsStorage } from '../types/Storage';
import type { StorageSchema } from '../types/Storage';

/**
 * Storage service interface for tab group operations
 */
export interface StorageService {
  saveTabGroup(group: TabGroup): Promise<void>;
  getTabGroups(): Promise<TabGroup[]>;
  updateTabGroup(id: string, updates: Partial<TabGroup>): Promise<void>;
  deleteTabGroup(id: string): Promise<void>;
  deleteTabFromGroup(groupId: string, tabId: string): Promise<void>;
}

/**
 * Serializes a TabGroup for storage (converts Date to ISO string)
 */
function serializeTabGroup(group: TabGroup): StorageSchema['tabGroups'][string] {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.toISOString(),
    tabs: group.tabs,
    isHistory: group.isHistory,
  };
}

/**
 * Deserializes a stored tab group (converts ISO string to Date)
 */
function deserializeTabGroup(stored: StorageSchema['tabGroups'][string]): TabGroup {
  return {
    id: stored.id,
    name: stored.name,
    createdAt: new Date(stored.createdAt),
    tabs: stored.tabs,
    isHistory: stored.isHistory,
  };
}

/**
 * Saves a tab group to storage
 */
export async function saveTabGroup(group: TabGroup): Promise<void> {
  const allGroups = await tabGroupsStorage.getValue();
  const serialized = serializeTabGroup(group);
  
  allGroups[group.id] = serialized;
  await tabGroupsStorage.setValue(allGroups);
}

/**
 * Retrieves all tab groups from storage
 */
export async function getTabGroups(): Promise<TabGroup[]> {
  const allGroups = await tabGroupsStorage.getValue();
  
  return Object.values(allGroups).map((stored) => 
    deserializeTabGroup(stored as StorageSchema['tabGroups'][string])
  );
}

/**
 * Updates a tab group with partial data
 */
export async function updateTabGroup(id: string, updates: Partial<TabGroup>): Promise<void> {
  const allGroups = await tabGroupsStorage.getValue();
  const existing = allGroups[id];
  
  if (!existing) {
    throw new Error(`Tab group with id ${id} not found`);
  }
  
  // Deserialize existing group, apply updates, then serialize back
  const existingGroup = deserializeTabGroup(existing);
  const updatedGroup: TabGroup = {
    ...existingGroup,
    ...updates,
    // Ensure id cannot be changed
    id: existingGroup.id,
  };
  
  allGroups[id] = serializeTabGroup(updatedGroup);
  await tabGroupsStorage.setValue(allGroups);
}

/**
 * Deletes a tab group from storage
 */
export async function deleteTabGroup(id: string): Promise<void> {
  const allGroups = await tabGroupsStorage.getValue();
  
  if (!allGroups[id]) {
    throw new Error(`Tab group with id ${id} not found`);
  }
  
  delete allGroups[id];
  await tabGroupsStorage.setValue(allGroups);
}

/**
 * Deletes a specific tab from a tab group
 */
export async function deleteTabFromGroup(groupId: string, tabId: string): Promise<void> {
  const allGroups = await tabGroupsStorage.getValue();
  const group = allGroups[groupId];
  
  if (!group) {
    throw new Error(`Tab group with id ${groupId} not found`);
  }
  
  const tabIndex = group.tabs.findIndex((tab: { id: string }) => tab.id === tabId);
  
  if (tabIndex === -1) {
    throw new Error(`Tab with id ${tabId} not found in group ${groupId}`);
  }
  
  // Remove the tab from the array
  group.tabs.splice(tabIndex, 1);
  
  await tabGroupsStorage.setValue(allGroups);
}
