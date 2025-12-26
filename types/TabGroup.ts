/**
 * Represents an individual tab within a tab group
 */
export interface TabItem {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
}

/**
 * Represents a tab group (either History or Named)
 */
export interface TabGroup {
  id: string;
  name: string | null; // null for History_Tab_Groups
  createdAt: Date;
  tabs: TabItem[];
  isHistory: boolean;
}
