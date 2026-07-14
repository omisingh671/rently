import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import mysql, { type Connection } from "mysql2/promise";

import {
  loadProfiles,
  parseLoadProfileName,
  type EndpointThreshold,
} from "./load-config.js";

const profileName = parseLoadProfileName(process.argv[2]);
const loadDatabaseName = process.env.LOAD_DATABASE_NAME?.trim() ?? "";
if (!/(load|audit|test|e2e)/i.test(loadDatabaseName)) {
  throw new Error(
    `LOAD_DATABASE_NAME must identify an isolated load/audit/test/e2e database; received ${loadDatabaseName || "<empty>"}`,
  );
}
process.env.DATABASE_NAME = loadDatabaseName;
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.STORAGE_PROVIDER = "local";

const profile = loadProfiles[profileName];
const port = Number(process.env.LOAD_PORT ?? 4192);
const baseUrl = `http://127.0.0.1:${port}`;

interface RequestResult {
  status: number;
  elapsedMs: number;
  body: unknown;
}

interface MetricSummary {
  requests: number;
  failures: number;
  errorRate: number;
  throughputPerSecond: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  threshold: EndpointThreshold;
  passed: boolean;
}

class MetricStore {
  private readonly entries = new Map<
    string,
    Array<{
      elapsedMs: number;
      failed: boolean;
      startedAt: number;
      completedAt: number;
    }>
  >();

  record(
    name: string,
    elapsedMs: number,
    failed: boolean,
    startedAt: number,
    completedAt: number,
  ) {
    const values = this.entries.get(name) ?? [];
    values.push({ elapsedMs, failed, startedAt, completedAt });
    this.entries.set(name, values);
  }

  summarize(): Record<string, MetricSummary> {
    return Object.fromEntries(
      [...this.entries.entries()].map(([name, entries]) => {
        const durations = entries.map((entry) => entry.elapsedMs).sort((a, b) => a - b);
        const failures = entries.filter((entry) => entry.failed).length;
        const durationSeconds = Math.max(
          (Math.max(...entries.map((entry) => entry.completedAt)) -
            Math.min(...entries.map((entry) => entry.startedAt))) /
            1_000,
          0.001,
        );
        const percentile = (value: number) =>
          durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)] ?? 0;
        const threshold = profile.thresholds[name]!;
        const errorRate = entries.length === 0 ? 0 : failures / entries.length;
        const summary: MetricSummary = {
          requests: entries.length,
          failures,
          errorRate,
          throughputPerSecond: entries.length / durationSeconds,
          minMs: durations[0] ?? 0,
          p50Ms: percentile(0.5),
          p95Ms: percentile(0.95),
          p99Ms: percentile(0.99),
          maxMs: durations.at(-1) ?? 0,
          threshold,
          passed:
            percentile(0.95) <= threshold.p95Ms &&
            percentile(0.99) <= threshold.p99Ms &&
            errorRate <= threshold.maxErrorRate,
        };
        return [name, summary];
      }),
    );
  }
}

const metrics = new MetricStore();

const request = async (
  name: string | null,
  pathname: string,
  init: RequestInit,
  expectedStatuses: number[] = [200],
): Promise<RequestResult> => {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, init);
    const completedAt = performance.now();
    const elapsedMs = completedAt - startedAt;
    const body = (await response.json().catch(() => null)) as unknown;
    if (name !== null) {
      metrics.record(
        name,
        elapsedMs,
        !expectedStatuses.includes(response.status),
        startedAt,
        completedAt,
      );
    }
    return { status: response.status, elapsedMs, body };
  } catch (error: unknown) {
    const completedAt = performance.now();
    const elapsedMs = completedAt - startedAt;
    if (name !== null) {
      metrics.record(name, elapsedMs, true, startedAt, completedAt);
    }
    throw error;
  }
};

const jsonHeaders = (extra: Record<string, string> = {}) => ({
  "Content-Type": "application/json",
  ...extra,
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const unwrapData = (body: unknown) => {
  const record = asRecord(body);
  return asRecord(record?.data) ?? record;
};

const requireString = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${label} in load response`);
  }
  return value;
};

const toDateValue = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: Date, days: number) =>
  new Date(value.getTime() + days * 86_400_000);

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for load telemetry`);
  return value;
};

const runConcurrent = async (
  iterations: number,
  concurrency: number,
  operation: (iteration: number) => Promise<void>,
) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(iterations, concurrency) }, async () => {
      while (true) {
        const iteration = next;
        next += 1;
        if (iteration >= iterations) return;
        await operation(iteration);
      }
    }),
  );
};

const connectTelemetry = () =>
  mysql.createConnection({
    host: requireEnv("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT),
    user: requireEnv("DATABASE_USER"),
    password: requireEnv("DATABASE_PASSWORD"),
    database: requireEnv("DATABASE_NAME"),
  });

const statusValue = async (connection: Connection, name: string) => {
  const [rows] = await connection.query("SHOW GLOBAL STATUS LIKE ?", [name]);
  const row = (rows as Array<{ Value?: string }>)[0];
  return Number(row?.Value ?? 0);
};

const startDatabaseSampler = (connection: Connection) => {
  let stopped = false;
  let peakConnected = 0;
  let peakRunning = 0;
  const completed = (async () => {
    while (!stopped) {
      const [connected, running] = await Promise.all([
        statusValue(connection, "Threads_connected"),
        statusValue(connection, "Threads_running"),
      ]);
      peakConnected = Math.max(peakConnected, connected);
      peakRunning = Math.max(peakRunning, running);
      await delay(100);
    }
  })();
  return {
    stop: async () => {
      stopped = true;
      await completed;
      return { peakConnected, peakRunning };
    },
  };
};

const resetSlowQueryDigest = async (connection: Connection) => {
  try {
    await connection.query(
      "TRUNCATE TABLE performance_schema.events_statements_summary_by_digest",
    );
    return true;
  } catch {
    return false;
  }
};

const readSlowQueryDigest = async (connection: Connection) => {
  try {
    const [rows] = await connection.query(
      `SELECT DIGEST_TEXT AS digestText,
              COUNT_STAR AS executions,
              ROUND(AVG_TIMER_WAIT / 1000000000, 3) AS avgMs,
              ROUND(MAX_TIMER_WAIT / 1000000000, 3) AS maxMs,
              SUM_ROWS_EXAMINED AS rowsExamined
         FROM performance_schema.events_statements_summary_by_digest
        WHERE SCHEMA_NAME = ?
        ORDER BY SUM_TIMER_WAIT DESC
        LIMIT 15`,
      [process.env.DATABASE_NAME],
    );
    return rows as Array<Record<string, unknown>>;
  } catch (error: unknown) {
    return [{ unavailable: error instanceof Error ? error.message : String(error) }];
  }
};

const readQueryPlans = async (connection: Connection, propertyId: string) => {
  const rangeStart = "2026-06-01 00:00:00";
  const rangeEnd = "2026-09-01 00:00:00";
  const plans = {
    operationsBoard: [
      `SELECT id FROM bookings
        WHERE propertyId = ?
          AND status IN ('CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW')
        ORDER BY checkIn ASC, createdAt ASC`,
      [propertyId],
    ],
    roomBoard: [
      `SELECT bi.id FROM booking_items bi
        INNER JOIN bookings b ON b.id = bi.bookingId
        WHERE b.propertyId = ?
          AND b.status NOT IN ('CANCELLED', 'CHECKED_OUT', 'NO_SHOW')
          AND b.checkIn < ? AND b.checkOut > ?`,
      [propertyId, rangeEnd, rangeStart],
    ],
    reportingBookings: [
      `SELECT id FROM bookings
        WHERE propertyId = ?
          AND checkIn < ? AND checkOut > ?
          AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
      [propertyId, rangeEnd, rangeStart],
    ],
  } satisfies Record<string, [string, unknown[]]>;
  const result: Record<string, unknown> = {};
  for (const [name, [sql, parameters]] of Object.entries(plans)) {
    try {
      const [rows] = await connection.query(`EXPLAIN FORMAT=JSON ${sql}`, parameters);
      const first = (rows as Array<Record<string, unknown>>)[0];
      const raw = first ? Object.values(first)[0] : null;
      result[name] = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (error: unknown) {
      result[name] = {
        unavailable: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return result;
};

const main = async () => {
  const { seedLoadData } = await import("./seed-load.js");
  const seed = await seedLoadData(profile);
  const { app } = await import("../../src/app.js");
  const { prisma } = await import("../../src/db/prisma.js");
  const server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const telemetry = await connectTelemetry();

  try {
    let lastHealthError = "no response";
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const health = await fetch(`${baseUrl}/health`).catch((error: unknown) => {
        if (error instanceof Error) {
          const cause = "cause" in error ? String(error.cause) : "";
          lastHealthError = `${error.message}${cause ? ` (${cause})` : ""}`;
        } else {
          lastHealthError = String(error);
        }
        return null;
      });
      if (health?.ok) break;
      if (health) lastHealthError = `HTTP ${health.status}`;
      if (attempt === 49) {
        throw new Error(`Load server did not become healthy: ${lastHealthError}`);
      }
      await delay(100);
    }

    const login = await request(
    null,
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: jsonHeaders({ "X-App-Client": "dashboard" }),
        body: JSON.stringify({ email: seed.managerEmail, password: seed.password }),
      },
    );
    const accessToken = requireString(unwrapData(login.body)?.accessToken, "access token");
    const dashboardHeaders = jsonHeaders({
      Authorization: `Bearer ${accessToken}`,
      "X-App-Client": "dashboard",
    });
    const publicHeaders = jsonHeaders({ "X-Tenant-Slug": seed.tenantSlug });
    await resetSlowQueryDigest(telemetry);
    const sampler = startDatabaseSampler(telemetry);

    const availabilityStart = new Date("2035-01-01T00:00:00.000Z");
    await runConcurrent(
      profile.workloads.availability.iterations,
      profile.workloads.availability.concurrency,
      async (iteration) => {
        const from = addDays(availabilityStart, iteration % 30);
        await request("availability", "/api/v1/public/availability/check", {
          method: "POST",
          headers: publicHeaders,
          body: JSON.stringify({
            checkIn: toDateValue(from),
            checkOut: toDateValue(addDays(from, 2)),
            guests: 2,
            comfortOption: "AC",
            city: seed.city,
          }),
        });
      },
    );

    const createdBookingIds: string[] = [];
    for (let scenario = 0; scenario < profile.workloads.bookingRace.scenarios; scenario += 1) {
      const from = addDays(new Date("2036-01-01T00:00:00.000Z"), scenario * 3);
      const to = addDays(from, 2);
      const availability = await request(
        "availability",
        "/api/v1/public/availability/check",
        {
          method: "POST",
          headers: publicHeaders,
          body: JSON.stringify({
            checkIn: toDateValue(from),
            checkOut: toDateValue(to),
            guests: 2,
            comfortOption: "AC",
            city: seed.city,
          }),
        },
      );
      const options = unwrapData(availability.body)?.options;
      if (!Array.isArray(options) || options.length === 0) {
        throw new Error(`Booking race ${scenario + 1} returned no availability option`);
      }
      const option = asRecord(options[0]);
      const bookingOptionId = requireString(option?.optionId, "booking option ID");
      const propertyId = requireString(option?.propertyId, "option property ID");
      const lockResults = await Promise.all(
        Array.from({ length: profile.workloads.bookingRace.contenders }, () =>
          request(
            "inventoryLock",
            "/api/v1/public/inventory-locks",
            {
              method: "POST",
              headers: publicHeaders,
              body: JSON.stringify({
                bookingOptionId,
                propertyId,
                from: toDateValue(from),
                to: toDateValue(to),
                guests: 2,
                comfortOption: "AC",
              }),
            },
            [201, 409],
          ),
        ),
      );
      const winners = lockResults.filter((result) => result.status === 201);
      if (winners.length !== 1) {
        throw new Error(
          `Inventory race ${scenario + 1} expected one lock winner; received ${winners.length}`,
        );
      }
      const lockToken = requireString(unwrapData(winners[0]!.body)?.lockToken, "lock token");
      const booking = await request(
        "bookingCreate",
        "/api/v1/public/bookings",
        {
          method: "POST",
          headers: publicHeaders,
          body: JSON.stringify({
            bookingOptionId,
            propertyId,
            inventoryLockToken: lockToken,
            from: toDateValue(from),
            to: toDateValue(to),
            guests: 2,
            comfortOption: "AC",
            guestDetails: {
              name: `Load Race Guest ${scenario + 1}`,
              email: `load-race-${scenario + 1}@rently.test`,
              contactNumber: "+919199999999",
            },
          }),
        },
        [201],
      );
      createdBookingIds.push(requireString(unwrapData(booking.body)?.id, "booking ID"));
    }

    const businessDate = toDateValue(new Date());
    await runConcurrent(
      profile.workloads.operationsBoard.iterations,
      profile.workloads.operationsBoard.concurrency,
      async () => {
        await request(
          "operationsBoard",
          `/api/v1/properties/${seed.propertyId}/operations/board?businessDate=${businessDate}`,
          { method: "GET", headers: dashboardHeaders },
        );
      },
    );
    await runConcurrent(
      profile.workloads.roomBoard.iterations,
      profile.workloads.roomBoard.concurrency,
      async () => {
        await request(
          "roomBoard",
          `/api/v1/properties/${seed.propertyId}/room-board?from=2026-07-01&to=2026-08-01`,
          { method: "GET", headers: dashboardHeaders },
        );
      },
    );
    await runConcurrent(
      profile.workloads.reporting.iterations,
      profile.workloads.reporting.concurrency,
      async () => {
        await request(
          "reporting",
          `/api/v1/reporting/analytics?startDate=2026-06-01&endDate=2026-09-01&propertyId=${seed.propertyId}`,
          { method: "GET", headers: dashboardHeaders },
        );
      },
    );

    const databaseConnections = await sampler.stop();
    const [unreleasedLocks, createdBookings, slowQueries, queryPlans] = await Promise.all([
      prisma.inventoryLock.count({
        where: { bookingId: { in: createdBookingIds }, releasedAt: null },
      }),
      prisma.booking.count({ where: { id: { in: createdBookingIds } } }),
      readSlowQueryDigest(telemetry),
      readQueryPlans(telemetry, seed.propertyId),
    ]);
    const invariantChecks = {
      expectedRaceBookings: profile.workloads.bookingRace.scenarios,
      createdRaceBookings: createdBookings,
      unreleasedLocks,
      passed:
        createdBookings === profile.workloads.bookingRace.scenarios &&
        unreleasedLocks === 0,
    };
    const results = metrics.summarize();
    const thresholdsPassed = Object.values(results).every((result) => result.passed);
    const passed = thresholdsPassed && invariantChecks.passed;
    const { password: _password, ...safeSeed } = seed;
    const report = {
      generatedAt: new Date().toISOString(),
      profile: profile.name,
      workload: profile.workloads,
      seed: safeSeed,
      results,
      databaseConnections,
      invariantChecks,
      slowQueries,
      queryPlans,
      thresholdsPassed,
      passed,
    };
    const resultDirectory = path.resolve("load-results");
    await mkdir(resultDirectory, { recursive: true });
    const reportPath = path.join(resultDirectory, `phase6-${profile.name}-latest.json`);
    await writeFile(
      reportPath,
      JSON.stringify(
        report,
        (_key, value: unknown) =>
          typeof value === "bigint" ? value.toString() : value,
        2,
      ),
      "utf8",
    );
    console.log(
      JSON.stringify(
        { reportPath, ...report },
        (_key, value: unknown) =>
          typeof value === "bigint" ? value.toString() : value,
        2,
      ),
    );
    if (!passed) process.exitCode = 1;
  } finally {
    await telemetry.end();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await prisma.$disconnect();
  }
};

main().catch(async (error: unknown) => {
  console.error(error);
  const { prisma } = await import("../../src/db/prisma.js");
  await prisma.$disconnect();
  process.exitCode = 1;
});
