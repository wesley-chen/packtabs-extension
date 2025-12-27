import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  captureCurrentWindow,
  openTabs,
  openSingleTab,
  closeCurrentTabs,
  TabPermissionDeniedError,
  InvalidUrlError,
  TabNotFoundError,
} from '../../utils/tabManager';
import type { TabItem } from '../../types/TabGroup';

describe('Tab Manager Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission Denied Errors', () => {
    it('should filter out restricted chrome:// URLs when capturing', async () => {
      // Mock browser.windows.getCurrent
      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      // Mock browser.tabs.query with mix of valid and restricted URLs
      vi.spyOn(browser.tabs, 'query').mockResolvedValue([
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example',
          favIconUrl: 'https://example.com/favicon.ico',
        },
        {
          id: 2,
          url: 'chrome://settings',
          title: 'Settings',
          favIconUrl: undefined,
        },
        {
          id: 3,
          url: 'chrome-extension://abc123/popup.html',
          title: 'Extension',
          favIconUrl: undefined,
        },
        {
          id: 4,
          url: 'about:blank',
          title: 'Blank',
          favIconUrl: undefined,
        },
        {
          id: 5,
          url: 'https://another.com',
          title: 'Another',
          favIconUrl: undefined,
        },
      ] as any);

      const tabs = await captureCurrentWindow();

      // Should only capture the two valid URLs
      expect(tabs).toHaveLength(2);
      expect(tabs[0].url).toBe('https://example.com');
      expect(tabs[1].url).toBe('https://another.com');
    });

    it('should throw TabPermissionDeniedError when browser API denies permission', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockRejectedValue(new Error('permission denied'));

      await expect(captureCurrentWindow()).rejects.toThrow(TabPermissionDeniedError);
    });

    it('should skip invalid URLs when opening tabs', async () => {
      const tabs: TabItem[] = [
        { id: '1', url: 'https://example.com', title: 'Valid' },
        { id: '2', url: 'chrome://settings', title: 'Invalid' },
        { id: '3', url: 'https://another.com', title: 'Valid 2' },
      ];

      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      const createSpy = vi.spyOn(browser.tabs, 'create').mockResolvedValue({} as any);

      await openTabs(tabs);

      // Should only create tabs for valid URLs
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com' }));
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://another.com' }));
    });

    it('should throw TabPermissionDeniedError when tab creation is denied', async () => {
      const tabs: TabItem[] = [{ id: '1', url: 'https://example.com', title: 'Example' }];

      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      vi.spyOn(browser.tabs, 'create').mockRejectedValue(new Error('permission denied to create tab'));

      await expect(openTabs(tabs)).rejects.toThrow(TabPermissionDeniedError);
    });
  });

  describe('Invalid URL Handling', () => {
    it('should throw InvalidUrlError for invalid URL in openSingleTab', async () => {
      const invalidTab: TabItem = {
        id: '1',
        url: 'not-a-valid-url',
        title: 'Invalid',
      };

      await expect(openSingleTab(invalidTab)).rejects.toThrow(InvalidUrlError);
    });

    it('should throw InvalidUrlError for chrome:// URLs in openSingleTab', async () => {
      const restrictedTab: TabItem = {
        id: '1',
        url: 'chrome://settings',
        title: 'Settings',
      };

      await expect(openSingleTab(restrictedTab)).rejects.toThrow(InvalidUrlError);
    });

    it('should throw InvalidUrlError for javascript: URLs', async () => {
      const jsTab: TabItem = {
        id: '1',
        url: 'javascript:alert("xss")',
        title: 'XSS Attempt',
      };

      await expect(openSingleTab(jsTab)).rejects.toThrow(InvalidUrlError);
    });

    it('should throw InvalidUrlError for data: URLs', async () => {
      const dataTab: TabItem = {
        id: '1',
        url: 'data:text/html,<h1>Test</h1>',
        title: 'Data URL',
      };

      await expect(openSingleTab(dataTab)).rejects.toThrow(InvalidUrlError);
    });

    it('should allow valid http and https URLs', async () => {
      const validTab: TabItem = {
        id: '1',
        url: 'https://example.com',
        title: 'Example',
      };

      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      const createSpy = vi.spyOn(browser.tabs, 'create').mockResolvedValue({} as any);

      await openSingleTab(validTab);

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com' }));
    });
  });

  describe('Tab Not Found Errors', () => {
    it('should throw TabNotFoundError when closing non-existent tabs', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      vi.spyOn(browser.tabs, 'query').mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

      vi.spyOn(browser.tabs, 'remove').mockRejectedValue(new Error('No tab with id: 999'));

      await expect(closeCurrentTabs()).rejects.toThrow(TabNotFoundError);
    });

    it('should handle empty tab list when closing', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      vi.spyOn(browser.tabs, 'query').mockResolvedValue([]);

      const removeSpy = vi.spyOn(browser.tabs, 'remove');

      await closeCurrentTabs();

      // Should not attempt to remove any tabs
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Network Failure Handling', () => {
    it('should handle network errors when capturing tabs', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockRejectedValue(new Error('Network request failed'));

      await expect(captureCurrentWindow()).rejects.toThrow('Network request failed');
    });

    it('should handle network errors when opening tabs', async () => {
      const tabs: TabItem[] = [{ id: '1', url: 'https://example.com', title: 'Example' }];

      vi.spyOn(browser.windows, 'getCurrent').mockRejectedValue(new Error('Network request failed'));

      await expect(openTabs(tabs)).rejects.toThrow('Network request failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tabs without URLs', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      vi.spyOn(browser.tabs, 'query').mockResolvedValue([
        {
          id: 1,
          url: undefined,
          title: 'No URL',
          favIconUrl: undefined,
        },
        {
          id: 2,
          url: 'https://example.com',
          title: 'Has URL',
          favIconUrl: undefined,
        },
      ] as any);

      const tabs = await captureCurrentWindow();

      // Should only capture tab with URL
      expect(tabs).toHaveLength(1);
      expect(tabs[0].url).toBe('https://example.com');
    });

    it('should handle tabs without titles', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      vi.spyOn(browser.tabs, 'query').mockResolvedValue([
        {
          id: 1,
          url: 'https://example.com',
          title: undefined,
          favIconUrl: undefined,
        },
      ] as any);

      const tabs = await captureCurrentWindow();

      expect(tabs).toHaveLength(1);
      expect(tabs[0].title).toBe('Untitled');
    });

    it('should handle tabs with undefined IDs', async () => {
      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      vi.spyOn(browser.tabs, 'query').mockResolvedValue([
        {
          id: undefined,
          url: 'https://example.com',
          title: 'Example',
        },
        {
          id: 2,
          url: 'https://another.com',
          title: 'Another',
        },
      ] as any);

      const removeSpy = vi.spyOn(browser.tabs, 'remove').mockResolvedValue(undefined);

      await closeCurrentTabs();

      // Should only attempt to close tab with defined ID
      expect(removeSpy).toHaveBeenCalledWith([2]);
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(10000);
      const tab: TabItem = {
        id: '1',
        url: longUrl,
        title: 'Long URL',
      };

      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      const createSpy = vi.spyOn(browser.tabs, 'create').mockResolvedValue({} as any);

      await openSingleTab(tab);

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ url: longUrl }));
    });

    it('should handle special characters in URLs', async () => {
      const specialUrl = 'https://example.com/path?query=value&foo=bar#fragment';
      const tab: TabItem = {
        id: '1',
        url: specialUrl,
        title: 'Special URL',
      };

      vi.spyOn(browser.windows, 'getCurrent').mockResolvedValue({
        id: 1,
        focused: true,
        alwaysOnTop: false,
        incognito: false,
      } as any);

      const createSpy = vi.spyOn(browser.tabs, 'create').mockResolvedValue({} as any);

      await openSingleTab(tab);

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ url: specialUrl }));
    });
  });
});
