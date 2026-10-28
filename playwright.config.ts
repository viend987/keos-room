import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:4040',
    trace: 'on-first-retry',
    viewport: { width: 1200, height: 800 }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4040/api/status',
    reuseExistingServer: true,
    timeout: 30000
  }
});
