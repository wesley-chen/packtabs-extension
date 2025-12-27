// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript strict rules with type checking (best practice for quality codebases)
  // Includes: recommended + recommended-type-checked + strict + strict-type-checked
  ...tseslint.configs.strictTypeChecked,

  // Stylistic rules for consistent, modern TypeScript code
  ...tseslint.configs.stylisticTypeChecked,

  // Prettier integration - disables conflicting ESLint rules
  prettierConfig,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Disable type-checked rules for JavaScript files
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Relaxed rules for test files (tests often need flexibility)
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
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
  {
    ignores: ['.wxt/**', '.output/**', 'node_modules/**', 'dist/**', '*.config.js', '*.config.ts'],
  }
);
