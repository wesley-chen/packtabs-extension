<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useTabStore, setStoreErrorHandler } from '~/stores/useTabStore';
import TabGroupList from '~/components/TabGroupList.vue';
import Sidebar from 'primevue/sidebar';
import Menu from 'primevue/menu';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import type { MenuItem } from 'primevue/menuitem';
import { StorageQuotaExceededError } from '~/utils/storage';
import { TabPermissionDeniedError, InvalidUrlError } from '~/utils/tabManager';

// Store and toast
const tabStore = useTabStore();
const toast = useToast();

// Set up error handler for the store
setStoreErrorHandler((error: Error) => {
  let message = error.message;
  
  // Provide user-friendly messages for specific error types
  if (error instanceof StorageQuotaExceededError) {
    message = 'Storage quota exceeded. Please delete some tab groups to free up space.';
  } else if (error instanceof TabPermissionDeniedError) {
    message = 'Permission denied to access some tabs. Restricted tabs were skipped.';
  } else if (error instanceof InvalidUrlError) {
    message = 'Invalid URL detected. Some tabs could not be opened.';
  }
  
  toast.add({
    severity: 'error',
    summary: 'Error',
    detail: message,
    life: 5000
  });
});

// Sidebar state
const sidebarVisible = ref(false);

// Load groups on mount
onMounted(async () => {
  await tabStore.loadGroups();
  
  // Select history group by default if no selection
  if (!tabStore.selectedGroupId && tabStore.historyGroups.length > 0) {
    tabStore.selectedGroupId = 'history';
  }
});

// Build menu items from store
const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [];
  
  // History Tab Group section
  if (tabStore.historyGroups.length > 0) {
    items.push({
      label: 'History Tab Group',
      icon: 'pi pi-history',
      command: () => {
        tabStore.selectedGroupId = 'history';
        sidebarVisible.value = false;
      }
    });
  }
  
  // Named groups section
  if (tabStore.namedGroups.length > 0) {
    items.push({
      separator: true
    });
    
    tabStore.namedGroups.forEach(group => {
      items.push({
        label: group.name || 'Unnamed',
        icon: 'pi pi-folder',
        command: () => {
          tabStore.selectedGroupId = group.id;
          sidebarVisible.value = false;
        }
      });
    });
  }
  
  return items;
});

// Displayed groups based on selection
const displayedGroups = computed(() => {
  if (tabStore.selectedGroupId === 'history') {
    return tabStore.historyGroups;
  } else if (tabStore.selectedGroupId) {
    const group = tabStore.selectedGroup;
    return group ? [group] : [];
  }
  return tabStore.historyGroups;
});

// Save current tabs handler
async function saveCurrentTabs() {
  try {
    await tabStore.saveGroup(null, true);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Current tabs saved successfully',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save tabs',
      life: 3000
    });
    console.error('Failed to save tabs:', error);
  }
}

// Handle save event from TabGroupList
function handleSave(groupId: string) {
  // This will be handled by TabGroupCard's save dialog
  console.log('Save event for group:', groupId);
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- Sidebar Navigation -->
    <Sidebar v-model:visible="sidebarVisible" :showCloseIcon="true">
      <template #header>
        <h2 class="text-xl font-semibold">Tab Groups</h2>
      </template>
      <Menu :model="menuItems" class="w-full border-none" />
    </Sidebar>
    
    <!-- Main Content Area -->
    <div class="content-area">
      <!-- Toolbar -->
      <Toolbar class="mb-4">
        <template #start>
          <Button 
            icon="pi pi-bars" 
            text 
            rounded
            @click="sidebarVisible = true" 
            aria-label="Toggle sidebar"
          />
          <span class="ml-2 text-xl font-semibold">PackTabs</span>
        </template>
        <template #end>
          <Button 
            label="Save Current Tabs" 
            icon="pi pi-save" 
            @click="saveCurrentTabs"
            severity="success"
          />
        </template>
      </Toolbar>
      
      <!-- Content -->
      <div class="p-4">
        <TabGroupList 
          :groups="displayedGroups"
          @save="handleSave"
        />
      </div>
    </div>
    
    <!-- Toast for notifications -->
    <Toast />
    
    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
