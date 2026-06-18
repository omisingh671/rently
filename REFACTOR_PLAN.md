# Rently Refactor Execution Plan

## Goal

Reduce large backend, dashboard, and frontend files by responsibility without changing public API contracts or user-visible behavior. Each patch should be reviewable on its own and verified with the smallest relevant checks before moving to the next area.

## Rules

- Do not mix behavior fixes with behavior-preserving refactors unless a confirmed bug blocks the extraction.
- Keep backend pricing, payment, billing, refund, and booking lifecycle truth server-owned.
- Preserve DTO shapes, route paths, query keys, and mutation contracts unless a separate bug/security plan explicitly changes them.
- Prefer extracting existing logic into named helpers/components/hooks over rewriting flow control.
- Keep each patch focused on one ownership area.
- Run targeted checks after each patch; run app-level checks only after cross-app or shared-contract changes.

## Priority Order

1. `backend/src/modules/public/bookings/bookings.service.ts`
2. `backend/src/modules/bookings/bookings.service.ts`
3. `dashboard/src/features/operations/components/BookingDetailsPage.tsx`
4. `dashboard/src/features/operations/components/OperationsPage.tsx`
5. `frontend/src/pages/guest/BookingDetailPage.tsx`
6. `frontend/src/pages/guest/BookingPaymentProcessPage.tsx`
7. `backend/src/modules/public/availability/availability.service.ts`
8. Admin pages: `PricingPage.tsx`, `SystemGuidePage.tsx`, `WalkInBookingPage.tsx`, `RoomBoardPage.tsx`, `UserManagementPage.tsx`
9. `backend/src/modules/billing/billing.service.ts`
10. `frontend/src/pages/guest/SpacesListPage.tsx`

## Phase 1: Public Booking Service

Target file:

- `backend/src/modules/public/bookings/bookings.service.ts`

Status: in progress.

Completed extraction:

- `bookings.access.ts`
  - checkout edit authorization
  - public owner/checkout-token booking detail authorization
- `bookings.financials.ts`
  - paid amount, refunded amount, token paid amount
  - token payment status
  - non-refundable token amount
  - active refund request statuses
- `bookings.tax-breakdown.ts`
  - tax breakdown parsing
  - tax breakdown JSON serialization
- `bookings.targets.ts`
  - property-scope resolution for public options
  - inventory lock coverage checks
  - target keys and target de-duplication support
  - room guest allocation and comfort validation
  - active pricing lookup for selected targets
  - array invariant helper

Current line counts:

- `bookings.service.ts`: 2,081 lines
- `bookings.access.ts`: 82 lines
- `bookings.financials.ts`: 68 lines
- `bookings.targets.ts`: 207 lines
- `bookings.tax-breakdown.ts`: 21 lines

Verification completed:

- `backend`: `npm run typecheck`
- `backend`: `npm run test:booking`
- `backend`: `npm run lint`

Extract by responsibility:

- checkout-token and owner access helpers
- booking target normalization helpers
- pricing snapshot helpers
- tax breakdown helpers
- booking item mapping helpers
- coupon validation helpers
- transaction/retry helpers

Expected result:

- Service keeps orchestration functions.
- Pure calculation and mapping logic moves into nearby files such as:
  - `bookings.access.ts`
  - `bookings.pricing.ts`
  - `bookings.snapshots.ts`
  - `bookings.mapping.ts`

Verification:

- `backend`: `npm run test:booking`
- `backend`: `npm run typecheck`

## Phase 2: Dashboard/Admin Booking Service

Target file:

- `backend/src/modules/bookings/bookings.service.ts`

Extract by responsibility:

- lifecycle transition validation
- status history/audit writes
- payment/refund helper logic
- folio charge helpers
- room assignment and move pricing helpers
- property-scope assertions if duplicated

Expected result:

- Service reads as route-level business orchestration.
- Lifecycle and financial helpers are isolated and testable.

Verification:

- `backend`: `npm run test:payment`
- `backend`: `npm run test:rbac`
- `backend`: `npm run typecheck`

## Phase 3: Dashboard Booking Details Page

Target file:

- `dashboard/src/features/operations/components/BookingDetailsPage.tsx`

Extract components:

- `BookingStatusPanel`
- `BookingAssignmentPanel`
- `BookingPaymentsPanel`
- `BookingRefundRequestPanel`
- `BookingBillingDocumentsPanel`
- `BookingFolioPanel`
- `BookingActionModal`

Extract hooks/helpers:

- `useBookingActionState`
- `useRefundActionState`
- `bookingActionLabels.ts`

Expected result:

- Page container owns data fetching and modal/action orchestration.
- Panels only render state and emit typed callbacks.

Verification:

- `dashboard`: `npm run typecheck`
- `dashboard`: `npm run lint`
- `dashboard`: `npm run build` if route/component exports change.

## Phase 4: Operations Page

Target file:

- `dashboard/src/features/operations/components/OperationsPage.tsx`

Extract components:

- operations summary cards
- cashier by method
- cashier employee history
- booking activity tables
- date/property filters

Expected result:

- Page remains the query/container.
- Scrolling and layout boundaries remain unchanged.

Verification:

- `dashboard`: `npm run typecheck`
- `dashboard`: `npm run lint`

## Phase 5: Guest Booking Detail And Payment Pages

Target files:

- `frontend/src/pages/guest/BookingDetailPage.tsx`
- `frontend/src/pages/guest/BookingPaymentProcessPage.tsx`

Extract components:

- booking summary
- payment summary
- cancellation/refund state panel
- billing documents panel
- terminal state actions
- payment method form sections

Extract hooks/helpers:

- `useBookingAccessToken`
- `useBookingPaymentIntent`
- `bookingDisplay.ts`

Expected result:

- Pages stay as route containers.
- Checkout-token behavior and React Query keys stay unchanged.

Verification:

- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint`
- `frontend`: `npm run build` if route-level imports or query hooks change.

## Phase 6: Public Availability Service

Target file:

- `backend/src/modules/public/availability/availability.service.ts`

Extract by responsibility:

- option generation
- capacity matching
- booking target conflict checks
- city/property filtering
- availability DTO mapping

Expected result:

- Availability rules become easier to test without changing option IDs or public DTOs.

Verification:

- `backend`: `npm run test:booking`
- `backend`: `npm run typecheck`

## Phase 7: Admin Pages

Target files:

- `dashboard/src/pages/admin/PricingPage.tsx`
- `dashboard/src/pages/admin/SystemGuidePage.tsx`
- `dashboard/src/pages/admin/WalkInBookingPage.tsx`
- `dashboard/src/pages/admin/RoomBoardPage.tsx`
- `dashboard/src/pages/admin/UserManagementPage.tsx`

Extract by page:

- form sections
- table sections
- filter bars
- modal bodies
- static guide sections
- page-specific hooks

Expected result:

- Admin pages keep existing admin-table architecture.
- No shared abstraction unless at least two pages already use the same shape.

Verification:

- `dashboard`: `npm run typecheck`
- `dashboard`: `npm run lint`
- `dashboard`: `npm run build` for route-level changes.

## Phase 8: Billing Service

Target file:

- `backend/src/modules/billing/billing.service.ts`

Extract by responsibility:

- billing document numbering
- snapshot mapping
- PDF/document rendering orchestration
- public access checks
- idempotent document creation helpers

Expected result:

- Billing service keeps transaction orchestration.
- Document generation and access helpers are isolated.

Verification:

- `backend`: `npm run test:payment`
- `backend`: `npm run typecheck`

## Phase 9: Spaces List Page

Target file:

- `frontend/src/pages/guest/SpacesListPage.tsx`

Extract components:

- search/filter controls
- availability result cards
- empty/error states
- mobile filter layout

Expected result:

- Public availability query keys and filters remain deterministic.

Verification:

- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint`

## Definition Of Done

For each refactor patch:

- Public behavior is unchanged.
- No public API contract changes.
- No database schema changes.
- File line count is reduced or the responsibility boundary is materially clearer.
- Targeted tests/checks pass.
- Any skipped broader checks are documented.

## Manual QA After Major UI Refactors

- Public availability search by city/property/date/guest/comfort.
- Guest booking detail and payment pages with authenticated and checkout-token access.
- Guest cancellation and refund-request states.
- Dashboard booking detail payment/refund/status actions.
- Dashboard current-property switching on operations, room board, maintenance, pricing, gallery, and billing pages.
