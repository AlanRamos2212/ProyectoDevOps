import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: { baseURL: 'http://127.0.0.1:8080', browserName: 'chromium' },
  webServer: {
    command: 'docker compose -f ../docker-compose.yml up --build',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
