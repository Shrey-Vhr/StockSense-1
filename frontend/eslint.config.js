import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * package.json has declared an eslint script, eslint 9 and these three plugins
 * since the project was created, but no config file was ever written — so
 * `npm run lint` has always failed before linting a single file.
 *
 * This is the configuration those declared plugins imply, nothing more.
 */
export default [
  {
    // The root-level *.cjs codemods and temp.jsx are one-off scaffolding that
    // .gitignore already excludes from the repo — they are not application code.
    ignores: ['dist/**', 'node_modules/**', 'public/**', '*.cjs', 'temp.*'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The codebase reads props off API payloads that have no PropTypes, and
      // adding them across 50 components is not a lint fix.
      'react/prop-types': 'off',
      // `catch (e) {}` where the error is deliberately swallowed is used in a
      // dozen places. eslint 9 flags the unused binding by default; policing it
      // would mean rewriting error handling, which is behaviour, not lint.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
];
