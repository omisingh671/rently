# Rently Industry Behaviour Fix Plan

Plan date: 2026-07-14  
Scope: all remaining industry-behaviour gaps except real payment-gateway integration

## Objective

Close the remaining correctness, operational, browser-regression, failure-recovery, and scale-validation gaps without changing the current manual-payment model.

## Delivery Rules

- Work in small, independently verifiable phases.
- Preserve Route -> Controller -> Service -> Repository boundaries.
- Keep DTO responses, Zod validation, RBAC, property scoping, deterministic query keys, and centralized API clients intact.
- Use only an isolated audit/test database for destructive or concurrency tests.
- Do not introduce Prisma schema changes unless a durable invariant cannot be enforced safely in the current schema.
- Complete and verify one phase before starting the next.

## Phase 1 - Deterministic Browser E2E Foundation

Priority: **P0**  
Goal: prove the critical guest and staff workflows through the real frontend/dashboard routes.

Status: **Completed for local execution**

Completed foundation:

- isolated database-name guard and deterministic idempotent seed
- Playwright orchestration for backend, frontend, and dashboard
- authenticated guest availability -> checkout form -> full mock payment -> invoice/receipt download -> protected booking detail journey
- manager login -> walk-in booking -> balance payment -> automatic room assignment -> check-in -> checkout -> housekeeping inspection journey
- cross-property anti-enumeration denial, duplicate-submit protection, stale-version recovery, and API-failure retry journeys
- 390px public availability and dashboard login overflow smoke
- failure screenshots, video, traces, and reports ignored as generated artifacts

Remaining in this phase:

- none; hosted CI execution is intentionally out of scope

### Implementation

1. Harden `backend/scripts/seed-e2e.ts`:
   - fail closed unless the database name contains `test`, `audit`, or `e2e`
   - create deterministic tenant, property, users, rooms, pricing, policy, and credentials
   - make repeated execution idempotent
   - output only non-sensitive fixture identifiers needed by tests
2. Add Playwright configuration and package scripts using the existing Playwright dependency.
3. Add reusable authenticated dashboard and guest fixtures.
4. Add guest journey coverage:
   - search by tenant/property/city/date/guest/comfort
   - select an availability option
   - create a booking
   - record the supported manual/mock payment outcome
   - open booking detail and billing documents
5. Add staff operations journey coverage:
   - dashboard login and property selection
   - walk-in availability and booking
   - assignment and check-in prerequisites
   - payment and folio action
   - checkout and housekeeping progression
6. Add negative journeys:
   - cross-property access denial
   - duplicate submit protection
   - stale booking version
   - API error and retry state
   - 390px mobile viewport for critical screens

### Verification

- E2E seed guard rejects a normal development database.
- Guest critical journey passes from a clean isolated schema.
- Staff critical journey passes from a clean isolated schema.
- Negative and mobile smoke projects pass.
- Existing backend booking/payment/RBAC tests remain green.

### Completion Criteria

- One command can seed and execute deterministic guest and dashboard E2E tests locally.
- Failures retain screenshots/traces as generated artifacts, not tracked source files.

## Phase 2 - Atomic Guest Refund Requests

Priority: **P0**  
Goal: guarantee at most one active refund request per booking under simultaneous submissions.
Status: **Completed**

### Implementation

1. Add a repository transaction that owns:
   - booking ownership and property-scope lookup
   - cancelled/no-show eligibility
   - refundable-balance calculation
   - active-request lookup
   - request creation
2. Serialize the operation with booking-version compare-and-update inside a serializable transaction with bounded retry.
3. On replay, return either:
   - the existing active request as an idempotent result, or
   - stable `409 REFUND_REQUEST_ALREADY_EXISTS`
4. Keep the public service as orchestration and DTO mapping only.
5. Avoid a migration initially. Add a schema invariant only if transaction/CAS evidence cannot guarantee the rule across every writer.

### Tests

- Two simultaneous requests create exactly one active request.
- Repeated request returns the defined stable result.
- Request racing with staff refund fulfilment cannot create stale work.
- Cross-user and cross-property access stays denied.
- Non-refundable and invalid-status bookings remain rejected.

### Verification

- `backend`: `npm run test:concurrency`
- `backend`: `npm run test:payment`
- `backend`: `npm run typecheck`
- `backend`: targeted lint for touched files

### Completion Criteria

- Database evidence shows one active request and no duplicate operational work after simultaneous submissions.

## Phase 3 - True Stay Extension

Priority: **P1**  
Goal: extend a booking departure date without overselling inventory or losing pricing/audit history.

Status: **Completed**

### Backend Design

1. Add preview and commit endpoints:
   - `POST /bookings/:id/stay-extension/preview`
   - `POST /bookings/:id/stay-extension`
2. Validate with Zod:
   - new checkout date
   - expected booking version
   - preview fingerprint
   - optional authorized override reason
3. Preview must calculate:
   - added nights
   - destination inventory conflicts
   - maintenance and inventory-lock conflicts
   - incremental subtotal, discount policy, tax, and total
   - resulting balance
4. Commit inside a serializable transaction:
   - compare `expectedVersion`
   - recheck all conflicts
   - verify the preview fingerprint
   - update `checkOut`
   - persist the incremental pricing/tax snapshot
   - create folio/debit-document impact
   - create an immutable booking operation event
5. Reuse availability conflict semantics; do not duplicate room/unit overlap logic.

### Dashboard Design

1. Add an Extend Stay action to booking details.
2. Show current/new checkout, added nights, price/tax difference, balance, and conflicts before confirmation.
3. Require explicit confirmation and show audited override controls only to authorized roles.
4. Invalidate booking detail, room board, operations board, availability, billing, and reporting query keys deterministically.

### Tests

- Extension succeeds when inventory remains available.
- Extension fails for overlapping room, parent unit, maintenance, or active lock.
- Two simultaneous extensions produce one winner.
- Stale version and stale preview fingerprint fail without side effects.
- Added-night calculation and tax snapshot are frozen.
- Whole-unit and multi-room bookings preserve all assigned inventory.
- Dashboard RBAC and cross-property scope are enforced.

### Verification

- Focused backend booking/payment/concurrency tests
- Backend typecheck and lint
- Dashboard typecheck and targeted lint
- Stay-extension browser E2E journey

### Completion Criteria

- `checkOut`, availability, folio balance, billing evidence, and audit history agree after extension.

## Phase 4 - Failure Recovery and Operational Visibility

Priority: **P1**  
Goal: make recoverable failures safe, observable, and replayable.

Status: **Completed**

Implemented ownership:

- Request middleware owns correlation IDs and returns the same ID in response headers/error DTOs; the structured logger carries request and operation context.
- Booking, payment, billing, maintenance, and availability repositories/services own bounded transient-database retry. Validation, RBAC, optimistic-version, uniqueness, and business-rule failures are not generic retry candidates.
- `BillingDocument` owns durable PDF generation status, attempts, correlation/error evidence, stored output, and the property-scoped dashboard retry route.
- `EmailDeliveryJob` owns password-reset delivery status, attempts, deterministic message identity, error evidence, and the Super Admin list/retry route. Reset-token persistence commits before SMTP, while SMTP remains outside the transaction.
- The dashboard Billing and User Management screens expose failed work and recoverable retry actions.

### Implementation

1. Standardize correlation IDs and structured error context for booking, payment, refund, billing-document, email, and maintenance operations.
2. Add explicit retry classification:
   - retry only transient DB/network failures
   - never retry validation, RBAC, version-conflict, or business-rule failures automatically
3. Keep external side effects outside long database transactions.
4. For PDF/email work that must survive process restart, introduce durable job/outbox state only after mapping the exact failure path and ownership.
5. Add operator-visible status and safe retry controls for failed document/email work.

### Tests

- Serializable retry exhaustion returns a stable conflict/service error.
- DB timeout does not create partial booking/payment/refund state.
- PDF failure does not mark a document as successfully generated.
- Email failure does not roll back a valid financial or booking transaction.
- Replaying a failed job does not duplicate documents, numbers, or notifications.
- Partial API failures render recoverable UI states.

### Verification

- Focused backend tests for each touched failure path
- Relevant frontend/dashboard error-state E2E tests
- Typecheck and targeted lint in affected packages

### Completion Criteria

- Each critical side effect has a documented owner, durable status where required, bounded retry policy, and operator recovery path.

## Phase 5 - Property Policy Completion

Priority: **P2**  
Goal: make early-arrival, early-departure, late-departure, and downgrade financial behaviour explicit and server-owned.

Status: **Completed in the current working tree**

Implemented ownership:

- `PropertyBookingPolicy` owns validated early check-in, early checkout, late checkout, and downgrade rules with backward-compatible defaults.
- Booking check-in/check-out previews own timezone-aware fee, refund-review, and override results before commit.
- Check-in, check-out, late-checkout, and room-move commits freeze the applicable policy fingerprint and adjustment evidence.
- Room downgrade commits explicitly support configured credit, no-credit, and authorized waiver outcomes.
- Dashboard confirmation flows show the server-owned result and collect the required override/waiver reason.

### Implementation

1. Define property-level policy fields for:
   - early check-in eligibility, fee, and override role
   - early checkout retention/refund calculation
   - configurable late-checkout tariff
   - downgrade credit, waiver, or no-credit behaviour
2. Validate policy updates with Zod and preserve safe defaults.
3. Freeze the applicable policy or adjustment snapshot when an operation commits.
4. Add preview responses before financially material staff actions.
5. Show the policy result and required reason before confirmation.

### Tests

- Policy validation and property scoping
- Boundary dates/times in the property timezone
- Fee, waiver, refund, and no-credit outcomes
- Frozen historical behaviour after policy changes
- RBAC for overrides

### Verification

- Prisma generate/migration validation only if schema changes are approved
- Focused backend booking/payment tests
- Dashboard typecheck, lint, and targeted E2E

### Completion Criteria

- Staff can predict and audit the financial result before committing each exceptional stay operation.

## Phase 6 - Load and Query Validation

Priority: **P2**  
Goal: establish measured capacity instead of assuming scalability from architecture.

Status: **Completed for the recorded local baseline**

Implemented ownership:

- A guarded dependency-free harness owns isolated smoke and scheduled/baseline workloads, endpoint percentiles, throughput, error rates, MySQL connection telemetry, slow-query digests, and query plans.
- The deterministic seed owns 2-property/200-booking smoke data and 5-property/400-room/5,000-booking baseline data.
- Inventory-lock race scenarios assert one booking winner and zero unreleased locks.
- Measured availability and operations-board N+1 paths were replaced with bounded conflict/pricing loads and the existing batch booking presenter.
- Generated reports are ignored under `backend/load-results/`; the reproducible commands and recorded baseline live in `backend/scripts/load/README.md`.
- No hosted GitHub Actions workflow was added; `load:scheduled` is operator-controlled.

### Implementation

1. Add controlled load profiles for:
   - city/property availability search
   - checkout lock and booking creation
   - dashboard operations board
   - room board
   - reporting endpoints
2. Use isolated production-like data volume and a fixed workload definition.
3. Capture p50/p95/p99 latency, throughput, error rate, DB connections, and slow queries.
4. Review query plans and add indexes only for measured bottlenecks.
5. Define CI smoke thresholds separately from scheduled load-test thresholds.

### Completion Criteria

- Each critical endpoint has a recorded baseline, agreed threshold, and reproducible load command.
- No inventory or financial invariant fails under the tested concurrency level.

## Recommended Execution Order

1. Phase 1: E2E foundation
2. Phase 2: refund-request concurrency
3. Phase 3: stay extension
4. Phase 4: failure recovery
5. Phase 5: policy completion
6. Phase 6: load validation

Phase 2 may begin after the isolated database guard is complete; the full browser suite does not need to be finished first. Phases 3-5 should add their regression journeys to the Phase 1 harness as they are delivered.

## Definition of Done

- All phase-specific automated tests pass.
- No destructive test targets a normal development or production database.
- Public APIs change only where the approved feature requires it.
- DTOs, schemas, RBAC, property scope, audit events, and query invalidation are verified.
- Exact commands and skipped checks are recorded in the phase handoff.
- `INDUSTRY_BEHAVIOUR_VALIDATION.md` is updated only with verified current status.
