const js = require('@eslint/js');
const importPlugin = require('eslint-plugin-import');
const promisePlugin = require('eslint-plugin-promise');

module.exports = [
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', 'other-code/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Browser/Web APIs that might be used
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      'no-console': 'off', // Temporarily disabled for development
      complexity: ['warn', 20],
      'max-params': ['warn', 7],
      'max-lines-per-function': [
        'warn',
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
          ],
        },
      ],
    },
  },
  // New/modernized code path: stay strict here
  {
    files: ['src/**/*.js', 'src/**/*.mjs', 'src/**/*.cjs'],
    rules: {
      complexity: ['error', 15],
      'max-params': ['error', 6],
      'max-lines-per-function': [
        'error',
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];
