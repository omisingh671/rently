# Phase 6 Load Validation

The load harness runs only against an isolated database whose name contains `load`, `audit`, `test`, or `e2e`. It starts the API on localhost, seeds deterministic data, records endpoint and MySQL evidence, verifies inventory-race invariants, writes the latest JSON report under ignored `backend/load-results/`, and shuts down.

## Commands

Prepare an isolated schema with all Prisma migrations, then run from `backend`:

```powershell
$env:LOAD_DATABASE_NAME='rently_load_local'
npm run load:smoke
npm run load:baseline
```

`npm run load:scheduled` uses the same production-like baseline profile. It is intended for an operator-controlled scheduled job, not GitHub Actions.

Never point `LOAD_DATABASE_NAME` at a development or production schema. The seed deletes and recreates only the dedicated `load-rently` tenant, but the database-name guard is mandatory.

## Fixed Workloads

| Profile | Data volume | Workload |
| --- | --- | --- |
| Smoke | 2 properties, 32 rooms, 200 bookings | 20 availability reads, 2 two-contender lock races, 10 operations reads, 10 room-board reads, 6 reporting reads |
| Baseline / scheduled | 5 properties, 400 rooms, 5,000 bookings | 200 availability reads at concurrency 8, 10 five-contender lock races, 100 operations reads at concurrency 5, 100 room-board reads at concurrency 5, 50 reporting reads at concurrency 3 |

Smoke thresholds are p95 <= 1,500 ms and p99 <= 3,000 ms for reads, p95 <= 3,000 ms and p99 <= 5,000 ms for writes, with zero unexpected errors. Scheduled thresholds are p95 <= 1,000 ms and p99 <= 2,000 ms for reads, p95 <= 2,000 ms and p99 <= 4,000 ms for writes, with at most a 1% unexpected error rate. Inventory races must always create exactly one booking per scenario and leave no active lock.

## Recorded Local Baseline

Run: 2026-07-14 against `rently_audit_019f5ba6`. Local results are a regression baseline, not a production capacity guarantee.

| Endpoint | Requests | p50 | p95 | p99 | Throughput | Unexpected errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| City availability | 210 | 483.9 ms | 669.9 ms | 707.5 ms | 11.65 req/s | 0 |
| Inventory-lock race | 50 | 208.0 ms | 865.8 ms | 970.3 ms | 9.28 req/s | 0 |
| Booking creation | 10 | 96.2 ms | 131.3 ms | 131.3 ms | 1.98 req/s | 0 |
| Operations board | 100 | 318.0 ms | 386.4 ms | 408.1 ms | 15.20 req/s | 0 |
| Room board | 100 | 165.1 ms | 179.8 ms | 181.3 ms | 30.14 req/s | 0 |
| 90-day reporting | 50 | 427.0 ms | 501.8 ms | 538.9 ms | 6.87 req/s | 0 |

Peak MySQL status was 11 connected and 7 running threads. All 10 five-contender races produced one booking each and left zero unreleased locks.

## Query Findings

- The first smoke run exposed availability N+1 pricing and per-target conflict queries. Pricing candidates and conflict evidence are now loaded in bounded batches; availability smoke p95 dropped from about 1.11 seconds to 85 ms.
- The first 5,000-booking baseline exposed one-at-a-time operations mapping. Reusing the existing batch presenter reduced operations-board p95 from about 1.02 seconds to 386 ms.
- Query plans and performance-schema digests remain in the generated JSON report. No index was added: after removing the measured N+1 work, all thresholds passed; the remaining highest-frequency lookups were short indexed reads, while the expiry cleanup time was dominated by deliberate lock contention rather than rows examined.
- Expected `409` losers in inventory races can appear in structured server logs. They are successful concurrency outcomes and are not counted as unexpected load errors.
