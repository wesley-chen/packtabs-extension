import type { TabGroup, TabItem } from '~/types/TabGroup';
import { saveTabGroup } from '~/utils/storage';
import { captureCurrentWindow, closeCurrentTabs, openTabs, openSingleTab } from '~/utils/tabManager';
import { settingsStorage } from '~/types/Storage';

export default defineBackground(() => {
  console.log('PackTabs background script initialized', { id: browser.runtime.id });

  // Handle extension icon click - open dashboard
  browser.action.onClicked.addListener(() => {
    const dashboardUrl = browser.runtime.getURL('/dashboard.html');
    void browser.tabs.create({
      url: dashboardUrl,
      active: true,
    });
  });

  // Listen for browser window closing to create History Tab Group
  // Note: In Manifest V3, we use windows.onRemoved instead of browser.runtime.onSuspend
  browser.windows.onRemoved.addListener(() => {
    void (async () => {
      try {
        // Get all remaining windows
        const windows = await browser.windows.getAll();

        // Only create history group if this was the last window
        if (windows.length === 0) {
          // Get all tabs from all windows before they close
          const allTabs = await browser.tabs.query({});

          if (allTabs.length > 0) {
            // Convert browser tabs to TabItem format
            const tabItems: TabItem[] = allTabs.map((tab) => ({
              id: crypto.randomUUID(),
              url: tab.url ?? '',
              title: tab.title ?? 'Untitled',
              faviconUrl: tab.favIconUrl,
            }));

            // Create History Tab Group
            const historyGroup: TabGroup = {
              id: crypto.randomUUID(),
              name: null, // null indicates History Tab Group
              createdAt: new Date(),
              tabs: tabItems,
              isHistory: true,
            };

            // Save to storage
            await saveTabGroup(historyGroup);

            console.log('History Tab Group created on browser close', historyGroup);
          }
        }
      } catch (error) {
        console.error('Error creating History Tab Group on window close:', error);
      }
    })();
  });

  // Message handler for tab capture and restoration operations
  browser.runtime.onMessage.addListener(
    (
      message: {
        type: string;
        name?: string;
        isHistory?: boolean;
        tabs?: TabItem[];
        tab?: TabItem;
      },
      _sender,
      sendResponse
    ) => {
      // Handle async operations properly
      void (async () => {
        try {
          switch (message.type) {
            case 'CAPTURE_TABS': {
              // Capture current window tabs
              const tabs = await captureCurrentWindow();

              // Create new tab group with timestamp
              const newGroup: TabGroup = {
                id: crypto.randomUUID(),
                name: message.name ?? null,
                createdAt: new Date(),
                tabs,
                isHistory: message.isHistory ?? false,
              };

              // Save to storage
              await saveTabGroup(newGroup);

              // Check if we should auto-close tabs
              const settings = await settingsStorage.getValue();
              if (settings.autoCloseAfterSave) {
                await closeCurrentTabs();
              }

              sendResponse({ success: true, group: newGroup });
              break;
            }

            case 'OPEN_TABS': {
              // Open all tabs from a group
              if (message.tabs) {
                await openTabs(message.tabs);
              }
              sendResponse({ success: true });
              break;
            }

            case 'OPEN_SINGLE_TAB': {
              // Open a single tab
              if (message.tab) {
                await openSingleTab(message.tab);
              }
              sendResponse({ success: true });
              break;
            }

            case 'CLOSE_CURRENT_TABS': {
              // Close all tabs in current window
              await closeCurrentTabs();
              sendResponse({ success: true });
              break;
            }

            default:
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        } catch (error) {
          console.error('Error handling message:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();

      // Return true to indicate we'll send response asynchronously
      return true;
    }
  );
});
