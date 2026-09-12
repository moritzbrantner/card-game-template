import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
  ...globals.es2024,
};

const nextRules = {
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs['core-web-vitals'].rules,
};

export default [
  {
    ignores: [
      '**/.expo/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.vite/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/out/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'benchmark-results/**',
      'packages/eslint-config/**',
      'templates/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    languageOptions: {
      globals: sharedGlobals,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/react-in-jsx-scope': 'off',
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: ['apps/web/packages/**'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextRules,
    },
  },
  {
    files: ['apps/web/packages/**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    rules: Object.fromEntries(
      Object.keys(nextRules).map((ruleName) => [ruleName, 'off']),
    ),
  },
  {
    files: ['apps/web/packages/ui/src/components/data-table.tsx'],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    files: ['apps/desktop/tests/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['apps/mobile/scripts/**/*.js', 'apps/mobile/tests/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['apps/desktop/e2e/fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  eslintConfigPrettier,
];
