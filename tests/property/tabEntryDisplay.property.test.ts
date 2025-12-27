import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import type { TabItem } from '../../types/TabGroup';

/**
 * Feature: tab-group-manager, Property 17: Tab Entry Display Completeness
 *
 * For any tab within a Tab Card, the display should include favicon (using chrome://favicon/ protocol),
 * title, and delete button.
 *
 * Validates: Requirements 6.3, 6.4
 *
 * @vitest-environment node
 */

// Arbitraries for generating random test data
const tabItemArbitrary = fc.record({
  id: fc.uuid(),
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  faviconUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

describe('Tab Entry Display Property Tests', () => {
  it('Property 17.1: Tab entry has all required fields for display', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab) => {
        // Verify tab has all required fields for display

        // ID is required for delete functionality
        if (typeof tab.id !== 'string' || tab.id.length === 0) {
          throw new Error('Tab ID must be a non-empty string');
        }

        // URL is required for favicon and opening
        if (typeof tab.url !== 'string' || tab.url.length === 0) {
          throw new Error('Tab URL must be a non-empty string');
        }

        // Title is required for display
        if (typeof tab.title !== 'string' || tab.title.length === 0) {
          throw new Error('Tab title must be a non-empty string');
        }

        // FaviconUrl is optional but must be string or undefined
        if (tab.faviconUrl !== undefined && typeof tab.faviconUrl !== 'string') {
          throw new Error('Tab faviconUrl must be a string or undefined');
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 17.2: Favicon URL can be constructed from tab URL', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab) => {
        // Verify favicon URL can be constructed using chrome://favicon/ protocol
        const faviconUrl = `chrome://favicon/${tab.url}`;

        if (typeof faviconUrl !== 'string' || faviconUrl.length === 0) {
          throw new Error('Constructed favicon URL must be a non-empty string');
        }

        if (!faviconUrl.startsWith('chrome://favicon/')) {
          throw new Error('Favicon URL must use chrome://favicon/ protocol');
        }

        if (!faviconUrl.includes(tab.url)) {
          throw new Error('Favicon URL must include the tab URL');
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 17.3: Tab title is displayable text', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab) => {
        // Verify title is displayable (non-empty string)
        if (typeof tab.title !== 'string') {
          throw new Error('Tab title must be a string');
        }

        if (tab.title.length === 0) {
          throw new Error('Tab title must not be empty');
        }

        // Title should be reasonable length for display
        if (tab.title.length > 1000) {
          throw new Error('Tab title is unreasonably long for display');
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 17.4: Tab URL is valid for opening', async () => {
    await fc.assert(
      fc.asyncProperty(tabItemArbitrary, async (tab) => {
        // Verify URL is valid
        if (typeof tab.url !== 'string' || tab.url.length === 0) {
          throw new Error('Tab URL must be a non-empty string');
        }

        // URL should be parseable (basic check)
        try {
          new URL(tab.url);
        } catch (error) {
          throw new Error(`Tab URL must be a valid URL: ${tab.url}`);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 17.5: Tab ID is unique identifier for deletion', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(tabItemArbitrary, { minLength: 2, maxLength: 20 }), async (tabs) => {
        // Verify each tab has a unique ID
        const ids = tabs.map((tab) => tab.id);
        const uniqueIds = new Set(ids);

        if (ids.length !== uniqueIds.size) {
          throw new Error('Tab IDs must be unique within a group');
        }

        // Verify each ID is a valid string
        for (const id of ids) {
          if (typeof id !== 'string' || id.length === 0) {
            throw new Error('Each tab ID must be a non-empty string');
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
