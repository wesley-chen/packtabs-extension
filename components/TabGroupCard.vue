<script lang="ts" setup>
import { ref, computed } from 'vue';
import Card from 'primevue/card';
import Chip from 'primevue/chip';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Avatar from 'primevue/avatar';
import DataView from 'primevue/dataview';
import Dialog from 'primevue/dialog';
import { useConfirm } from 'primevue/useconfirm';
import type { TabGroup, TabItem } from '~/types/TabGroup';
import { useTabStore } from '~/stores/useTabStore';
import { openTabs, openSingleTab } from '~/utils/tabManager';

const props = defineProps<{
  group: TabGroup;
}>();

const tabStore = useTabStore();
const confirm = useConfirm();

// Editable title state
const isEditingTitle = ref(false);
const editedTitle = ref(props.group.name || '');

// Name input dialog state
const showNameDialog = ref(false);
const newGroupName = ref('');

// Format creation date
const formattedDate = computed(() => {
  const date = props.group.createdAt;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
});

// Tab count
const tabCount = computed(() => props.group.tabs.length);

// Start editing title
function startEditingTitle() {
  isEditingTitle.value = true;
  editedTitle.value = props.group.name || '';
}

// Save edited title
async function saveTitle() {
  if (editedTitle.value.trim()) {
    await tabStore.updateGroup(props.group.id, { name: editedTitle.value.trim() });
  }
  isEditingTitle.value = false;
}

// Cancel editing
function cancelEdit() {
  isEditingTitle.value = false;
  editedTitle.value = props.group.name || '';
}

// Handle key events for inline editing
function handleTitleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    saveTitle();
  } else if (event.key === 'Escape') {
    cancelEdit();
  }
}

// Handle tab click to open single tab
async function handleTabClick(tab: TabItem) {
  await openSingleTab(tab);
}

// Handle delete tab
async function handleDeleteTab(tabId: string) {
  confirm.require({
    message: 'Are you sure you want to delete this tab?',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      await tabStore.deleteTab(props.group.id, tabId);
    }
  });
}

// Handle Open All button
async function handleOpenAll() {
  await openTabs(props.group.tabs);
}

// Handle Save button (for history groups)
const emit = defineEmits<{
  save: [groupId: string];
}>();

function handleSave() {
  // Show name input dialog
  newGroupName.value = '';
  showNameDialog.value = true;
}

// Save with name (convert history group to named group)
async function saveWithName() {
  if (newGroupName.value.trim()) {
    await tabStore.convertToNamed(props.group.id, newGroupName.value.trim());
    showNameDialog.value = false;
    newGroupName.value = '';
  }
}

// Handle Update button (for named groups)
async function handleUpdate() {
  // Capture current window and update the group
  const { captureCurrentWindow } = await import('~/utils/tabManager');
  const tabs = await captureCurrentWindow();
  await tabStore.updateGroup(props.group.id, { tabs });
}

// Handle Delete Group button
function handleDeleteGroup() {
  confirm.require({
    message: 'Are you sure you want to delete this tab group? This action cannot be undone.',
    header: 'Confirm Delete Group',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      await tabStore.deleteGroup(props.group.id);
    }
  });
}
</script>

<template>
  <Card class="mb-3">
    <template #header>
      <div class="flex justify-content-between align-items-center p-3">
        <div class="flex-grow-1">
          <!-- Editable title -->
          <div v-if="!isEditingTitle" class="flex align-items-center gap-2">
            <h3 class="m-0 text-xl font-semibold">
              {{ group.name || 'History Tab Group' }}
            </h3>
            <Button 
              icon="pi pi-pencil" 
              text 
              rounded 
              size="small"
              @click="startEditingTitle"
              aria-label="Edit group name"
            />
          </div>
          <div v-else class="flex align-items-center gap-2">
            <InputText 
              v-model="editedTitle" 
              class="flex-grow-1"
              @keydown="handleTitleKeydown"
              @blur="saveTitle"
              autofocus
            />
          </div>
          
          <!-- Creation date -->
          <div class="text-sm text-color-secondary mt-1">
            <i class="pi pi-calendar mr-1"></i>
            {{ formattedDate }}
          </div>
        </div>
        
        <!-- Tab count chip -->
        <Chip :label="`${tabCount} tabs`" />
      </div>
    </template>

    <template #content>
      <!-- Tab list display -->
      <DataView :value="group.tabs" layout="list">
        <template #list="slotProps">
          <div 
            v-for="tab in slotProps.items" 
            :key="tab.id"
            class="flex align-items-center p-2 hover:surface-hover cursor-pointer border-bottom-1 surface-border"
          >
            <!-- Favicon -->
            <Avatar 
              :image="`chrome://favicon/${tab.url}`" 
              shape="circle" 
              size="small"
              class="mr-2"
            />
            
            <!-- Tab title as clickable link -->
            <span 
              class="flex-grow-1 text-color cursor-pointer hover:text-primary"
              @click="handleTabClick(tab)"
            >
              {{ tab.title }}
            </span>
            
            <!-- Delete button -->
            <Button 
              icon="pi pi-times" 
              severity="danger" 
              text 
              rounded 
              size="small"
              @click="handleDeleteTab(tab.id)"
              aria-label="Delete tab"
            />
          </div>
        </template>
      </DataView>
    </template>

    <template #footer>
      <!-- Footer actions -->
      <div class="flex gap-2">
        <!-- Open All button -->
        <Button 
          label="Open All" 
          icon="pi pi-external-link" 
          severity="success"
          @click="handleOpenAll"
        />
        
        <!-- Save button (for history groups) -->
        <Button 
          v-if="group.isHistory"
          label="Save" 
          icon="pi pi-save"
          @click="handleSave"
        />
        
        <!-- Update button (for named groups) -->
        <Button 
          v-else
          label="Update" 
          icon="pi pi-refresh"
          @click="handleUpdate"
        />
        
        <!-- Delete button -->
        <Button 
          label="Delete" 
          icon="pi pi-trash" 
          severity="danger"
          @click="handleDeleteGroup"
        />
      </div>
    </template>
  </Card>

  <!-- Name Input Dialog for History Group Conversion -->
  <Dialog 
    v-model:visible="showNameDialog" 
    header="Name Tab Group" 
    modal
    :style="{ width: '400px' }"
  >
    <div class="flex flex-column gap-2">
      <label for="groupName">Group Name</label>
      <InputText 
        id="groupName" 
        v-model="newGroupName" 
        autofocus
        placeholder="Enter a name for this tab group"
        @keydown.enter="saveWithName"
      />
    </div>
    <template #footer>
      <Button 
        label="Cancel" 
        severity="secondary" 
        @click="showNameDialog = false" 
      />
      <Button 
        label="Save" 
        @click="saveWithName"
        :disabled="!newGroupName.trim()"
      />
    </template>
  </Dialog>
</template>

<style scoped>
/* Component-specific styles */
</style>
