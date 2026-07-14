# Rently Industry Behaviour Validation

Validation date: 2026-07-14  
Scope: public availability, reservation integrity, guest booking/payment, dashboard operations, financial controls, RBAC, and operational resilience

## Purpose

This document compares the current Rently implementation with behaviour normally expected from a production serviced-apartment or hotel operations platform. It is intentionally narrower than a general architecture audit.

Validation levels:

- **Automated**: covered by an executed backend or dashboard test.
- **Code validated**: implementation was inspected, but no complete UI journey proves it.
- **Missing**: the capability or required regression coverage does not exist.

## Current Validation Summary

| Workflow | Current evidence | Industry expectation | Status |
|---|---|---|---|
| Public availability and guest booking | Backend tests cover tenant/property scope, date and capacity rules, pricing validity, room/unit combinations, maintenance exclusion, and checkout locks; authenticated browser E2E now proves search, checkout form submission, booking creation, mock full payment, invoice/receipt download, and protected booking-detail access | Server-owned availability with property isolation, atomic inventory protection, and a complete guest confirmation journey | **Critical guest booking journey browser-validated** |
| Public vs walk-in inventory race | Concurrency test proves only one overlapping reservation commits | Exactly one reservation may win for the same inventory and dates | **Validated** |
| Room vs parent-unit overlap | Sequential and concurrent tests cover bidirectional exclusion | Whole-unit reservations block child rooms and child-room reservations block the whole unit | **Validated** |
| Booking vs maintenance race | Maintenance conflict check, write, and audit now share a serializable retrying transaction; concurrency test passes | A booking and non-emergency maintenance block must never both commit for the same target and dates | **Validated in current working tree** |
| Checkout inventory locks | Backend tests cover atomic creation, expiry, release, and booking revalidation | Short-lived holds must expire and booking creation must recheck inventory | **Validated** |
| Booking lifecycle | Tests cover check-in, checkout, no-show, room assignment/move, version checks, audit history, and dirty-room handoff | Material transitions must be versioned, scoped, auditable, and reject invalid state changes | **Validated** |
| Guest cancellation replay | Versioned compare-and-update creates one cancellation transition and releases locks in the same transaction | Repeated or racing cancellation must create one transition and one audit entry | **Validated in current working tree** |
| Pricing, coupon, tax, and policy snapshots | Backend tests cover server-side quotes, coupon-before-tax, GST slabs, frozen booking snapshots, and frozen exceptional-stay policy fingerprints | Historical financial values must not change when future configuration changes | **Validated** |
| Manual payment and refund ledger | Tests cover partial/full payment, overpayment protection, refund limits, idempotency, and property scope | Financial writes must be immutable, scoped, reconcilable, and idempotent | **Validated for manual operation** |
| Simultaneous payment replay | Concurrency test proves one financial record for the same idempotency key | Retried or simultaneous requests must not duplicate money movement | **Validated** |
| Guest refund request | A serializable booking-version claim now covers eligibility, refundable balance, active-request detection, and creation; concurrency tests prove simultaneous requests create one active request and a staff-fulfilment race creates no stale work | At most one active refund request may exist for a booking | **Validated in current working tree** |
| Invoice and receipt generation | Backend tests cover frozen snapshots, access control, idempotency, and concurrent invoice numbering | Fiscal documents must be immutable, uniquely numbered, and access-controlled | **Validated at application level** |
| Online gateway capture/refund | Backend explicitly returns `REFUND_PROVIDER_NOT_CONFIGURED`; UI copy now describes manual-only capability | Signed provider orders/webhooks, event idempotency, reconciliation, and original-source refunds | **Missing; blocks live online payments** |
| Dashboard operations | Backend tests cover walk-in booking, assignment, check-in/out, room move, payments, folio, cashier, housekeeping, and maintenance; browser E2E now proves manager login, property scope, walk-in booking, balance payment, automatic room assignment, check-in, checkout, and housekeeping through inspection | Staff workflows must be property-scoped, versioned, audited, and usable as complete journeys | **Critical staff stay lifecycle browser-validated** |
| Housekeeping | Tests enforce `DIRTY -> CLEANING -> CLEAN -> INSPECTED` and checkout marks rooms dirty | Room readiness must follow an auditable controlled sequence | **Validated** |
| Exceptional stay policy | Tests cover early check-in eligibility/override, early-checkout unused-night refund review, configurable late-checkout tariffs, downgrade credit/no-credit outcomes, policy fingerprints, and property scope | Staff must see a server-owned financial preview and commits must retain auditable policy evidence | **Validated in current working tree** |
| Stay extension | Preview and commit endpoints now reprice added nights, expose room/unit/maintenance/lock conflicts, and atomically update `checkOut`, folio/debit-note evidence, and a dedicated audit event; dashboard and browser E2E cover the operator journey | Extension must atomically revalidate inventory, price added nights, update departure, and audit the change | **Validated in current working tree** |
| RBAC and property isolation | Backend tests cover Super Admin, Admin, Manager, guest/dashboard session audiences, and direct-ID property isolation | Cross-property reads and writes must be denied at service and data-access boundaries | **Validated for covered routes** |
| Browser journey regression | Playwright uses an isolated guarded seed and covers the critical guest booking/payment/document journey, the critical dashboard staff stay lifecycle, duplicate submit, stale version recovery, cross-property denial, deliberate availability failure/retry, and 390px overflow smoke | Critical guest and staff journeys should run deterministically in a guarded test environment | **Local suite validated; hosted CI intentionally omitted** |
| Dependency failure recovery | Focused tests cover bounded retry exhaustion, transaction rollback without partial state, durable PDF failure/retry, durable mail failure/retry, and replay without duplicate sends; correlation IDs, structured error context, and operator controls are implemented | External failures need bounded retries, durable state, operator visibility, and safe replay | **Validated for current manual-payment/document/email paths** |
| Load and query performance | Guarded local smoke and 5-property/400-room/5,000-booking baselines capture endpoint p50/p95/p99, throughput, errors, MySQL connections, slow-query digests, query plans, and inventory-race invariants | Capacity claims must use reproducible measured evidence and distinguish local regression baselines from production guarantees | **Local baseline validated; production capacity still environment-specific** |

## Required Fixes

### P0 - Required before production online payments

1. **Implement a real payment provider boundary**
   - Create provider order/payment intent server-side.
   - Verify signed webhooks and store provider event IDs idempotently.
   - Reconcile capture, failure, refund, and out-of-order events.
   - Refund to the original source with retry and operator-visible status.
   - Keep production payment UI disabled until provider sandbox and failure-path tests pass.

2. **Add deterministic browser E2E for critical journeys**
   - Guest: availability search -> option selection -> booking -> payment result -> booking detail/document access.
   - Staff: login -> walk-in booking -> assignment -> check-in -> payment/folio -> checkout -> housekeeping.
   - Include cross-property denial, double-submit, stale-version, API failure, and mobile viewport cases.
   - Use the isolated E2E seed command and never reset a normal development or production schema.

### P1 - Required for unattended operational safety

3. **Serialize active refund-request creation - completed in the current working tree**
   - Move eligibility, refundable-balance calculation, active-request detection, and creation into one transaction.
   - Use a booking version/CAS or another durable serialization key so two simultaneous requests cannot both commit.
   - Return the existing request or a stable `409 REFUND_REQUEST_ALREADY_EXISTS` result on replay.
   - Add a concurrency test proving one active request and one work item.

4. **Implement true stay extension - completed in the current working tree**
   - Add preview and commit endpoints using `expectedVersion`.
   - Recheck room/unit bookings, maintenance, and inventory locks for the added dates in a serializable transaction.
   - Price and tax only the added nights, persist the adjustment snapshot, update `checkOut`, and create an operation event.
   - Require payment or an audited authorized override before commit, according to property policy.

5. **Add failure-recovery tests and operational visibility - completed for current manual-payment scope**
   - Test transaction retry exhaustion, DB timeout, PDF failure, and mail failure. Provider webhook failure tests remain with the intentionally excluded real-gateway work.
   - Persist retryable work where an external side effect cannot safely complete inside the request.
   - Add structured logs, correlation IDs, retry counts, and operator-visible failed document/email work.

### P2 - Required before scale claims

6. **Add measured load profiles - completed for the recorded local baseline**
   - Benchmark city/property availability, booking creation, operations board, room board, and reporting queries.
   - Define latency/error-rate targets and test realistic concurrent read/write mixes.
   - Review indexes and query plans only from measured slow queries.

7. **Make configurable policy gaps explicit - completed in the current working tree**
   - Define early check-in pricing/override rules.
   - Define early-checkout retention/refund rules.
   - Show downgrade credit/waiver policy before room-move commit.
   - Keep these server-owned and frozen with the booking or adjustment snapshot.

## Already Fixed in the Current Working Tree

- Booking and maintenance creation now share an atomic serializable conflict boundary.
- Guest cancellation now uses optimistic concurrency and releases inventory locks transactionally.
- Payment replay has simultaneous-request regression coverage.
- Guest refund-request creation now uses a serializable booking-version claim; simultaneous requests produce one active request, and a staff-fulfilment race creates no stale work.
- True stay extension now uses preview fingerprints and serializable booking-version commits, reuses shared inventory conflicts, freezes incremental pricing/tax evidence, and preserves whole-unit and multi-room assignments.
- Dashboard guidance no longer claims that Stripe/Razorpay automated refunds are currently integrated.
- Guest token-refund copy now follows the property policy instead of always claiming the token is non-refundable.
- Property policies now explicitly own early check-in, early checkout, late checkout, and downgrade financial behaviour with validated safe defaults.
- Check-in/check-out previews and room-move previews show the server-owned fee, refund-review, tariff, credit, waiver, or no-credit outcome before commit.
- Exceptional-stay commits freeze the policy fingerprint and adjustment evidence, while restricted overrides require an authorized role and audit reason.
- Availability now batches pricing candidates and overlapping booking, maintenance, and lock evidence instead of issuing per-target N+1 queries.
- Operations-board booking mapping now reuses the existing batch presenter instead of resolving assignment labels one booking at a time.
- Guarded smoke and scheduled load profiles record reproducible latency, throughput, error, connection, slow-query, query-plan, and inventory-race evidence without GitHub Actions.
- An isolated Playwright E2E foundation now validates the authenticated guest booking journey through mock payment, invoice/receipt download, and protected booking detail; the manager walk-in lifecycle through payment, automatic assignment, check-in, checkout, and housekeeping inspection; plus 390px public/dashboard overflow smoke.
- Checkout form submission now has an immediate guard that prevents synchronous double-clicks from issuing duplicate booking-create requests.
- Negative browser coverage now validates cross-property anti-enumeration, stale-version recovery, and deliberate API failure/retry behavior.
- Correlation IDs and structured operation context now cover request failures, while shared retry classification limits automatic retries to transient database/network failures.
- Billing PDF generation now has durable status, attempt/error evidence, stored output, safe replay, and an operator retry action without changing the issued financial document.
- Password-reset mail now uses durable delivery jobs, deterministic message identity, SMTP outside the token transaction, and a Super Admin failure/retry panel.

## Latest Validation

- Isolated schema: `rently_audit_019f5ba6`
- Playwright: 5/5 passed
- Backend concurrency: 12/12 passed
- Backend recovery: 3/3 passed
- Backend booking/public availability: 45/45 passed
- Backend payment/refund/operations: 63/63 passed
- Backend dashboard RBAC: 17/17 passed
- Backend typecheck: passed
- Backend lint: passed
- Backend production build: passed
- Dashboard lint: passed
- Dashboard production build: passed
- Phase 6 smoke profile: passed
- Phase 6 5,000-booking baseline: passed; all endpoint thresholds passed, zero unexpected errors, 10/10 single-winner races, zero unreleased locks
- Normal development database was not seeded or reset.

## Release Interpretation

Rently currently has a strong backend foundation for manual-payment hotel operations. It should be treated as a **manual-payment production candidate**, subject to environment-specific migration, SMTP/storage configuration, monitoring, and deployment verification. It is **not ready for live online payments** until the provider, webhook, reconciliation, refund, and provider-failure paths are implemented and tested.
