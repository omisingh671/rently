import "dotenv/config";
import { defineConfig, devices } from "playwright/test";

const databaseName = process.env.E2E_DATABASE_NAME?.trim() ?? "";

if (!/(audit|test|e2e)/i.test(databaseName)) {
  throw new Error(
    `E2E_DATABASE_NAME must identify an isolated audit/test/e2e database; received ${databaseName || "<empty>"}`,
  );
}

const backendUrl = "http://127.0.0.1:4100";
const frontendUrl = "http://127.0.0.1:4173";
const dashboardUrl = "http://127.0.0.1:4174";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sharedBackendEnv = {
  ...process.env,
  DATABASE_NAME: databaseName,
  NODE_ENV: "test",
  PORT: "4100",
  FRONTEND_URL: frontendUrl,
  DASHBOARD_URL: dashboardUrl,
  RATE_LIMIT_ENABLED: "false",
  STORAGE_PROVIDER: "local",
};

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  outputDir: "test-results",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile\.e2e\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: /mobile\.e2e\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: `${npmCommand} run serve:e2e`,
      cwd: ".",
      env: sharedBackendEnv,
      url: `${backendUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `${npmCommand} run dev -- --host 127.0.0.1 --port 4173`,
      cwd: "../frontend",
      env: {
        ...process.env,
        VITE_API_BASE_URL: backendUrl,
        VITE_API_PREFIX: "/api/v1",
        VITE_TENANT_SLUG: "e2e-rently",
        VITE_ENABLE_MOCK_PAYMENTS: "true",
      },
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `${npmCommand} run dev -- --host 127.0.0.1 --port 4174`,
      cwd: "../dashboard",
      env: {
        ...process.env,
        VITE_API_BASE_URL: backendUrl,
        VITE_API_PREFIX: "/api/v1",
      },
      url: dashboardUrl,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
