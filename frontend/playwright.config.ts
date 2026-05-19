import path from 'node:path';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const envPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3021';
const backendBaseURL = process.env.E2E_BACKEND_BASE_URL ?? 'http://127.0.0.1:5021';
const frontendURL = new URL(baseURL);
const backendURL = new URL(backendBaseURL);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: `node ./scripts/start.mjs -- --hostname ${frontendURL.hostname} --port ${frontendURL.port || '80'}`,
      cwd: path.resolve(process.cwd()),
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node server.js',
      cwd: path.resolve(process.cwd(), '../backend'),
      env: {
        ...process.env,
        HOST: backendURL.hostname,
        PORT: backendURL.port || '80',
        FRONTEND_HOST: frontendURL.hostname,
        FRONTEND_PORT: frontendURL.port || '80',
      },
      url: `${backendBaseURL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
