# Product Overview

PackTabs is a Chrome/Firefox browser extension for saving and managing groups of browser tabs.

## Core Features

- One-click save of all tabs in the current window
- Organize saved tabs into named groups
- History snapshot feature for automatic tab group backups
- Clean management interface via dashboard page
- Built with Manifest V3 for modern browser compatibility

## User Flow

1. User clicks extension icon to open dashboard
2. Dashboard displays saved tab groups (both named and history)
3. Users can save current tabs, organize into groups, and restore tabs later
4. Settings control auto-close behavior and history retention limits

## Key Concepts

- **Named Tab Groups**: User-created collections with custom names
- **History Tab Groups**: Automatic snapshots (name is null, isHistory: true)
- **Tab Items**: Individual tabs with URL, title, and favicon
- **Settings**: User preferences (autoCloseAfterSave, maxHistoryGroups)
