import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_PATH = '/'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fail the build if a `test.only` is committed.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // A stub project so the auth UI renders; every request to it is
      // intercepted by the supabase fixture in e2e/fixtures.ts.
      VITE_SUPABASE_URL: 'https://stub.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'stub-anon-key',
    },
  },
})
