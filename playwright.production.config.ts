import { defineConfig } from '@playwright/test';
import config from './playwright.config';

// Build once, then exercise the same integration contracts against static HTML,
// real production chunks and early fetch hints. External data remains mocked.
export default defineConfig({
  ...config,
  metadata: { productionBuild: true },
  use: { ...config.use, baseURL: 'http://127.0.0.1:3101' },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101',
    reuseExistingServer: false,
  },
});
