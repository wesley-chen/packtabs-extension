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
 * Custom error types for storage operations
 */
export class StorageQuotaExceededError extends Error {
  constructor(message = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

export class StorageSyncConflictError extends Error {
  constructor(message = 'Storage sync conflict detected') {
    super(message);
    this.name = 'StorageSyncConflictError';
  }
}

/**
 * Retry configuration for storage operations
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100, // ms
  maxDelay: 2000, // ms
  backoffMultiplier: 2,
};

/**
 * Executes a storage operation with exponential backoff retry logic
 */
async function withRetry<T>(operation: () => Promise<T>, retries: number = RETRY_CONFIG.maxRetries): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is quota exceeded
      if (lastError.message.includes('QUOTA_BYTES') || lastError.message.includes('quota')) {
        throw new StorageQuotaExceededError(lastError.message);
      }

      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Storage operation failed');
}

/**
 * Resolves sync conflicts using timestamp-based resolution (most recent wins)
 */
async function resolveSyncConflict(
  localGroup: TabGroup,
  remoteGroup: StorageSchema['tabGroups'][string]
): Promise<StorageSchema['tabGroups'][string]> {
  const localTimestamp = localGroup.createdAt.getTime();
  const remoteTimestamp = new Date(remoteGroup.createdAt).getTime();

  // Keep the most recent version
  if (localTimestamp >= remoteTimestamp) {
    return serializeTabGroup(localGroup);
  } else {
    return remoteGroup;
  }
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
  await withRetry(async () => {
    const allGroups = await tabGroupsStorage.getValue();
    const serialized = serializeTabGroup(group);

    // Check for sync conflicts if group already exists
    if (allGroups[group.id]) {
      const resolved = await resolveSyncConflict(group, allGroups[group.id]);
      allGroups[group.id] = resolved;
    } else {
      allGroups[group.id] = serialized;
    }

    await tabGroupsStorage.setValue(allGroups);
  });
}

/**
 * Retrieves all tab groups from storage
 */
export async function getTabGroups(): Promise<TabGroup[]> {
  return await withRetry(async () => {
    const allGroups = await tabGroupsStorage.getValue();

    return Object.values(allGroups).map((stored) => deserializeTabGroup(stored));
  });
}

/**
 * Updates a tab group with partial data
 */
export async function updateTabGroup(id: string, updates: Partial<TabGroup>): Promise<void> {
  await withRetry(async () => {
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
  });
}

/**
 * Deletes a tab group from storage
 */
export async function deleteTabGroup(id: string): Promise<void> {
  await withRetry(async () => {
    const allGroups = await tabGroupsStorage.getValue();

    if (!allGroups[id]) {
      throw new Error(`Tab group with id ${id} not found`);
    }

    delete allGroups[id];
    await tabGroupsStorage.setValue(allGroups);
  });
}

/**
 * Deletes a specific tab from a tab group
 */
export async function deleteTabFromGroup(groupId: string, tabId: string): Promise<void> {
  await withRetry(async () => {
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
  });
}
