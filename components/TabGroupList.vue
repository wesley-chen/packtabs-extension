<script lang="ts" setup>
  import TabGroupCard from '~/components/TabGroupCard.vue';
  import type { TabGroup } from '~/types/TabGroup';

  const props = defineProps<{
    groups: TabGroup[];
  }>();

  const emit = defineEmits<{
    save: [groupId: string];
  }>();

  function handleSave(groupId: string) {
    emit('save', groupId);
  }
</script>

<template>
  <div class="tab-group-list">
    <!-- Empty state -->
    <div v-if="groups.length === 0" class="empty-state text-center p-6">
      <i class="pi pi-inbox text-6xl text-color-secondary mb-3"></i>
      <h3 class="text-xl font-semibold mb-2">No tab groups yet</h3>
      <p class="text-color-secondary">Save your current tabs to create your first tab group</p>
    </div>

    <!-- Tab group cards -->
    <div v-else class="tab-group-cards">
      <TabGroupCard v-for="group in groups" :key="group.id" :group="group" @save="handleSave" />
    </div>
  </div>
</template>

<style scoped>
  .tab-group-list {
    width: 100%;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }

  .tab-group-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
