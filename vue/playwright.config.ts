import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
    { name: 'mobile', use: { ...devices['iPhone 13'], colorScheme: 'dark', reducedMotion: 'reduce' } },
  ],
  webServer: { command: 'node scripts/preview.mjs', url: 'http://127.0.0.1:4174/', reuseExistingServer: !process.env.CI },
})
