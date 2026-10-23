import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * GitHub Pages serves a project site from https://<user>.github.io/<repo>/.
 * CI sets BASE_PATH from the repository name; locally the base is `/`.
 */
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'serve' && !isPreview ? '/' : (process.env.BASE_PATH ?? '/ai-front-desk/'),
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}))
