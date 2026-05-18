import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.react-router', '.claude/worktrees/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // React Router framework mode route modules must export both a default
    // component AND named exports (meta, links, loader, action, headers,
    // ErrorBoundary, Layout). Relax react-refresh's only-export-components rule
    // for those files so the framework-required named exports are allowed.
    files: ['src/root.tsx', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowExportNames: [
            'meta',
            'links',
            'loader',
            'clientLoader',
            'action',
            'clientAction',
            'headers',
            'shouldRevalidate',
            'handle',
            'ErrorBoundary',
            'HydrateFallback',
            'Layout',
          ],
        },
      ],
    },
  },
])
