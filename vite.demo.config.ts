import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Live demo: `npm run demo` (dev) / `npm run build:demo` (static site in demo-dist/).
// `base: './'` keeps asset URLs relative so it works under /resource-scheduler/ on GitHub Pages.
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
})
