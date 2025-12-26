# Implementation Plan: Tab Group Manager

## Overview

This implementation plan breaks down the PackTabs extension development into discrete, actionable tasks. The plan follows a bottom-up approach: establishing core infrastructure first, then building data layer, business logic, UI components, and finally integration. Each task builds incrementally on previous work to ensure continuous validation.

## Tasks

- [ ] 1. Project setup and configuration
  - Initialize WXT project with Vue 3 module
  - Configure TypeScript with strict mode
  - Install and configure PrimeVue with Material theme
  - Set up Pinia store infrastructure
  - Configure Vitest with WXT testing plugin
  - Install fast-check for property-based testing
  - _Requirements: All (foundational)_

- [ ] 2. Define core TypeScript types and interfaces
  - [ ] 2.1 Create TabGroup and TabItem type definitions
    - Define interfaces in `types/TabGroup.ts`
    - Include id, name, createdAt, tabs, isHistory fields
    - _Requirements: 1.1, 1.2, 1.4, 2.2_
  
  - [ ] 2.2 Create Storage schema types
    - Define StorageSchema interface in `types/Storage.ts`
    - Define WXT storage items with `storage.defineItem`
    - Include tabGroups and settings storage definitions
    - _Requirements: 1.5, 7.1_

- [ ] 3. Implement storage service layer
  - [ ] 3.1 Create WXT storage wrapper utilities
    - Implement `utils/storage.ts` with StorageService interface
    - Implement saveTabGroup, getTabGroups, updateTabGroup functions
    - Implement deleteTabGroup and deleteTabFromGroup functions
    - Add serialization/deserialization for Date objects
    - _Requirements: 1.5, 2.4, 3.3, 3.4, 3.5, 7.1, 8.4_
  
  - [ ]* 3.2 Write property test for storage persistence
    - **Property 2: Tab Group Data Persistence**
    - **Validates: Requirements 1.5, 2.4, 7.1, 8.4**
  
  - [ ]* 3.3 Write unit tests for storage error handling
    - Test retry logic for connection failures
    - Test quota exceeded scenarios
    - Test data corruption recovery
    - _Requirements: 7.4_

- [ ] 4. Implement tab management utilities
  - [ ] 4.1 Create tab capture and restoration functions
    - Implement `utils/tabManager.ts` with TabManager interface
    - Implement captureCurrentWindow using Chrome Tabs API
    - Implement openTabs and openSingleTab functions
    - Implement closeCurrentTabs function
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_
  
  - [ ]* 4.2 Write property test for tab capture completeness
    - **Property 1: Tab Capture Completeness**
    - **Validates: Requirements 1.1, 1.2**
  
  - [ ]* 4.3 Write property test for tab restoration completeness
    - **Property 11: Tab Restoration Completeness**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ]* 4.4 Write property test for round-trip integrity
    - **Property 13: Tab Data Round-Trip Integrity**
    - **Validates: Requirements 4.4**

- [ ] 5. Checkpoint - Ensure storage and tab utilities work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Pinia store for tab groups
  - [ ] 6.1 Create useTabStore with state and actions
    - Implement `stores/useTabStore.ts` using Pinia composition API
    - Define state: tabGroups, selectedGroupId
    - Define computed: historyGroups, namedGroups, selectedGroup
    - Implement loadGroups action with WXT storage integration
    - _Requirements: 5.3, 5.4_
  
  - [ ] 6.2 Implement tab group CRUD actions
    - Implement saveGroup action
    - Implement updateGroup action
    - Implement deleteGroup action
    - Implement deleteTab action for individual tab removal
    - Implement convertToNamed action for history group conversion
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 8.1, 8.2, 9.2, 9.3_
  
  - [ ]* 6.3 Write property test for group operation isolation
    - **Property 10: Group Operation Isolation**
    - **Validates: Requirements 3.5, 8.2**
  
  - [ ]* 6.4 Write property test for individual tab deletion precision
    - **Property 19: Individual Tab Deletion Precision**
    - **Validates: Requirements 8.1**
  
  - [ ]* 6.5 Write unit tests for Pinia store actions
    - Test each CRUD action with mock storage
    - Test computed properties return correct filtered data
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 8.1, 8.2_

- [ ] 7. Implement service worker (background script)
  - [ ] 7.1 Create background script with event handlers
    - Implement `entrypoints/background.ts`
    - Add browser close event listener for History Tab Group creation
    - Implement message handlers for tab capture/restoration
    - Add timestamp generation for new groups
    - _Requirements: 1.4, 2.1, 2.2, 2.3_
  
  - [ ]* 7.2 Write property test for history group auto-creation
    - **Property 5: History Group Auto-Creation**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ]* 7.3 Write property test for history group preservation
    - **Property 6: History Group Preservation**
    - **Validates: Requirements 2.3**
  
  - [ ]* 7.4 Write property test for timestamp assignment
    - **Property 4: Timestamp Assignment**
    - **Validates: Requirements 1.4**
  
  - [ ]* 7.5 Write property test for automatic tab cleanup
    - **Property 3: Automatic Tab Cleanup**
    - **Validates: Requirements 1.3**

- [ ] 8. Checkpoint - Ensure background script and store integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create Vue app initialization
  - [ ] 9.1 Implement app initialization utility
    - Create `utils/init-app.ts` with initApp function
    - Configure Pinia integration
    - Configure PrimeVue with Material theme
    - Add ToastService and ConfirmationService
    - _Requirements: 5.1_

- [ ] 10. Implement TabGroupCard component
  - [ ] 10.1 Create TabGroupCard component structure
    - Create `components/TabGroupCard.vue`
    - Use PrimeVue Card component with header/content/footer slots
    - Implement editable title with inline editing
    - Display creation date with formatting
    - Display tab count using Chip component
    - _Requirements: 5.5, 6.1, 6.2_
  
  - [ ] 10.2 Implement tab list display in card body
    - Use PrimeVue DataView for tab list rendering
    - Display favicon using Avatar component with chrome://favicon/ protocol
    - Display tab title as clickable link
    - Add delete button for each tab using Button component
    - _Requirements: 6.3, 6.4_
  
  - [ ] 10.3 Implement card footer actions
    - Add "Open All" button with click handler
    - Add conditional "Save" button for history groups
    - Add conditional "Update" button for named groups
    - Add "Delete" button with confirmation dialog
    - _Requirements: 4.1, 6.5, 9.1_
  
  - [ ]* 10.4 Write property test for tab card structure consistency
    - **Property 16: Tab Card Structure Consistency**
    - **Validates: Requirements 5.5, 6.1, 6.2, 6.5**
  
  - [ ]* 10.5 Write property test for tab entry display completeness
    - **Property 17: Tab Entry Display Completeness**
    - **Validates: Requirements 6.3, 6.4**
  
  - [ ]* 10.6 Write unit tests for TabGroupCard component
    - Test button click handlers
    - Test inline editing functionality
    - Test conditional rendering of Save/Update buttons
    - _Requirements: 3.2, 4.1, 4.3, 6.5_

- [ ] 11. Implement TabGroupList component
  - [ ] 11.1 Create TabGroupList component
    - Create `components/TabGroupList.vue`
    - Accept groups prop and render TabGroupCard for each
    - Handle empty state display
    - _Requirements: 5.3, 5.4_
  
  - [ ]* 11.2 Write unit tests for TabGroupList component
    - Test rendering multiple cards
    - Test empty state display
    - _Requirements: 5.3_

- [ ] 12. Implement main App component with navigation
  - [ ] 12.1 Create App.vue with layout structure
    - Create `entrypoints/dashboard/App.vue`
    - Implement PrimeVue Sidebar with Menu component
    - Implement Toolbar with "Save Current Tabs" button
    - Add content area for displaying tab groups
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 12.2 Implement sidebar navigation logic
    - Build menu items from Pinia store (history + named groups)
    - Handle menu item clicks to update selected group
    - Implement sidebar toggle functionality
    - _Requirements: 5.3, 5.4_
  
  - [ ] 12.3 Implement save current tabs functionality
    - Add click handler for "Save Current Tabs" button
    - Invoke Pinia store action to capture and save tabs
    - Show success notification using PrimeVue Toast
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 12.4 Write property test for sidebar content accuracy
    - **Property 14: Sidebar Content Accuracy**
    - **Validates: Requirements 5.3**
  
  - [ ]* 12.5 Write property test for navigation consistency
    - **Property 15: Navigation Consistency**
    - **Validates: Requirements 5.4**

- [ ] 13. Implement dialog components for user interactions
  - [ ] 13.1 Add name input dialog for history group conversion
    - Use PrimeVue Dialog component
    - Add InputText for group name input
    - Implement save handler to call convertToNamed action
    - _Requirements: 3.1, 9.1, 9.2_
  
  - [ ] 13.2 Add confirmation dialog for deletions
    - Use PrimeVue ConfirmDialog component
    - Implement confirmation for group deletion
    - Implement confirmation for tab deletion
    - _Requirements: 3.4_
  
  - [ ]* 13.3 Write property test for group conversion
    - **Property 7: Group Conversion**
    - **Validates: Requirements 3.1, 9.2, 9.3**
  
  - [ ]* 13.4 Write property test for UI state consistency after conversion
    - **Property 20: UI State Consistency After Conversion**
    - **Validates: Requirements 9.5**

- [ ] 14. Checkpoint - Ensure UI components render and interact correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement error handling and notifications
  - [ ] 15.1 Add global error handler
    - Implement Vue error handler in app initialization
    - Display errors using PrimeVue Toast
    - _Requirements: 7.4_
  
  - [ ] 15.2 Add storage error handling
    - Implement retry logic with exponential backoff
    - Show quota exceeded notifications
    - Handle sync conflicts with timestamp resolution
    - _Requirements: 7.3, 7.4_
  
  - [ ] 15.3 Add Chrome API error handling
    - Handle permission denied errors
    - Handle tab not found errors
    - Display user-friendly error messages
    - _Requirements: 7.4_
  
  - [ ]* 15.4 Write property test for storage error handling
    - **Property 18: Storage Error Handling**
    - **Validates: Requirements 7.4**
  
  - [ ]* 15.5 Write unit tests for error scenarios
    - Test network failure handling
    - Test invalid URL handling
    - Test user input validation
    - _Requirements: 7.4_

- [ ] 16. Implement additional UI features
  - [ ] 16.1 Add favicon loading with fallback
    - Use PrimeVue Skeleton as loading placeholder
    - Implement fallback to default icon on error
    - _Requirements: 6.3, 6.4_
  
  - [ ] 16.2 Add individual tab opening functionality
    - Implement click handler for tab titles
    - Call openSingleTab from tab manager
    - _Requirements: 4.3, 8.3_
  
  - [ ]* 16.3 Write property test for individual tab opening
    - **Property 12: Individual Tab Opening**
    - **Validates: Requirements 4.3, 8.3**
  
  - [ ] 16.4 Implement name modification persistence
    - Add inline edit handler for group names
    - Call updateGroup action on name change
    - Show success notification
    - _Requirements: 3.3_
  
  - [ ]* 16.5 Write property test for name modification persistence
    - **Property 8: Name Modification Persistence**
    - **Validates: Requirements 3.3**

- [ ] 17. Implement complete group deletion
  - [ ] 17.1 Add delete group functionality
    - Implement delete handler with confirmation
    - Call deleteGroup action from Pinia store
    - Update UI to remove deleted group
    - _Requirements: 3.4_
  
  - [ ]* 17.2 Write property test for complete group deletion
    - **Property 9: Complete Group Deletion**
    - **Validates: Requirements 3.4**

- [ ] 18. Final integration and polish
  - [ ] 18.1 Wire all components together in main entry point
    - Create `entrypoints/dashboard/main.ts`
    - Initialize app with initApp utility
    - Mount App component
    - _Requirements: 5.1_
  
  - [ ] 18.2 Add CSS styling and PrimeVue theme customization
    - Create `entrypoints/dashboard/style.css`
    - Customize Material theme colors if needed
    - Add responsive layout styles
    - _Requirements: 5.1, 5.5_
  
  - [ ] 18.3 Configure WXT manifest and permissions
    - Update `wxt.config.ts` with proper permissions
    - Configure extension action and icons
    - Set up proper manifest V3 configuration
    - _Requirements: All_

- [ ] 19. Final checkpoint - Run all tests and verify functionality
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- WXT Framework provides built-in Chrome API mocking for tests
- PrimeVue components reduce custom UI development time
