# Technology Stack

## Build System & Runtime

- **WXT Framework** (v0.20.13): Modern web extension development framework with hot reload
- **Bun**: JavaScript runtime and package manager (preferred over npm/yarn)
- **TypeScript** (v5.9.3): Strict type checking enabled
- **Vite**: Build tool (integrated via WXT)

## Frontend Stack

- **Vue 3** (v3.5.26): Composition API with `<script setup>` syntax
- **PrimeVue** (v4.5.4): UI component library with Material Design theme
- **Pinia** (v3.0.4): State management across components/pages

## Testing

- **Vitest** (v4.0.16): Unit and property-based testing
- **@vue/test-utils** (v2.4.6): Vue component testing utilities
- **fast-check** (v4.5.2): Property-based testing library
- **jsdom** (v27.4.0): DOM environment for tests
- **@vitest/coverage-v8**: Code coverage reporting

## Browser APIs

- **Manifest V3**: Latest Chrome extension manifest
- **Permissions**: tabs, storage, sessions, favicon
- **WXT Storage API**: Type-safe wrapper around chrome.storage.sync
- **Unified `browser` API**: WXT provides a unified `browser` variable that works across Chrome, Firefox, Safari
- **Promise-based**: Use promise-style API for both MV2 and MV3
- **Feature detection**: Use optional chaining (`browser.runtime?.id`) to check API availability
- **Types**: Access via `Browser` namespace (e.g., `Browser.Tabs.Tab`)

## WXT Features

### Extension APIs

- Use `browser` variable (not `chrome`) for cross-browser compatibility
- WXT merges Chrome's `chrome` and Firefox's `browser` into unified API
- All APIs return promises (works in MV2 and MV3)
- Use feature detection for optional APIs: `if (browser.action) { ... }`
- **CRITICAL**: Never use `browser.*` APIs outside main function in JS/TS entrypoints
- WXT polyfills with `@webext-core/fake-browser` during build, but not all APIs implemented

### Entrypoints

- Files in `entrypoints/` directory are inputs for bundling
- Entrypoint name dictates type (e.g., `background.ts`, `popup.html`, `content.ts`)
- Can be single file or directory with `index` file
- Must be 0 or 1 level deep (no deep nesting)
- **Listed entrypoints**: Referenced in manifest.json (background, popup, content scripts, etc.)
- **Unlisted entrypoints**: Not in manifest, but accessible at runtime (custom pages, scripts, CSS)
- Define manifest options inside entrypoint file (not separate config)
- Example: `defineContentScript({ matches: [...], main() { ... } })`
- HTML entrypoints use `<meta>` tags for options

### Entrypoint Types

- **Background**: `background.ts` → Service worker (MV3) or background page (MV2)
- **Content Scripts**: `{name}.content.ts` → Injected into web pages, requires `matches`
- **HTML Pages**: `popup.html`, `options.html`, `newtab.html`, `sidepanel.html`, etc.
- **Unlisted Pages**: `{name}.html` → Accessible at `/{name}.html`
- **Unlisted Scripts**: `{name}.ts` → Accessible at `/{name}.js`
- **Unlisted CSS**: `{name}.css` → Must be manually imported/loaded

### Entrypoint Loaders

- WXT imports entrypoints into NodeJS environment during build to extract options
- Pre-processing steps: polyfill globals, fake browser APIs, tree-shake unused code
- **CRITICAL**: Keep all runtime code inside main function (background, content scripts, unlisted scripts)
- Code outside main function runs during build in NodeJS, not browser
- Use `linkedom` for basic browser globals, `@webext-core/fake-browser` for extension APIs
- If you see "API not implemented" errors, move code into main function

### Auto-imports

- WXT uses `unimport` (same as Nuxt) for automatic imports
- Auto-imported by default:
  - All WXT APIs (e.g., `defineBackground`, `storage`, `browser`)
  - Exports from `components/`, `composables/`, `hooks/`, `utils/`
- Run `bun run postinstall` to generate `.wxt/types/imports-module.d.ts` for TypeScript
- Can explicitly import via `#imports` module if needed
- To disable: set `imports: false` in `wxt.config.ts`

### TypeScript Configuration

- WXT generates base TSConfig at `.wxt/tsconfig.json` when running `wxt prepare`
- Project's `tsconfig.json` extends WXT's base config
- Custom compiler options go in root `tsconfig.json`
- Path aliases provided by default:
  - `~` or `@` → `<srcDir>/*` (project source)
  - `~~` or `@@` → `<rootDir>/*` (project root)
- Add custom aliases via `alias` option in `wxt.config.ts` (not `tsconfig.json`)
- Custom aliases are added to both TypeScript and bundler

### Vite Configuration

- WXT uses Vite under the hood for bundling
- Customize via `vite: () => ({ ... })` in `wxt.config.ts`
- Add Vite plugins in the `plugins` array
- Some plugins need manual mode checking (e.g., production-only plugins)
- Example: `vite: (configEnv) => ({ plugins: configEnv.mode === 'production' ? [...] : [] })`
- WXT provides sensible defaults - avoid changing build settings unless necessary

### Unit Testing with Vitest

- WXT provides `WxtVitest()` plugin for first-class Vitest support
- Plugin handles:
  - Auto-imports in tests (no manual mocking needed)
  - Fake browser API implementation via `@webext-core/fake-browser`
  - In-memory storage that behaves like real extension storage
- Mock WXT APIs using real import paths from `.wxt/types/imports-module.d.ts`
- Example: Mock `injectScript` from `"wxt/utils/inject-script"`, not `"#imports"`

## Common Commands

```bash
# Development
bun install              # Install dependencies
bun run postinstall.     # Generate types for auto imports
bun run dev              # Start dev server (Chrome)
bun run dev:firefox      # Start dev server (Firefox)

# Building
bun run build            # Production build (Chrome)
bun run build:firefox    # Production build (Firefox)
bun run zip              # Create distributable zip (Chrome)
bun run zip:firefox      # Create distributable zip (Firefox)

# Type Checking
bun run compile          # TypeScript type check (no emit)

# Check for linting errors
bun run lint

# Auto-fix fixable issues
bun run lint:fix

# Format all files
bun run format

# Testing
bun run test             # Run all tests once
bun run test:watch       # Run tests in watch mode
bun run test:ui          # Open Vitest UI
bun run test:coverage    # Generate coverage report
```

## Configuration Files

- `wxt.config.ts`: Extension manifest, WXT settings, Vite config, and custom aliases
- `vitest.config.ts`: Test configuration with jsdom environment
- `tsconfig.json`: Extends `.wxt/tsconfig.json`, add custom compiler options here
- `.wxt/tsconfig.json`: Generated base config (do not edit directly)
- `package.json`: Scripts and dependencies
