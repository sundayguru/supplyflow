import globals from 'globals';
import gitignore from 'eslint-config-flat-gitignore';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  gitignore(),
  {
    ignores: ['*.d.ts'],
  },
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        jsxPragma: null,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  {
    files: ['scripts/**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
  {
    rules: {
      curly: 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'no-template-curly-in-string': 'error',
      'no-unassigned-vars': 'error',
      'no-useless-assignment': 'error',
      'no-bitwise': 'error',
      'no-empty-function': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      // Explicitylu disabled in favor of @typescript-eslint/no-shadow which handles TS constructs correctly
      'no-shadow': 'off',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-numeric-literals': 'warn',
      'prefer-template': 'warn',
      radix: 'warn',
      'require-await': 'error',
      yoda: 'error',
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Enums are banned; use union types or objects instead.',
        },
      ],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
    },
  },
  {
    files: ['app/middleware/*.{js,ts}'],
    rules: {
      'require-await': 'off',
    },
  },
  {
    files: ['app/routes/**/*.{ts,tsx}'],
    rules: {
      'func-style': 'off',
      'require-await': 'off',
    },
  },
];
