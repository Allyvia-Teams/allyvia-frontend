// eslint.config.mjs (Flat config)
// Optimized for React 19 + TypeScript + Vite + Redux Toolkit + React Query

import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  // Disable ESLint stylistic rules that conflict with Prettier (Prettier handles formatting)
  ...fixupConfigRules(compat.extends('prettier')),
  // Base configuration - Applies to all JS/TS files unless overridden
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser, // TypeScript parser to understand TS/TSX syntax
      ecmaVersion: 'latest', // Enable latest ECMAScript features
      sourceType: 'module', // Use ES modules (matches Vite setup)
      globals: {
        ...globals.browser, // Browser global variables (window, document, etc.)
        ...globals.es2021 // ES2021 global variables
      },
      parserOptions: {
        project: './tsconfig.json', // Enable type-aware linting using TS project
        tsconfigRootDir: __dirname, // Root directory for tsconfig
        warnOnUnsupportedTypeScriptVersion: false // Don't warn on newer TS features
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint, // TypeScript-specific rules
      react, // React component and JSX rules
      'react-hooks': reactHooks, // React Hooks rules (Rules of Hooks, exhaustive deps)
      import: importPlugin, // Import/export validation
      'jsx-a11y': jsxA11y, // Accessibility rules for JSX
      prettier, // Prettier formatting as ESLint rule
      '@tanstack/query': tanstackQuery // React Query best practices
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'], // Support all JS/TS extensions
          moduleDirectory: ['node_modules', 'src/'] // Look for modules in node_modules and src/
        },
        typescript: {
          alwaysTryTypes: true, // Always try to resolve TypeScript types
          project: ['./tsconfig.json'] // Use tsconfig.json for path resolution (respects path aliases)
        }
      },
      react: {
        version: 'detect' // Auto-detect React version from package.json
      }
    },
    rules: {
      // Quality & Safety
      'import/no-unresolved': 'error', // Error on unresolved imports (catches typos)
      '@typescript-eslint/consistent-type-imports': 'off', // Allow value-style imports for types (project preference)

      // React & JSX
      'react/jsx-filename-extension': 'off', // Vite handles file extensions
      'react/prop-types': 'off', // Using TypeScript for type checking instead
      'react/require-default-props': 'off', // TypeScript optional props replace default props
      'react/no-array-index-key': 'off', // Sometimes index is acceptable (static lists)
      'react/react-in-jsx-scope': 'off', // React 17+ auto-imports (new JSX transform)
      'react/jsx-props-no-spreading': 'off', // Allow prop spreading (useful for MUI)

      // Hooks
      'react-hooks/rules-of-hooks': 'error', // Error on Hooks rule violations (must be unconditional)
      'react-hooks/exhaustive-deps': 'off', // Disabled per project preference

      // Accessibility
      'jsx-a11y/label-has-associated-control': 'warn', // Warn if label doesn't have associated control
      'jsx-a11y/no-autofocus': 'off', // Allow autofocus (sometimes needed for UX)

      // Imports
      'import/order': 'off', // Don't enforce import order (Prettier/IDE can handle)
      'import/no-cycle': 'off', // Allow circular dependencies (sometimes necessary)
      'import/no-extraneous-dependencies': 'off', // Vite handles dependency resolution

      // General
      'no-console': 'off', // Allow console.log (useful for debugging)
      'no-shadow': 'off', // Use TypeScript version instead
      '@typescript-eslint/no-shadow': 'off', // Too strict for our patterns (e.g., Redux selectors)
      '@typescript-eslint/naming-convention': 'off', // Too opinionated
      'no-param-reassign': 'error', // Error on param reassignment (overridden for Redux slices below)

      // Unused Variables
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'none', // Allow unused function args (common in callbacks)
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_' // Ignore args starting with _
        }
      ],

      // React Query
      '@tanstack/query/exhaustive-deps': 'warn', // Warn about missing dependencies in query hooks
      '@tanstack/query/no-rest-destructuring': 'warn', // Warn against destructuring from REST response
      '@tanstack/query/stable-query-client': 'error', // Error if query client is not stable (must be memoized)

      // MUI Deep Import Guard
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@mui/*/*/*', '!@mui/material/test-utils/*'] // Prevents tree-shaking issues with MUI deep imports
        }
      ],

      // Prettier Integration
      'prettier/prettier': [
        'warn', // Warning not error (allows auto-fix without blocking)
        {
          bracketSpacing: true,
          printWidth: 140,
          singleQuote: true,
          trailingComma: 'none',
          tabWidth: 2,
          useTabs: false
        }
      ]
    }
  },

  // TypeScript-specific rules - Type-aware safety for TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-shadow': 'off', // Prefer TypeScript version of no-shadow
      '@typescript-eslint/no-shadow': [
        'error',
        {
          ignoreTypeValueShadow: true, // Allow shadowing in type contexts
          ignoreFunctionTypeParameterNameValueShadow: true // Allow shadowing in function types
        }
      ],
      '@typescript-eslint/no-floating-promises': 'off', // Allow intentionally unawaited promises
      '@typescript-eslint/no-misused-promises': 'off', // Allow promise handlers in callbacks
      '@typescript-eslint/no-explicit-any': 'off', // Allow `any` (sometimes necessary in this project)
      '@typescript-eslint/explicit-function-return-type': 'off', // Don't require explicit return types (TypeScript infers well)
      '@typescript-eslint/explicit-module-boundary-types': 'off' // Don't require explicit module types
    }
  },

  // React JSX files - JSX-specific rules for .jsx and .tsx files
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'react/jsx-uses-react': 'off', // React 17+ doesn't need React import (new JSX transform)
      'react/jsx-uses-vars': 'warn', // Warn about unused JSX variables
      'react/display-name': 'off', // Don't require display names (TypeScript handles this)
      'react/jsx-key': [
        'error',
        {
          checkFragmentShorthand: true, // Check keys in fragments
          checkKeyMustBeforeSpread: true, // Key must be before spread props
          warnOnDuplicates: true // Warn on duplicate keys
        }
      ]
    }
  },

  // Redux Toolkit slices - Allow param reassignment (Immer makes it safe)
  {
    files: ['src/store/**/*.{ts,tsx}', 'src/**/slices/**/*.{ts,tsx}'],
    rules: {
      'no-param-reassign': 'off' // Redux Toolkit uses Immer, param reassignment is safe
    }
  },

  // API & Utils - Allow console.log for debugging
  {
    files: ['**/api/**/*.ts', '**/utils/**/*.ts'],
    rules: {
      'no-console': 'off' // Allow console.log in utilities for debugging
    }
  },

  // Tests - Relaxed rules for test files (Jest/Vitest/Cypress)
  {
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/tests/**/*.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      'cypress/**/*.{js,jsx,ts,tsx}'
    ],
    languageOptions: {
      globals: {
        ...globals.jest, // Jest/Vitest globals for test files
        ...globals.node // Node globals for test files
      }
    },
    rules: {
      'no-console': 'off', // Allow console in tests
      'import/no-extraneous-dependencies': 'off', // Allow test dependencies
      '@typescript-eslint/no-explicit-any': 'off' // Allow `any` in tests
    }
  },

  // Node/config scripts - Relaxed rules for config files (ESLint, Vite, Jest, etc.)
  {
    files: ['**/*.config.{js,cjs,mjs,ts}', '**/scripts/**/*.{js,ts}', '**/*.setup.{js,ts}', 'vite.config.*', 'vitest.config.*'],
    languageOptions: {
      globals: {
        ...globals.node // Node globals for config files
      }
    },
    rules: {
      'no-console': 'off', // Allow console in config files
      'import/no-extraneous-dependencies': 'off', // Allow dev dependencies
      '@typescript-eslint/no-var-requires': 'off' // Allow require() in config files
    }
  },

  // Ignore patterns - Don't lint these directories
  {
    ignores: [
      'node_modules/**',
      // Root-relative on purpose for the project's own output, but build
      // artifacts also appear nested (see '**/dist/**' below).
      'dist/**',
      'build/**',
      'coverage/**',
      '**/*.bak/**',
      '**/*.bak',
      'public/**',
      'parse-*.js',
      // Nested build output. A git worktree checked out inside the repo brings
      // its own dist/ along, and because 'dist/**' above is root-relative those
      // bundles were being linted: 2010 parse errors of
      // "parserOptions.project ... file was not found in any of the provided
      // project(s)", because compiled bundles are not in tsconfig. That drowned
      // the four real source errors and made `npm run lint` useless locally.
      '**/dist/**',
      // Agent tooling: worktrees, local settings. Never source.
      '.claude/**'
    ]
  }
];
