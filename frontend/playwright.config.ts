import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium, defineConfig } from '@playwright/test';

// Use an installed browser when available; do not install or replace anything.
const installedBrowser = [
  process.env.STRATA_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  chromium.executablePath(),
].find((candidate): candidate is string => !!candidate && existsSync(candidate));

// Playwright clears its output directory before a run. A fresh, unique path
// ensures that no output from a previous run can be removed or overwritten.
const newRun = () => `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${randomUUID().slice(0, 8)}`;
// Only a worker may inherit the current run's path. Every independent command
// creates a new path, including commands run with an existing environment value.
const run = process.env.TEST_WORKER_INDEX !== undefined ? process.env.STRATA_TEST_RUN ?? newRun() : newRun();
process.env.STRATA_TEST_RUN = run;

export default defineConfig({
  testDir: './tests',
  outputDir: resolve('../runtime/playwright', run),
  preserveOutput: 'always',
  reporter: 'list',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: process.env.STRATA_TEST_URL ?? 'http://127.0.0.1:5173',
    browserName: 'chromium',
    launchOptions: installedBrowser ? { executablePath: installedBrowser } : undefined,
    viewport: { width: 1440, height: 1000 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // The existing development server is deliberately external: running tests
  // neither starts nor stops services belonging to another session.
});
