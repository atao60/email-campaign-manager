import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  eslintConfigPrettier,

  {
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: "Please use an explicit import: import process from 'node:process';"
        },
        {
          name: 'fs',
          message: "Please use an explicit import: import fs from 'node:fs/promises';"
        },
        {
          name: 'path',
          message: "Please use an explicit import: import path from 'node:path';"
        },
        {
          name: 'os',
          message: "Please use an explicit import: import os from 'node:os';"
        },
        {
          name: 'crypto',
          message: "Please use an explicit import: import crypto from 'node:crypto';"
        },
        {
          name: 'Buffer',
          message: "Please use an explicit import: import { Buffer } from 'node:buffer';"
        },
        {
          name: '__dirname',
          message: 'CommonJS variables are forbidden, use import.meta.dirname instead.'
        },
        {
          name: '__filename',
          message: 'CommonJS variables are forbidden, use import.meta.filename instead.'
        }
      ],

      // Optional: Disable some overly strict TypeScript rules if necessary
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },

  // Global ignores (replaces the old .eslintignore file)
  {
    ignores: ['dist/', 'node_modules/', '**/*.d.ts', '**/coverage/', '**/generated/']
  }
];
