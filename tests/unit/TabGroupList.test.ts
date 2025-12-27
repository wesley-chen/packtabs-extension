import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { beforeEach,describe, expect, it } from 'vitest';

import TabGroupCard from '../../components/TabGroupCard.vue';
import TabGroupList from '../../components/TabGroupList.vue';
import type { TabGroup } from '../../types/TabGroup';

/**
 * Unit tests for TabGroupList component
 * Tests rendering multiple cards and empty state display
 * Requirements: 5.3
 *
 * @vitest-environment jsdom
 */

describe('TabGroupList Component', () => {
  let pinia: ReturnType<typeof createPinia>;
  let mockGroups: TabGroup[];

  beforeEach(() => {
    // Create fresh Pinia instance
    pinia = createPinia();
    setActivePinia(pinia);

    // Create mock tab groups
    mockGroups = [
      {
        id: 'group-1',
        name: 'Work Tabs',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        tabs: [
          {
            id: 'tab-1',
            url: 'https://example.com',
            title: 'Example Site',
            faviconUrl: 'https://example.com/favicon.ico',
          },
        ],
        isHistory: false,
      },
      {
        id: 'group-2',
        name: null,
        createdAt: new Date('2024-01-02T12:00:00Z'),
        tabs: [
          {
            id: 'tab-2',
            url: 'https://test.com',
            title: 'Test Site',
            faviconUrl: undefined,
          },
        ],
        isHistory: true,
      },
      {
        id: 'group-3',
        name: 'Personal Tabs',
        createdAt: new Date('2024-01-03T12:00:00Z'),
        tabs: [
          {
            id: 'tab-3',
            url: 'https://personal.com',
            title: 'Personal Site',
            faviconUrl: 'https://personal.com/favicon.ico',
          },
        ],
        isHistory: false,
      },
    ];
  });

  it('renders multiple TabGroupCard components', () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: mockGroups },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
        stubs: {
          TabGroupCard: false, // Don't stub, render actual component
        },
      },
    });

    // Find all TabGroupCard components
    const cards = wrapper.findAllComponents(TabGroupCard);

    expect(cards).toHaveLength(3);
  });

  it('passes correct group prop to each TabGroupCard', () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: mockGroups },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
        stubs: {
          TabGroupCard: false,
        },
      },
    });

    const cards = wrapper.findAllComponents(TabGroupCard);

    // Check that each card receives the correct group
    expect(cards[0].props('group')).toEqual(mockGroups[0]);
    expect(cards[1].props('group')).toEqual(mockGroups[1]);
    expect(cards[2].props('group')).toEqual(mockGroups[2]);
  });

  it('renders group names in the list', () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: mockGroups },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
        stubs: {
          TabGroupCard: false,
        },
      },
    });

    const text = wrapper.text();

    expect(text).toContain('Work Tabs');
    expect(text).toContain('History Tab Group'); // For unnamed group
    expect(text).toContain('Personal Tabs');
  });

  it('displays empty state when no groups provided', () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: [] },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    // Check for empty state message
    expect(wrapper.text()).toContain('No tab groups yet');
    expect(wrapper.text()).toContain('Save your current tabs to create your first tab group');
  });

  it('does not render TabGroupCard when groups array is empty', () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: [] },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    const cards = wrapper.findAllComponents(TabGroupCard);

    expect(cards).toHaveLength(0);
  });

  it('shows empty state icon when no groups', () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: [] },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
      },
    });

    // Check for inbox icon in empty state
    const icon = wrapper.find('.pi-inbox');

    expect(icon.exists()).toBe(true);
  });

  it('emits save event when TabGroupCard emits save', async () => {
    const wrapper = mount(TabGroupList, {
      props: { groups: mockGroups },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
        stubs: {
          TabGroupCard: false,
        },
      },
    });

    // Find the history group card (group-2)
    const cards = wrapper.findAllComponents(TabGroupCard);
    const historyCard = cards[1]; // Second card is the history group

    // Emit save event from the card
    await historyCard.vm.$emit('save', 'group-2');

    // Check that TabGroupList emitted the save event
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')?.[0]).toEqual(['group-2']);
  });

  it('renders single group correctly', () => {
    const singleGroup = [mockGroups[0]];
    const wrapper = mount(TabGroupList, {
      props: { groups: singleGroup },
      global: {
        plugins: [pinia, PrimeVue, ConfirmationService, ToastService],
        stubs: {
          TabGroupCard: false,
        },
      },
    });

    const cards = wrapper.findAllComponents(TabGroupCard);

    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain('Work Tabs');
  });
});
