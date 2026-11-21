import { defineConfig, devices } from '@playwright/test'

// BEUI_E2E_URL points the suite at an already running server (e.g. the source dev server on 5175).
const external = process.env.BEUI_E2E_URL

export default defineConfig({
  testDir: './tests',
  workers: 2,
  use: { baseURL: external ?? 'http://127.0.0.1:4174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
    { name: 'mobile', use: { ...devices['iPhone 13'], colorScheme: 'dark', reducedMotion: 'reduce' } },
  ],
  webServer: external ? undefined : { command: 'node scripts/preview.mjs', url: 'http://127.0.0.1:4174/', reuseExistingServer: !process.env.CI },
})
