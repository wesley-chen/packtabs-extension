# PackTabs - Project Setup Documentation

## Overview

PackTabs is a Chrome Manifest V3 extension built with modern web technologies for efficient tab group management.

## Technology Stack

- **WXT Framework**: Modern web extension development framework with type-safe APIs
- **Vue 3**: Progressive JavaScript framework with Composition API
- **PrimeVue**: Comprehensive Vue UI component library with Material Design theme
- **TypeScript**: Type-safe development with strict mode enabled
- **Pinia**: Official Vue state management library
- **Vitest**: Vite-powered unit testing framework
- **fast-check**: Property-based testing library
- **Bun**: Fast JavaScript runtime and package manager

## Project Structure

```
packtabs-extension/
├── entrypoints/           # WXT entry points (background, dashboard)
├── components/            # Vue components
├── stores/                # Pinia stores
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
├── tests/                 # Test suite (unit + property tests)
├── public/                # Static assets
├── wxt.config.ts          # WXT configuration
├── vitest.config.ts       # Vitest configuration
└── tsconfig.json          # TypeScript configuration
```

## Configuration

### TypeScript (tsconfig.json)
- Strict mode enabled
- No unused locals/parameters
- No fallthrough cases in switch statements

### WXT (wxt.config.ts)
- Vue 3 module enabled
- Chrome Manifest V3
- Permissions: tabs, storage, sessions, favicon

### Vitest (vitest.config.ts)
- jsdom environment for DOM testing
- Vue Test Utils integration
- Coverage reporting with v8
- Global test setup with Chrome API mocks

### PrimeVue
- Material Design theme preset
- ToastService for notifications
- ConfirmationService for dialogs
- PrimeIcons included

## Development Commands

```bash
# Install dependencies
bun install

# Development mode with hot reload
bun run dev

# Build for production
bun run build

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage

# Type checking
bun run compile

# Create extension zip
bun run zip
```

## Testing Strategy

### Unit Tests
- Located in `tests/unit/`
- Focus on specific examples and edge cases
- Test component integration
- Test error conditions

### Property-Based Tests
- Located in `tests/property/`
- Use fast-check for random data generation
- Verify universal properties
- Run minimum 100 iterations per property

### Chrome API Mocks
All tests have access to mocked Chrome APIs:
- `chrome.storage.sync` and `chrome.storage.local`
- `chrome.tabs`
- `chrome.runtime`

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start development server:
   ```bash
   bun run dev
   ```

3. Load extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `.output/chrome-mv3` directory

4. Run tests:
   ```bash
   bun run test
   ```

## Next Steps

Follow the implementation plan in `.kiro/specs/tab-group-manager/tasks.md` to build the extension features incrementally.
