import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

// Only for `npm run screenshot`: renders the README demo scene into docs/.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['scripts/readme-screenshot.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
