import { defineConfig } from '@playwright/test';

// Run after `npm run build`. All external requests are intercepted by fixtures.
const port = 3101;
export default defineConfig({
  testDir: './tests/performance',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...(process.env.CI ? {} : { channel: 'chrome' }),
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
