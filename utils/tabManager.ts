import type { TabItem } from '~/types/TabGroup';

/**
 * Interface for tab management operations
 */
export interface TabManager {
  captureCurrentWindow(): Promise<TabItem[]>;
  openTabs(tabs: TabItem[]): Promise<void>;
  openSingleTab(tab: TabItem): Promise<void>;
  closeCurrentTabs(): Promise<void>;
}

/**
 * Captures all tabs from the current browser window
 * @returns Array of TabItem objects representing the captured tabs
 */
export async function captureCurrentWindow(): Promise<TabItem[]> {
  // Get the current window
  const currentWindow = await browser.windows.getCurrent();
  
  // Query all tabs in the current window
  const tabs = await browser.tabs.query({ windowId: currentWindow.id });
  
  // Map browser tabs to TabItem format
  const tabItems: TabItem[] = tabs.map((tab) => ({
    id: crypto.randomUUID(),
    url: tab.url || '',
    title: tab.title || 'Untitled',
    faviconUrl: tab.favIconUrl
  }));
  
  return tabItems;
}

/**
 * Opens all tabs from a tab group in the current window
 * @param tabs Array of TabItem objects to open
 */
export async function openTabs(tabs: TabItem[]): Promise<void> {
  // Get the current window
  const currentWindow = await browser.windows.getCurrent();
  
  // Open each tab in the current window
  for (const tab of tabs) {
    await browser.tabs.create({
      windowId: currentWindow.id,
      url: tab.url,
      active: false // Don't switch to each tab as it opens
    });
  }
}

/**
 * Opens a single tab in the current window
 * @param tab TabItem object to open
 */
export async function openSingleTab(tab: TabItem): Promise<void> {
  // Get the current window
  const currentWindow = await browser.windows.getCurrent();
  
  // Open the tab in the current window
  await browser.tabs.create({
    windowId: currentWindow.id,
    url: tab.url,
    active: true // Switch to the newly opened tab
  });
}

/**
 * Closes all tabs in the current window
 */
export async function closeCurrentTabs(): Promise<void> {
  // Get the current window
  const currentWindow = await browser.windows.getCurrent();
  
  // Query all tabs in the current window
  const tabs = await browser.tabs.query({ windowId: currentWindow.id });
  
  // Extract tab IDs
  const tabIds = tabs
    .map(tab => tab.id)
    .filter((id): id is number => id !== undefined);
  
  // Close all tabs
  if (tabIds.length > 0) {
    await browser.tabs.remove(tabIds);
  }
}
