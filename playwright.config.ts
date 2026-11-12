import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests against the production build, served under /rune-dual/
 * like GitHub Pages. Uses the installed Google Chrome (channel: 'chrome'), which
 * GitHub's ubuntu-latest runners also provide, so no browser download is needed.
 * Run: npm run build && npm run e2e
 */
const PORT = 4317;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/rune-dual/`,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort --host 127.0.0.1 --base /rune-dual/`,
    url: `http://127.0.0.1:${PORT}/rune-dual/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
