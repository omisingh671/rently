import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "playwright/test";
import { E2E_DEFAULTS } from "./src/common/constants/application.constants.js";

const databaseName =
  process.env.E2E_DATABASE_NAME?.trim() || "rently_gate0_e2e";
if (!/^[A-Za-z0-9_]+_e2e$/.test(databaseName)) {
  throw new Error(
    "E2E_DATABASE_NAME must contain only letters, numbers, or underscores and end with _e2e",
  );
}

const configuredDatabaseUrl = process.env.DATABASE_URL?.trim();
if (configuredDatabaseUrl) {
  const databaseUrl = new URL(configuredDatabaseUrl);
  databaseUrl.pathname = `/${databaseName}`;
  process.env.DATABASE_URL = databaseUrl.toString();
}

const backendPort = E2E_DEFAULTS.port;
const dashboardPort = 5173;
const frontendPort = 5174;
const backendUrl = `http://127.0.0.1:${backendPort}`;
const dashboardUrl = `http://127.0.0.1:${dashboardPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = "test";
process.env.PORT = String(backendPort);
process.env.E2E_DATABASE_NAME = databaseName;
process.env.STORAGE_PROVIDER = "local";
process.env.DASHBOARD_URL = dashboardUrl;
process.env.FRONTEND_URL = frontendUrl;

export default defineConfig({
  testDir: "./e2e/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/browser",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/browser" }],
  ],
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "dashboard-chromium",
      testMatch: "dashboard.smoke.spec.ts",
      use: { browserName: "chromium", baseURL: dashboardUrl },
    },
    {
      name: "frontend-chromium",
      testMatch: "frontend.smoke.spec.ts",
      use: { browserName: "chromium", baseURL: frontendUrl },
    },
  ],
  webServer: [
    {
      command: "npm run serve:e2e",
      cwd: currentDirectory,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(backendPort),
        E2E_DATABASE_NAME: databaseName,
        STORAGE_PROVIDER: "local",
        DASHBOARD_URL: dashboardUrl,
        FRONTEND_URL: frontendUrl,
      },
      url: `${backendUrl}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${dashboardPort} --strictPort`,
      cwd: path.resolve(currentDirectory, "../dashboard"),
      env: {
        ...process.env,
        VITE_API_BASE_URL: backendUrl,
        VITE_API_PREFIX: "/api/v1",
      },
      url: dashboardUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      cwd: path.resolve(currentDirectory, "../frontend"),
      env: {
        ...process.env,
        VITE_API_BASE_URL: backendUrl,
        VITE_API_PREFIX: "/api/v1",
        VITE_APP_NAME: "Rently E2E",
        VITE_TENANT_SLUG: "e2e-tenant",
        VITE_PROPERTY_SLUG: "e2e-property",
        VITE_ENABLE_MOCK_PAYMENTS: "true",
      },
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
