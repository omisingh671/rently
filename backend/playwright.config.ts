import "dotenv/config";
import { defineConfig } from "playwright/test";

const databaseName = process.env.E2E_DATABASE_NAME?.trim() || "rently_e2e";
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
const port = 4100;

process.env.NODE_ENV = "test";
process.env.PORT = String(port);
process.env.DATABASE_NAME = databaseName;
process.env.E2E_DATABASE_NAME = databaseName;
process.env.RATE_LIMIT_ENABLED = "false";
process.env.STORAGE_PROVIDER = "local";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    extraHTTPHeaders: { Accept: "application/json" },
    trace: "retain-on-failure",
  },
});
