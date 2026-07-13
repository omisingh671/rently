# Dashboard Improvement Plan

Last updated: 2026-07-10

## Goal

Reduce dashboard UI bugs and make operations/admin screens easier to maintain without changing workflows, routes, API contracts, query keys, RBAC behavior, or current-property scoping.

## Current Status

Healthy foundations:

- Feature-based React structure is already present.
- Axios is centralized in `dashboard/src/api/axios.ts`.
- Query keys are centralized in `dashboard/src/features/config/adminKeys.ts`.
- Admin table primitives exist in `dashboard/src/components/admin-table`.
- Shared UI/input/common components exist in `dashboard/src/components`.
- Operation colors are centralized in `dashboard/src/features/operations/operationPalette.ts`.

Main risks:

- Large page components own too much rendering, modal state, and mutation state.
- Booking detail and operations screens are high-risk because they touch payment, refund, folio, assignment, lifecycle, and current-property flows.
- Focused React component tests are limited.

## Priority 1: Booking Details Page

Target:

- `dashboard/src/features/operations/components/BookingDetailsPage.tsx` - 987 lines

Why:

- This is no longer above 1,000 lines, but it remains a high-risk dashboard flow.
- It owns operational booking actions, payment/refund actions, folio UI, billing documents, assignment, room moves, and terminal state handling.

Plan:

- Completed:
  - extracted booking action defaults, action types, status/payment/refund options, and payment reference requirements into `dashboard/src/features/operations/bookingActionLabels.ts`
  - extracted date/money formatting, stay/assignment labels, and payment display labels into `dashboard/src/features/operations/bookingDisplay.ts`
  - extracted the booking action modal, room assignment picker, and room-move pricing preview into `dashboard/src/features/operations/components/BookingActionModal.tsx`
  - extracted the guest folio add/void UI into `dashboard/src/features/operations/components/BookingFolioPanel.tsx`
  - extracted the refund-request card, payment ledger, refund transactions, and receipt actions into `dashboard/src/features/operations/components/BookingPaymentsPanel.tsx`
  - extracted the invoice/receipt billing document section into `dashboard/src/features/operations/components/BookingBillingDocumentsPanel.tsx`
  - extracted the operational action/status card into `dashboard/src/features/operations/components/BookingStatusPanel.tsx`
  - extracted the current assignment card into `dashboard/src/features/operations/components/BookingAssignmentPanel.tsx`
  - extracted booking action/modal form state and room selection toggling into `dashboard/src/features/operations/hooks/useBookingActionState.ts`
- Extract presentational panels:
  - `BookingRefundRequestPanel`
- Extract action state:
  - `useRefundActionState` only if refund request callbacks remain noisy after the next review

Do not change:

- route path
- API calls
- query keys
- mutation invalidation behavior
- modal confirmation semantics
- expected version behavior
- visible labels unless fixing a confirmed copy issue

Verification:

- `dashboard`: `npm run typecheck`
- `dashboard`: `npm run lint`
- `dashboard`: `npm run build` if route-level imports or exports change

Status: in progress. Pure helpers, action modal, folio panel, payments panel, billing documents panel, status panel, assignment panel, and booking action state extraction completed on 2026-07-10.

Last verification:

- `dashboard`: `npm run typecheck` - passed
- `dashboard`: `npm run lint` - passed
- `dashboard`: `npm run build` - skipped because route exports and runtime contracts did not change

## Priority 2: Operations Page

Target:

- `dashboard/src/features/operations/components/OperationsPage.tsx` - 831 lines

Why:

- The page mixes operations summary, cashier summary, employee payment history, activity tables, filters, and layout.
- It is a useful next step after booking detail because it uses related operations data.

Plan:

- Completed:
  - extracted operations summary cards into `dashboard/src/features/operations/components/OperationsSummaryCards.tsx`
  - extracted cashier totals, cashier by employee rows, and nested payment history into `dashboard/src/features/operations/components/OperationsCashierPanel.tsx`
- Remaining:
  - Extract booking activity tables.
  - Extract date/property filters.
  - Preserve the current overflow boundary for nested payment history.

Do not change:

- current-property switching behavior
- query keys
- date filtering behavior
- cashier totals or display semantics
- scroll boundaries

Verification:

- `dashboard`: `npm run typecheck`
- `dashboard`: `npm run lint`

Status: in progress. Operations summary cards and cashier panel extraction completed on 2026-07-10.

Last verification:

- `dashboard`: `npm run typecheck` - passed
- `dashboard`: `npm run lint` - passed
- `dashboard`: `npm run build` - skipped because route exports and runtime contracts did not change

## Priority 3: Admin Pages

Targets:

- `dashboard/src/pages/admin/SystemGuidePage.tsx` - 1,583 lines
- `dashboard/src/pages/admin/PricingPage.tsx` - 1,515 lines
- `dashboard/src/pages/admin/WalkInBookingPage.tsx` - 872 lines
- `dashboard/src/pages/admin/UserManagementPage.tsx` - 859 lines
- `dashboard/src/pages/admin/RoomBoardPage.tsx` - 703 lines

Why:

- These files are long enough to hide UI state bugs and repeated form/table logic.
- Admin screens should stay boring, predictable, and easy to scan.

Plan:

- Split each page into page-local sections before creating shared abstractions.
- Preserve existing admin-table architecture.
- Use existing components first:
  - `AdminTable`
  - `Pagination`
  - `PageSizeSelector`
  - `StatusBadge`
  - `Field`
  - `CompositeField`
  - `ErrorSummary`
  - `Modal`
  - `Button`
- Create shared components only when at least two pages need the same shape.

Do not change:

- route paths
- current admin-table behavior
- filters/pagination semantics
- mutation invalidation behavior
- RBAC assumptions

Verification:

- `dashboard`: `npm run typecheck`
- `dashboard`: `npm run lint`
- `dashboard`: `npm run build` if shared route/page imports change

Status: not started.

## Reusable Dashboard UI Candidates

Build these only when a concrete extraction needs them:

- `PageHeader`
- `PageToolbar`
- `FilterBar`
- `MetricCard`
- `StatusPanel`
- `ActionFooter`
- `ConfirmActionModal`
- `BookingSummaryPanel`
- `PaymentTimeline`
- `FolioChargesTable`
- `BillingDocumentsPanel`
- `InlineError`
- `LoadingSection`
- `EmptyState`

Avoid:

- moving booking/payment business rules into components
- generic components with many feature-specific flags
- changing API DTOs to fit UI extraction
- broad visual redesign while refactoring structure

## Dashboard Production Hardening Backlog

- Add focused component tests for booking detail action states when a test setup is introduced.
- Add coverage for current-property switching on operations, room board, pricing, maintenance, gallery, and billing views.
- Check mobile layout after splitting large operations/admin pages.
- Keep operation color usage centralized through `operationPalette.ts`.

## Update Rule

After every dashboard improvement:

- update the relevant status section here
- update `SYSTEM.md` health summary and progress log
- document exact checks run and any checks skipped
