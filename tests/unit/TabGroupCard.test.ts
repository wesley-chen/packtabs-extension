import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { beforeEach, describe, expect, it } from 'vitest';

import TabGroupCard from '../../components/TabGroupCard.vue';
import type { TabGroup } from '../../types/TabGroup';

/**
 * Unit tests for TabGroupCard component
 * Tests button click handlers, inline editing, and conditional rendering
 * Requirements: 3.2, 4.1, 4.3, 6.5
 *
 * @vitest-environment jsdom
 */

describe('TabGroupCard Component', () => {
  let pinia: ReturnType<typeof createPinia>;
  let mockGroup: TabGroup;

  beforeEach(() => {
    // Create fresh Pinia instance
    pinia = createPinia();
    setActivePinia(pinia);

    // Create mock tab group
    mockGroup = {
      id: 'test-group-1',
      name: 'Test Group',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      tabs: [
        {
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example Site',
          faviconUrl: 'https://example.com/favicon.ico',
        },
        {
          id: 'tab-2',
          url: 'https://test.com',
          title: 'Test Site',
          faviconUrl: undefined,
        },
      ],
      isHistory: false,
    };
  });

  it('renders tab group with correct title', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('Test Group');
  });

  it('displays "History Tab Group" for groups without name', () => {
    const historyGroup = { ...mockGroup, name: null, isHistory: true };
    const wrapper = mount(TabGroupCard, {
      props: { group: historyGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('History Tab Group');
  });

  it('displays correct tab count', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('2 tabs');
  });

  it('displays formatted creation date', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    // Check for date components (format may vary by locale)
    const text = wrapper.text();

    expect(text).toMatch(/2024/);
    expect(text).toMatch(/Jan/);
  });

  it('shows Save button for history groups', () => {
    const historyGroup = { ...mockGroup, isHistory: true };
    const wrapper = mount(TabGroupCard, {
      props: { group: historyGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('Save');
    expect(wrapper.text()).not.toContain('Update');
  });

  it('shows Update button for named groups', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('Update');
    expect(wrapper.text()).not.toContain('Save');
  });

  it('shows name input dialog when Save button clicked on history group', async () => {
    const historyGroup = { ...mockGroup, isHistory: true };
    const wrapper = mount(TabGroupCard, {
      props: { group: historyGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    // Find and click Save button
    const saveButton = wrapper.findAll('button').find((btn) => btn.text().includes('Save'));

    expect(saveButton).toBeDefined();

    if (saveButton) {
      await saveButton.trigger('click');
      await wrapper.vm.$nextTick();

      // Check that the dialog is visible
      const dialog = wrapper.findComponent({ name: 'Dialog' });

      expect(dialog.exists()).toBe(true);
      expect(dialog.props('visible')).toBe(true);

      // Check that the dialog has the correct header
      expect(dialog.props('header')).toBe('Name Tab Group');
    }
  });

  it('enables inline editing when edit button clicked', async () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    // Find edit button
    const editButton = wrapper.find('[aria-label="Edit group name"]');

    expect(editButton.exists()).toBe(true);

    // Click edit button
    await editButton.trigger('click');

    // Check that input field appears
    const input = wrapper.find('input[type="text"]');

    expect(input.exists()).toBe(true);
  });

  it('renders all tabs in the group', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('Example Site');
    expect(wrapper.text()).toContain('Test Site');
  });

  it('displays Open All button', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('Open All');
  });

  it('displays Delete button', () => {
    const wrapper = mount(TabGroupCard, {
      props: { group: mockGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    expect(wrapper.text()).toContain('Delete');
  });
});
