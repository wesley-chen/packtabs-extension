/**
 * Storage schema for the extension
 */
export interface StorageSchema {
  // WXT storage key: 'sync:tabGroups'
  tabGroups: {
    [groupId: string]: {
      id: string;
      name: string | null;
      createdAt: string; // ISO date string for serialization
      tabs: {
        id: string;
        url: string;
        title: string;
        faviconUrl?: string;
      }[];
      isHistory: boolean;
    };
  };

  // WXT storage key: 'sync:settings'
  settings: {
    autoCloseAfterSave: boolean;
    maxHistoryGroups: number;
  };
}

/**
 * WXT storage item for tab groups
 */
export const tabGroupsStorage = storage.defineItem<StorageSchema['tabGroups']>(
  'sync:tabGroups',
  { defaultValue: {} }
);

/**
 * WXT storage item for settings
 */
export const settingsStorage = storage.defineItem<StorageSchema['settings']>(
  'sync:settings',
  {
    defaultValue: {
      autoCloseAfterSave: true,
      maxHistoryGroups: 10,
    },
  }
);
