import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'

// React Router v7 framework mode: the `reactRouter` plugin replaces
// `@vitejs/plugin-react` for the production build pipeline. Vitest uses
// a separate `vitest.config.ts` that keeps the standalone React plugin.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [tailwindcss(), reactRouter()],
})
