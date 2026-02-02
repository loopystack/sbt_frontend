import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL uses 127.0.0.1 (IPv4) to avoid EACCES when the IDE extension
 * or test runner connects over IPv6 (::1) on Windows.
 * If you see "connect EACCES ::1" in the IDE, run e2e from terminal:
 *   npm run e2e
 * or set: NODE_OPTIONS=--dns-result-order=ipv4first
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--host-resolver-rules=MAP localhost 127.0.0.1',
      ],
    },
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

