import { defineConfig } from '@tanstack/react-start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    preset: 'vercel',
  },
  vite: {
    plugins: [
      viteTsConfigPaths(),
      tailwindcss(),
    ],
  },
})
