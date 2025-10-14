import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import vitest from '@vitest/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import { jsdoc } from 'eslint-plugin-jsdoc';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.test.*'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules, // you can also use vitest.configs.all.rules to enable all rules
    },
  },
  jsdoc({
    config: 'flat/recommended',
  }),
  eslintConfigPrettier,
]);
