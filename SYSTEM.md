# Rently System Health

Last updated: 2026-07-10

## Purpose

This is the live system health and improvement tracker for Rently. Keep this file current as backend, dashboard, and frontend improvements land.

The goal is production readiness through meaningful, behavior-preserving improvements:

- keep existing public API contracts, DTO shapes, query keys, routes, and user-visible workflows stable unless a separate bug fix explicitly requires a change
- reduce UI bugs by extracting repeated layout, state, and form patterns into reusable components and hooks
- reduce long-file risk by moving isolated rendering, mapping, calculation, and validation logic into focused modules
- avoid adding abstraction unless it removes real duplication or makes a risky flow easier to test
- update `SYSTEM.md`, `IMPROVE_BACKEND.md`, `IMPROVE_DASHBOARD_.md`, and `IMPROVE_FRONTEND_.md` after each completed step

## Current Architecture

Rently is a modular monolith with three app packages and no root `package.json`.

### Backend

- Path: `backend`
- Stack: Node.js, Express, TypeScript, Prisma, MySQL/MariaDB, Zod
- Shape: route -> controller -> service -> repository, with DTO/mappers and runtime validation
- Scripts:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run test:booking`
  - `npm run test:payment`
  - `npm run test:rbac`
  - `npm run test:reporting`
  - `npm run check`

### Dashboard

- Path: `dashboard`
- Stack: React, TypeScript, Vite, React Query, Zustand, Tailwind CSS
- Shape: feature folders, centralized API layer, centralized query keys in `dashboard/src/features/config/adminKeys.ts`
- Scripts:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run test:dashboard-health`
  - `npm run check`

### Frontend

- Path: `frontend`
- Stack: React, TypeScript, Vite, React Query, Zustand, Tailwind CSS
- Shape: feature folders, centralized API layer, tenant/property-aware public query keys in `frontend/src/configs/publicQueryKeys.ts`
- Scripts:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run check`

## Current Health Summary

Overall status: good foundation, but not yet production-clean.

The backend already has strong security and correctness guardrails: Zod env parsing, Helmet, CORS allowlist validation, request body limits, public/auth rate limits, centralized error handling, Prisma error masking, DTO/mapping layers, property scoping helpers, and focused backend tests for booking, payment, RBAC, and reporting.

The dashboard and frontend already use modern React patterns, centralized Axios instances, React Query, typed config, reusable base components, and deterministic query-key helpers. The main risk is not missing framework structure; it is large page-level components that own too much rendering and action state.

## Production Strengths

- Backend env validation blocks unsafe production CORS origins and requires production S3 storage configuration.
- Backend public booking/payment access has been hardened so booking details and anonymous manual payments require owner auth or matching checkout token.
- Public availability ignores resolved/cancelled maintenance blocks.
- Booking totals, pricing snapshots, refunds, folio charges, lifecycle state, and billing documents remain server-owned.
- Dashboard query keys are centralized through `ADMIN_KEYS`.
- Frontend public query keys include tenant/property scope and split authenticated booking access from checkout-token access.
- Backend tests exist for public booking, public payment, dashboard RBAC, and reporting analytics.
- Dashboard has a targeted pricing coverage test.
- Shared UI/input building blocks exist in both dashboard and frontend.

## Current Gaps

### Backend

- Public availability service remains large at 1,284 lines, but capacity/allocation, inventory conflicts, space validation, internal option types, and public DTO presentation now have focused modules. Pricing enrichment and option-generation orchestration remain together intentionally.
- Public booking service remains large: `backend/src/modules/public/bookings/bookings.service.ts` is 1,199 lines.
- Dashboard booking helper extraction improved the main service, but some helper files are now large, especially `bookings.assignment.ts` at 1,111 lines.
- Billing service is close to the warning threshold at 732 lines.
- There is no broad automated coverage for every dashboard/frontend workflow that depends on booking/payment/refund behavior.

### Dashboard

- `BookingDetailsPage.tsx` is improved to 987 lines, but remains a high-risk flow because it still owns booking action submission handlers.
- `OperationsPage.tsx` is reduced to 314 lines and now keeps query state, mutations, pagination, errors, and layout orchestration while extracted components own filters, activity tables, summaries, cashier details, and alerts.
- Admin pages are too large: `SystemGuidePage.tsx` 1,583 lines, `PricingPage.tsx` 1,515 lines, `WalkInBookingPage.tsx` 872 lines, `UserManagementPage.tsx` 859 lines, `RoomBoardPage.tsx` 703 lines.
- Dashboard lacks focused component tests for booking/payment/refund states.
- Duplicate component families exist between dashboard and frontend. Do not introduce cross-app package complexity yet, but keep component APIs aligned.

### Frontend

- Guest booking detail page is reduced to 537 lines after extracting stay/guest, cancelled/no-show refund-state, payment-summary, billing-documents, and shared refund-status presentation.
- Guest payment process page is reduced to 467 lines. Its mock card/UPI flow is explicitly development-only, and controlled form state, validation, payment method forms, summary, and terminal states are extracted; real provider integration remains a separate production enhancement.
- Guest spaces list page is reduced to 731 lines after extracting controlled availability filters and responsive clear/check controls; it still owns query orchestration, option grouping/selection, and result states.
- Frontend lacks focused component tests for checkout, payment, booking detail, refund/cancellation, and availability states.

## Large File Inventory

### Over 1000 Lines

- `dashboard/src/pages/admin/SystemGuidePage.tsx`: 1,583
- `dashboard/src/pages/admin/PricingPage.tsx`: 1,515
- `backend/src/modules/public/availability/availability.service.ts`: 1,284
- `backend/src/modules/public/bookings/bookings.service.ts`: 1,199
- `backend/src/modules/bookings/bookings.assignment.ts`: 1,111

### Warning Zone

- `dashboard/src/features/operations/components/BookingDetailsPage.tsx`: 987
- `dashboard/src/pages/admin/WalkInBookingPage.tsx`: 872
- `dashboard/src/pages/admin/UserManagementPage.tsx`: 859
- `dashboard/src/features/operations/components/FrontDeskPage.tsx`: 758
- `backend/src/modules/billing/billing.service.ts`: 732
- `frontend/src/pages/guest/SpacesListPage.tsx`: 731
- `dashboard/src/pages/admin/RoomBoardPage.tsx`: 703

## Improvement Order

Work step by step. Do not attempt all improvements in one pass.

1. Dashboard `BookingDetailsPage.tsx`
   - High UI bug risk because it owns booking action submission.
   - Pure action/display helpers, booking action modal, folio panel, payments panel, billing documents panel, status panel, assignment panel, and booking action state have been extracted.
   - Continue only with meaningful submit-handler or refund-state cleanup; otherwise move to the next high-risk screen.
   - Keep API calls, route, query keys, and visible workflow unchanged.

2. Dashboard `OperationsPage.tsx`
   - Completed: operations summary, cashier details, immediate-attention alerts, filters, and activity tables are extracted.
   - The page remains the query, mutation, pagination, error, and layout orchestration container.
   - Current-property refetch behavior and existing table/filter semantics are preserved.

3. Frontend `BookingPaymentProcessPage.tsx`
   - The mock/sandbox card and UPI flow is gated behind a development-only env flag and cannot render in production builds.
   - Completed: payment method forms, payment summary, terminal states, and controlled form-state hook are extracted.
   - The page retains booking/payment orchestration, payment payload construction, idempotency, mutations, billing queries, and terminal-state selection.

4. Backend public availability
   - Completed: room/unit capacity and greedy guest-allocation helpers are extracted into `availability.capacity.ts`.
   - Completed: shared booking, maintenance, and inventory-lock conflict checks are extracted into `availability.conflicts.ts` without changing repository semantics or the public service API.
   - Completed: public option DTO mapping and internal option types are extracted into `availability.presenter.ts` and `availability.types.ts`.
   - Pricing enrichment and option-generation orchestration remain in the service because separating them safely requires a wider pricing-focused change.
   - Preserve option IDs, response shape, pricing rules, and maintenance behavior.

5. Frontend `BookingDetailPage.tsx` and `SpacesListPage.tsx`
   - Completed for booking detail: stay/guest details, cancelled/no-show refund state, payment summary, billing documents, and repeated refund-status presentation are extracted.
   - The booking-detail page retains queries, derived workflow rules, navigation, mutations, errors, and modal orchestration at 537 lines; further modal extraction is not currently worthwhile.
   - Completed for spaces list: controlled availability filters and responsive clear/check controls are extracted.
   - Existing grid/stack option cards remain the result-presentation owners; continue with loading, error, and empty states without duplicating card abstractions.
   - Preserve checkout-token behavior and public query keys.

6. Backend public booking and billing services
   - Continue extracting calculation, mapping, lifecycle, document, and access helpers.
   - Keep pricing/payment/billing truth server-owned.

7. Dashboard admin pages
   - Split admin pages into page-specific sections and hooks while preserving existing admin-table architecture.

## Reusable UI Direction

Create reusable components only where the same shape appears more than once or where a large page has clear panel boundaries.

Good candidates:

- `PageHeader` / `PageToolbar`
- `FilterBar`
- `MetricCard`
- `StatusPanel`
- `ActionFooter`
- `ConfirmActionModal`
- `PaymentSummary`
- `BookingSummary`
- `BillingDocumentsPanel`
- `RefundRequestPanel`
- `EmptyState`
- `InlineError`
- `LoadingSection`
- `ResponsiveTabs` or `SegmentedControl`

Avoid:

- generic mega-components that need many feature-specific props
- moving business rules into UI components
- changing DTOs or query keys just to make components easier
- cross-package shared UI unless repeated duplication becomes a real maintenance problem

## Verification Policy

Docs-only changes: no code checks required.

Backend-only changes:

- start with targeted backend test for the touched module
- run `npm run typecheck`
- add `npm run lint` or `npm run build` only when exports, config, schema, or shared contracts change

Dashboard-only changes:

- run `npm run typecheck`
- run `npm run lint`
- run `npm run build` when route exports, shared API types, or route-level imports change

Frontend-only changes:

- run `npm run typecheck`
- run `npm run lint`
- run `npm run build` when route-level imports, config, or shared API behavior changes

Shared booking, pricing, payment, billing, auth, tenant, property scoping, or security changes:

- run focused backend tests first
- run affected app typecheck/lint
- run broader checks only when the contract truly crosses apps

## Live Progress Log

### 2026-07-13

- Dashboard `OperationsPage.tsx` extraction completed:
  - added `OperationsImmediateAttentionPanel.tsx`, `OperationsFilters.tsx`, and `OperationsRecordsTable.tsx`
  - reduced `OperationsPage.tsx` from 831 to 314 lines
  - preserved current-property switching, query/mutation ownership, pagination, table semantics, and nested cashier-history overflow
  - verification passed: dashboard typecheck and targeted ESLint
- Frontend payment simulator production boundary completed:
  - added strict `VITE_ENABLE_MOCK_PAYMENTS` parsing to centralized public env config
  - limited the simulator to explicit Vite development mode and kept production builds disabled
  - preserved completed-payment display, booking access, query keys, billing invalidation, and payment payload behavior
  - verification passed: frontend `npm run typecheck`, `npm run lint`, and `npm run build`
- Frontend payment method form extraction completed:
  - added `PaymentMethodTabs.tsx`, `CardPaymentForm.tsx`, and `UpiPaymentForm.tsx`
  - reduced `BookingPaymentProcessPage.tsx` from 934 to 770 lines
  - kept form state, validation, formatting handlers, simulator outcomes, and payment mutation ownership in the page
  - verification passed: frontend typecheck and targeted ESLint
- Frontend payment summary extraction completed:
  - added `PaymentSummaryPanel.tsx`
  - reduced `BookingPaymentProcessPage.tsx` from 770 to 738 lines
  - kept booking-derived labels and amounts owned by the page
  - verification passed: frontend typecheck and targeted ESLint
- Frontend payment terminal-state extraction completed:
  - added `PaymentProcessState.tsx`, `PaymentFailureState.tsx`, `PaymentProcessingState.tsx`, and `PaymentSuccessState.tsx`
  - reduced `BookingPaymentProcessPage.tsx` from 738 to 514 lines
  - kept terminal-state selection, retry handling, authentication decisions, billing queries/download callbacks, and payment mutation ownership in the page
  - verification passed: frontend typecheck and targeted ESLint
- Frontend payment form-state hook extraction completed:
  - added `usePaymentProcessState.ts`
  - reduced `BookingPaymentProcessPage.tsx` from 514 to 467 lines
  - moved controlled field state, input formatting, validation, and reset behavior into the hook
  - kept payment payload construction, idempotency keys, query refetches, and mutation execution in the page
  - verification passed: frontend typecheck and targeted ESLint

### 2026-07-10

- Dashboard `BookingDetailsPage.tsx` first slice completed:
  - added `dashboard/src/features/operations/bookingActionLabels.ts`
  - added `dashboard/src/features/operations/bookingDisplay.ts`
  - reduced `BookingDetailsPage.tsx` from 2,585 to 2,382 lines
  - kept routes, query keys, API calls, mutations, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` action modal slice completed:
  - added `dashboard/src/features/operations/components/BookingActionModal.tsx`
  - moved the booking action modal, room assignment picker, and room-move pricing preview out of the page
  - reduced `BookingDetailsPage.tsx` from 2,382 to 1,847 lines
  - kept action state, submit handlers, routes, query keys, API calls, mutations, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` folio panel slice completed:
  - added `dashboard/src/features/operations/components/BookingFolioPanel.tsx`
  - moved the guest folio add/void UI out of the page
  - reduced `BookingDetailsPage.tsx` from 1,847 to 1,636 lines
  - kept parent mutation handlers, routes, query keys, API calls, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` payments panel slice completed:
  - added `dashboard/src/features/operations/components/BookingPaymentsPanel.tsx`
  - moved the refund-request card, payment ledger, refund transactions, and receipt actions out of the page
  - reduced `BookingDetailsPage.tsx` from 1,636 to 1,376 lines
  - kept parent mutation handlers, billing actions, routes, query keys, API calls, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` billing documents panel slice completed:
  - added `dashboard/src/features/operations/components/BookingBillingDocumentsPanel.tsx`
  - moved invoice/receipt document rendering and document buttons out of the page
  - reduced `BookingDetailsPage.tsx` from 1,376 to 1,299 lines
  - kept billing hooks/actions, routes, query keys, API calls, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` status panel slice completed:
  - added `dashboard/src/features/operations/components/BookingStatusPanel.tsx`
  - moved the operational action/status card and private action button helper out of the page
  - reduced `BookingDetailsPage.tsx` from 1,299 to 1,160 lines
  - kept action ownership, routes, query keys, API calls, mutations, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` assignment panel slice completed:
  - added `dashboard/src/features/operations/components/BookingAssignmentPanel.tsx`
  - moved the current assignment card out of the page
  - reduced `BookingDetailsPage.tsx` from 1,160 to 1,143 lines
  - kept routes, query keys, API calls, mutations, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `BookingDetailsPage.tsx` action state slice completed:
  - added `dashboard/src/features/operations/hooks/useBookingActionState.ts`
  - moved booking action/modal form state, action open/close defaults, and room selection toggling out of the page
  - reduced `BookingDetailsPage.tsx` from 1,143 to 987 lines
  - kept submit handlers, routes, query keys, API calls, mutations, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `OperationsPage.tsx` summary cards slice completed:
  - added `dashboard/src/features/operations/components/OperationsSummaryCards.tsx`
  - moved operations KPI card construction and rendering out of the page
  - reduced `OperationsPage.tsx` from 1,123 to 1,027 lines
  - kept business date, collapse state, cashier totals, `Expected Cash` placement, nested payment-history scrolling, query keys, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Dashboard `OperationsPage.tsx` cashier panel slice completed:
  - added `dashboard/src/features/operations/components/OperationsCashierPanel.tsx`
  - moved cashier totals, cashier by employee rows, and nested payment history out of the page
  - reduced `OperationsPage.tsx` from 1,027 to 831 lines
  - kept `Expected Cash` placement, nested payment-history scrolling, business date, collapse state, query keys, and visible behavior unchanged
  - verification passed: dashboard `npm run typecheck`, dashboard `npm run lint`
- Removed stale `APP_HEALTH.md` and `REFACTOR_PLAN.md`.
- Created fresh system tracker and split improvement trackers:
  - `SYSTEM.md`
  - `IMPROVE_BACKEND.md`
  - `IMPROVE_DASHBOARD_.md`
  - `IMPROVE_FRONTEND_.md`
- Current status was based on targeted code inspection and current line counts.
- No code behavior changed.
- No checks were run because this was a docs-only update.
