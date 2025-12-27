// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vuePlugin from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  // Base Ignores
  {
    ignores: ['.wxt/**', '.output/**', 'node_modules/**', 'dist/**', '*.config.js'],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript strict rules with type checking (best practice for quality codebases)
  // Includes: recommended + recommended-type-checked + strict + strict-type-checked
  ...tseslint.configs.strictTypeChecked,

  // Stylistic rules for consistent, modern TypeScript code
  ...tseslint.configs.stylisticTypeChecked,

  // Prettier integration - disables conflicting ESLint rules
  prettierConfig,

  // Vue 3 Support
  ...vuePlugin.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Global Language Options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Maximum Auto-fix & Custom Rules
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // --- ESLint Core Auto-fixes ---
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      eqeqeq: ['error', 'always', { null: 'never' }],
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      curly: ['error', 'all'],

      // --- TypeScript Specific Auto-fixes ---
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // --- Import Ordering Auto-fixes ---
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // Handle WXT Auto-imports
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'no-undef': 'off',
    },
  },

  // Disable type-checking for JS files
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Relaxed rules for tests
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
]);
