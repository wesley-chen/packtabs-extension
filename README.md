# packtabs-extension
A simple, efficient Chrome extension to save and manage groups of browser tabs. 

## Features
*   One-click save of all tabs in the current window.
*   Organize saved tabs into named groups.
*   Clean, intuitive management interface.
*   Built with Manifest V3.

## Technologies
*   **[WXT Framework](https://wxt.dev/)** - Modern web extension development framework
*   **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework for the UI
*   **[PrimeVue](https://primevue.org/)** - Vue UI Component Library with Material Design Theme
*   **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
*   **[Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)** - Latest Chrome extension manifest version
*   **[Pinia](https://pinia.vuejs.org/introduction.html)** - Use Pinia to share a state across components/pages
*   **[Bun](https://bun.com/docs)** - Fast JavaScript runtime and package manager

## Development

### Prerequisites
*   [Bun](https://bun.sh/) - JavaScript runtime and package manager
*   Chrome or Firefox browser for testing

### Setup
```bash
# Install dependencies
bun install

# Prepare WXT environment
bun run postinstall
```

### Development Commands
```bash
# Start development server for Chrome
bun run dev

# Start development server for Firefox
bun run dev:firefox

# Build extension for production (Chrome)
bun run build

# Build extension for Firefox
bun run build:firefox

# Create distributable zip file (Chrome)
bun run zip

# Create distributable zip file (Firefox)
bun run zip:firefox

# Type check without emitting files
bun run compile

# Check for linting errors
bun run lint

# Auto-fix fixable issues
bun run lint:fix
```

### Project Structure
*   `entrypoints/` - Extension entry points (background, content, popup)
*   `components/` - Vue components
*   `public/` - Static assets and icons
*   `assets/` - Build-time assets

