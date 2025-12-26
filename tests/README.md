# PackTabs Test Suite

This directory contains the test suite for the PackTabs extension, following a dual testing approach with both unit tests and property-based tests.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup with Chrome API mocks
├── unit/                       # Unit tests for specific examples and edge cases
│   └── setup.test.ts          # Setup verification tests
└── property/                   # Property-based tests using fast-check
    └── setup.property.test.ts # Property test setup verification
```

## Running Tests

```bash
# Run all tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage
```

## Testing Approach

### Unit Tests
- Focus on specific examples and edge cases
- Test integration between components
- Test error conditions
- Located in `tests/unit/`

### Property-Based Tests
- Verify universal properties across all inputs
- Use fast-check library for random data generation
- Run minimum 100 iterations per property
- Located in `tests/property/`
- Tag format: `Feature: tab-group-manager, Property {number}: {property_text}`

## Chrome API Mocks

The test setup provides mocks for:
- `chrome.storage.sync` and `chrome.storage.local`
- `chrome.tabs` API
- `chrome.runtime` messaging

These mocks are automatically available in all tests via the global setup file.
