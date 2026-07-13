# Backend Improvement Plan

Last updated: 2026-07-10

## Goal

Make the backend easier to reason about and safer to change without changing app behavior, API contracts, DTO shapes, database schema, or server-owned booking/payment/pricing rules.

## Current Status

Healthy foundations:

- Express app has Helmet, CORS allowlist validation, request size limits, cookie parsing, rate limits, centralized 404/error handling, and Prisma error masking.
- Runtime env validation is handled with Zod.
- Backend uses layered module structure with routes, controllers, services, repositories, DTOs, mappers, and Zod schemas.
- Dashboard property scoping is centralized in `backend/src/common/services/scoping.service.ts`.
- Booking/payment/security tests exist:
  - `backend/tests/public-booking.test.ts`
  - `backend/tests/public-payment.test.ts`
  - `backend/tests/dashboard-rbac.test.ts`
  - `backend/tests/reporting-analytics.test.ts`

Main risks:

- Some services/helpers remain very large.
- Availability and booking flows are business-critical and must be split carefully.
- Billing and payment flows need behavior-preserving extraction only.

## Priority 1: Public Availability Service

Target:

- `backend/src/modules/public/availability/availability.service.ts` - 1,284 lines
- `backend/src/modules/public/availability/availability.capacity.ts` - 62 lines
- `backend/src/modules/public/availability/availability.conflicts.ts` - 82 lines
- `backend/src/modules/public/availability/availability.presenter.ts` - 61 lines
- `backend/src/modules/public/availability/availability.types.ts` - 54 lines

Why:

- This is a high-risk pricing/search area.
- The service likely mixes option generation, capacity matching, maintenance/booking conflict checks, pricing enrichment, and DTO mapping.

Plan:

- Keep request criteria normalization in `availability.schema.ts`, where Zod already owns date, guest, comfort, and city parsing.
- Completed: extracted room/unit capacity and guest-allocation helpers into `availability.capacity.ts`.
- Completed: extracted shared booking, maintenance, and inventory-lock conflict checks into `availability.conflicts.ts`.
- Completed: moved space availability validation into the conflict module while preserving the service export used by booking flows.
- Completed: extracted public option DTO mapping into `availability.presenter.ts` and shared internal option types into `availability.types.ts`.
- Add or preserve focused tests for city/property/date/guest/comfort behavior.

Do not change:

- option IDs
- public response DTOs
- pricing totals
- tenant/property scoping
- maintenance block semantics

Verification:

- `backend`: `npm run test:booking`
- `backend`: `npm run typecheck`
- Add `npm run lint` if multiple files change.

Status: completed for the scoped behavior-preserving extraction. Capacity/allocation, inventory conflicts, space validation, internal option types, and public DTO presentation now have focused owners. The service retains pricing enrichment and option-generation orchestration because moving those together would create a wider high-risk change. Option IDs, DTOs, pricing totals, tenant/property scope, maintenance behavior, transaction clients, service exports, and error responses are preserved. Verified with `npm run typecheck`, `npm run test:booking` (45 passing), and `npm run lint` after each slice.

## Priority 2: Public Booking Service

Target:

- `backend/src/modules/public/bookings/bookings.service.ts` - 1,126 lines
- `backend/src/modules/public/bookings/bookings.checkout-quote.ts` - 40 lines

Why:

- It owns public booking creation, checkout-token access, checkout edits, quote recalculation, coupon/tax/policy behavior, and guest-facing booking details.
- Previous extraction already reduced some responsibilities, but the service is still large.

Plan:

- Keep orchestration in the service.
- Completed: moved the shared retry mechanics into `bookings.lifecycle.ts` while keeping transaction callbacks and caller-specific exhausted-error behavior in the service.
- Completed: extracted existing-booking checkout quote reconstruction into `bookings.checkout-quote.ts`.
- Checkout-token and owner access already have a focused owner in `bookings.access.ts`; do not duplicate it.
- Public booking DTO presentation already has a focused owner in `bookings.presenter.ts`; do not duplicate it.

Do not change:

- checkout-token behavior
- authenticated owner behavior
- booking totals or snapshots
- coupon-before-tax calculation
- inventory lock behavior
- public query contract

Verification:

- `backend`: `npm run test:booking`
- `backend`: `npm run test:payment` if payment/billing access is touched
- `backend`: `npm run typecheck`

Status: completed for the scoped behavior-preserving extraction. Existing-booking checkout quote reconstruction now owns currency, policy, nights, booking-item reconstruction, coupon normalization, and quote calculation while receiving the existing transaction client. `bookings.lifecycle.ts` now owns the bounded Prisma concurrency retry mechanics. The service retains creation and checkout-update orchestration, transaction callbacks, access checks, coupon fallback and usage updates, caller-specific exhausted-error mapping, and DTO mapping. Verified with `npm run typecheck`, `npm run test:booking` (45 passing), and `npm run lint`.

## Priority 3: Dashboard Booking Helpers

Targets:

- `backend/src/modules/bookings/bookings.assignment.ts` - 1,111 lines
- `backend/src/modules/bookings/bookings.lifecycle.ts` - 662 lines
- `backend/src/modules/bookings/bookings.operations.ts` - 508 lines

Why:

- The main dashboard booking service is now smaller at 576 lines, but some extracted helpers have become large.
- This is acceptable short-term, but future changes should keep helper files from becoming new service monoliths.

Plan:

- Split `bookings.assignment.ts` into assignment validation, room-move pricing preview, and transactional availability helpers only when modifying that flow.
- Keep `bookings.room-move.ts` as the transaction coordinator for priced room moves.
- Keep lifecycle status validation and audit writes grouped unless a smaller extraction is obvious.

Do not change:

- optimistic version checks
- status transition order
- room availability validation order
- room-move pricing fingerprint behavior
- folio/debit-note creation

Verification:

- `backend`: `npm run test:booking`
- `backend`: `npm run test:payment`
- `backend`: `npm run test:rbac`
- `backend`: `npm run typecheck`

Status: monitor; extract only when touching the related flow.

## Priority 4: Billing Service

Target:

- `backend/src/modules/billing/billing.service.ts` - 645 lines
- `backend/src/modules/billing/billing.snapshots.ts` - 101 lines

Why:

- Billing document generation is production-sensitive.
- The file is not urgent, but it is near the warning threshold.

Plan:

- Reviewed: document numbering already has a focused transactional owner in `billing.repository.ts`; do not duplicate it.
- Completed: extracted pure snapshot construction and folio-total calculation into `billing.snapshots.ts`.
- Reviewed: the public booking access check is not duplicated; keep it service-owned.
- Extract document rendering orchestration if it grows.

Do not change:

- invoice/receipt/debit-note/credit-note semantics
- idempotent document creation
- payment/refund balance calculations
- public access proof checks

Verification:

- `backend`: `npm run test:payment`
- `backend`: `npm run typecheck`

Status: completed for the current scoped extraction. Pure guest, property, tenant, booking, price, payment, line-item, and folio-total snapshot construction now has a focused owner. The service retains document creation orchestration, retries, numbering calls, idempotency recovery, access checks, DTO mapping, settings, and PDF rendering. Invoice, receipt, debit-note, frozen-snapshot, access, and numbering behavior are preserved. Verified with `npm run test:payment` (57 passing), `npm run typecheck`, and `npm run lint`.

## Backend Production Hardening Backlog

- Add focused tests when extracting availability option generation.
- Add focused tests for billing document access and generation if billing is refactored.
- Keep production CORS validation and S3 requirements intact.
- Consider adding a small smoke test around `/health` and required env parsing if deployment failures recur.
- Avoid new dependencies unless they remove clear production risk.

## Update Rule

After every backend improvement:

- update the relevant status section here
- update `SYSTEM.md` health summary and progress log
- document exact checks run and any checks skipped
