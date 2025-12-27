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
 * Custom error types for tab operations
 */
export class TabPermissionDeniedError extends Error {
  constructor(url: string) {
    super(`Permission denied to access tab: ${url}`);
    this.name = 'TabPermissionDeniedError';
  }
}

export class TabNotFoundError extends Error {
  constructor(tabId: string | number) {
    super(`Tab not found: ${String(tabId)}`);
    this.name = 'TabNotFoundError';
  }
}

export class InvalidUrlError extends Error {
  constructor(url: string) {
    super(`Invalid URL: ${url}`);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Validates and sanitizes a URL
 */
function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Check for restricted protocols
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'about:', 'data:', 'javascript:'];

    return !restrictedProtocols.some((protocol) => urlObj.protocol.startsWith(protocol));
  } catch {
    return false;
  }
}

/**
 * Captures all tabs from the current browser window
 * @returns Array of TabItem objects representing the captured tabs
 */
export async function captureCurrentWindow(): Promise<TabItem[]> {
  try {
    // Get the current window
    const currentWindow = await browser.windows.getCurrent();

    // Query all tabs in the current window
    const tabs = await browser.tabs.query({ windowId: currentWindow.id });

    // Map browser tabs to TabItem format, filtering out restricted URLs
    const tabItems: TabItem[] = tabs
      .filter((tab) => {
        // Skip tabs without URLs or with restricted URLs
        if (!tab.url) {
          return false;
        }

        try {
          const urlObj = new URL(tab.url);
          const restrictedProtocols = ['chrome:', 'chrome-extension:', 'about:'];

          return !restrictedProtocols.some((protocol) => urlObj.protocol.startsWith(protocol));
        } catch {
          return false;
        }
      })
      .map((tab) => ({
        id: crypto.randomUUID(),
        url: tab.url ?? '',
        title: tab.title ?? 'Untitled',
        faviconUrl: tab.favIconUrl,
      }));

    return tabItems;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      throw new TabPermissionDeniedError('current window');
    }
    throw error;
  }
}

/**
 * Opens all tabs from a tab group in the current window
 * @param tabs Array of TabItem objects to open
 */
export async function openTabs(tabs: TabItem[]): Promise<void> {
  try {
    // Get the current window
    const currentWindow = await browser.windows.getCurrent();

    // Open each tab in the current window
    for (const tab of tabs) {
      // Validate URL before opening
      if (!validateUrl(tab.url)) {
        console.warn(`Skipping invalid or restricted URL: ${tab.url}`);
        continue;
      }

      try {
        await browser.tabs.create({
          windowId: currentWindow.id,
          url: tab.url,
          active: false, // Don't switch to each tab as it opens
        });
      } catch (error) {
        // Log individual tab errors but continue with others
        console.error(`Failed to open tab ${tab.url}:`, error);

        if (error instanceof Error && error.message.includes('permission')) {
          throw new TabPermissionDeniedError(tab.url);
        }
      }
    }
  } catch (error) {
    if (error instanceof TabPermissionDeniedError) {
      throw error;
    }
    throw new Error(`Failed to open tabs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Opens a single tab in the current window
 * @param tab TabItem object to open
 */
export async function openSingleTab(tab: TabItem): Promise<void> {
  // Validate URL before opening
  if (!validateUrl(tab.url)) {
    throw new InvalidUrlError(tab.url);
  }

  try {
    // Get the current window
    const currentWindow = await browser.windows.getCurrent();

    // Open the tab in the current window
    await browser.tabs.create({
      windowId: currentWindow.id,
      url: tab.url,
      active: true, // Switch to the newly opened tab
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      throw new TabPermissionDeniedError(tab.url);
    }
    throw error;
  }
}

/**
 * Closes all tabs in the current window
 */
export async function closeCurrentTabs(): Promise<void> {
  try {
    // Get the current window
    const currentWindow = await browser.windows.getCurrent();

    // Query all tabs in the current window
    const tabs = await browser.tabs.query({ windowId: currentWindow.id });

    // Extract tab IDs
    const tabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    // Close all tabs
    if (tabIds.length > 0) {
      await browser.tabs.remove(tabIds);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('No tab with id')) {
      throw new TabNotFoundError('unknown');
    }
    throw error;
  }
}
