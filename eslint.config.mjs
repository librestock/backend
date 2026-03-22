import baseConfig from '@librestock/eslint-config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Extend shared base configuration
  ...baseConfig,

  // API-specific: Add Jest globals
  {
    languageOptions: {
      globals: {
        ...globals.jest,
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Test file overrides
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-console': 'off',
    },
  },

  // Script file overrides
  {
    files: ['**/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Ignores
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/scripts/**'],
  },
)
