# Frontend Improvement Plan

Last updated: 2026-07-10

## Goal

Make the guest-facing app production-ready and easier to maintain without changing public booking, checkout-token, availability, payment, billing document, tenant, property, or query-key behavior.

## Current Status

Healthy foundations:

- Feature-based React structure is already present.
- Axios is centralized in `frontend/src/api/axios.ts`.
- Public query keys are centralized in `frontend/src/configs/publicQueryKeys.ts`.
- Query keys include tenant and optional property scope.
- Public booking detail keys separate authenticated access from checkout-token access.
- Shared UI/input/common components exist in `frontend/src/components`.
- `VITE_TENANT_SLUG` is required by frontend env parsing.

Main risks:

- Guest booking and payment pages are long and state-heavy.
- The payment process still exposes a mock/sandbox card and UPI flow.
- Availability/search UI is large and can hide mobile/filter/empty-state bugs.
- Focused component tests for guest booking/payment/refund flows are not present.

## Priority 1: Payment Process Page Production Boundary

Target:

- `frontend/src/pages/guest/BookingPaymentProcessPage.tsx` - 467 lines

Why:

- This is the main production-readiness risk in the guest app.
- It currently contains mock card/UPI form state and a simulated payment action.

Plan:

- Production boundary completed:
  - the mock/sandbox flow requires `VITE_ENABLE_MOCK_PAYMENTS=true`
  - production builds always disable the simulator even if the variable is set
  - completed-payment states remain accessible when the simulator is disabled
- Keep backend manual payment access proof and idempotency behavior unchanged.
- Component extraction completed:
  - `PaymentMethodTabs`
  - `CardPaymentForm`
  - `UpiPaymentForm`
  - `PaymentSummaryPanel`
  - `PaymentProcessState`
  - `PaymentFailureState`
  - `PaymentProcessingState`
  - `PaymentSuccessState`
  - `usePaymentProcessState`

Do not change:

- booking ID route behavior
- checkout-token behavior
- billing document invalidation
- payment mutation payload shape
- success/failure terminal navigation unless the provider integration requires a separate approved plan

Verification:

- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint`
- `frontend`: `npm run build` if route-level imports or env config changes
- `backend`: `npm run test:payment` if payment payload/access behavior changes

Status: completed on 2026-07-13. The page now owns booking/payment orchestration, idempotency, mutations, billing queries, and terminal-state selection while extracted components and the state hook own presentation and controlled form behavior.

Last verification:

- `frontend`: `npm run typecheck` - passed
- targeted frontend ESLint - passed
- full frontend lint - skipped because targeted ESLint covered the touched files
- `frontend`: `npm run build` - skipped because routes, query hooks, env config, and shared API contracts did not change

## Priority 2: Guest Booking Detail Page

Target:

- `frontend/src/pages/guest/BookingDetailPage.tsx` - 537 lines
- `frontend/src/features/bookings/components/BookingCancellationPanel.tsx` - 143 lines
- `frontend/src/features/bookings/components/BookingPaymentSummaryPanel.tsx` - 214 lines
- `frontend/src/features/bookings/components/BookingStaySummaryPanel.tsx` - 177 lines
- `frontend/src/features/bookings/bookingDisplay.ts` - 36 lines
- `frontend/src/features/billing/components/BookingBillingDocumentsPanel.tsx` - 74 lines

Why:

- It owns guest booking status display, billing documents, cancellation/refund states, authenticated access, and checkout-token access.
- It is a likely source of UI bugs because many booking states render differently.

Plan:

- Completed: extracted stay, booked-item, and guest-information presentation into `BookingStaySummaryPanel.tsx`.
- Completed: extracted payment breakdown and payment-state presentation into `BookingPaymentSummaryPanel.tsx`.
- Completed: extracted billing-document loading, empty, error, and list presentation into `BookingBillingDocumentsPanel.tsx`.
- Completed: extracted the cancelled/no-show refund-state panel into `BookingCancellationPanel.tsx`.
- Keep terminal action buttons and refund/cancellation modals with their mutation orchestration; extracting them now would create a prop-heavy boundary without reducing workflow risk.
- Completed: centralized the repeated cancellation/refund label helper in `bookingDisplay.ts` and reused it in the booking list and detail panel.
- Consider `useBookingAccessToken` only if token parsing/navigation logic is duplicated.

Do not change:

- public query keys
- checkout-token access behavior
- authenticated account behavior
- cancellation/refund mutation payloads
- billing document download behavior

Verification:

- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint`
- `frontend`: `npm run build` if route imports or query hooks change

Status: completed for the scoped presentation refactor. The page is now the query, derived-rule, navigation, mutation, error, and modal-orchestration owner. Stay/guest details, payment summary, cancellation/no-show state, billing documents, and repeated refund-status wording have focused presentation owners. Verified with `npm run typecheck` and targeted ESLint after each slice. Build was skipped because route configuration, query hooks, and API contracts did not change.

## Priority 3: Spaces List / Availability UI

Target:

- `frontend/src/pages/guest/SpacesListPage.tsx` - 488 lines
- `frontend/src/features/availability/availabilityPresentation.ts` - 240 lines
- `frontend/src/features/availability/components/AvailabilityFiltersPanel.tsx` - 191 lines
- `frontend/src/features/availability/components/AvailabilityResultsState.tsx` - 71 lines

Why:

- It mixes search/filter controls, availability query state, result rendering, empty/error states, and mobile layout.
- Public availability behavior is business-critical and must stay deterministic.

Plan:

- Completed: extracted controlled search/filter controls and their desktop/mobile button layouts into `AvailabilityFiltersPanel.tsx`.
- Keep using the existing `OptionGridCard` and `OptionStackCard` result components; another card abstraction would duplicate their responsibility.
- Completed: extracted deterministic result merging, grouping, sorting, sectioning, selected-comfort resolution, selected-option mapping, and variant price labels into `availabilityPresentation.ts`.
- Completed: extracted booking-error, invalid-date, loading, API-error, and no-results presentation into `AvailabilityResultsState.tsx`.
- Completed with the shared filter panel; desktop and mobile clear/check controls now share the same controlled props.

Do not change:

- availability query keys
- city/property/date/guest/comfort parameters
- booking option IDs
- option selection behavior
- tenant/property scope

Verification:

- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint`
- `backend`: `npm run test:booking` only if API assumptions are touched

Status: completed for the scoped refactor. The page now owns URL parameters, geolocation, property scope, React state/memoization, deterministic query keys, query execution, booking/navigation, layout preference, and successful-result composition. Controlled filters, non-success states, and pure availability presentation rules have focused owners; existing grid/stack cards remain the result-card owners. Verified with `npm run typecheck` and targeted ESLint after each slice. Backend tests were skipped because API assumptions and availability parameters did not change.

## Reusable Frontend UI Candidates

Build these only when a concrete extraction needs them:

- `BookingSummary`
- `PaymentSummary`
- `BillingDocumentsPanel`
- `RefundStatePanel`
- `AvailabilityFilterBar`
- `AvailabilityResultCard`
- `MobileFilterSheet`
- `InlineError`
- `LoadingSection`
- `EmptyState`
- `SegmentedControl`

Existing reusable components to prefer first:

- `Button`
- `Modal`
- `StatusBadge`
- `Field`
- `CompositeField`
- `ErrorSummary`
- `OptionGridCard`
- `OptionStackCard`
- `OptionDetailsModal`
- `OptionPricePanel`

Avoid:

- moving pricing/payment rules into frontend helpers
- changing query keys to make components simpler
- introducing a cross-app design-system package before duplication becomes painful enough
- building generic components that only one page uses

## Frontend Production Hardening Backlog

- Integrate a real payment provider before enabling live online payments; the mock/sandbox UI is development-only.
- Add focused component tests for payment success/failure/denial states when a test setup is introduced.
- Add focused tests for authenticated booking detail and checkout-token booking detail rendering.
- Manual QA public availability search by city/property/date/guest/comfort after availability UI extraction.
- Manual QA anonymous checkout quote, edit, detail, billing document, and payment flow after payment/booking changes.

## Update Rule

After every frontend improvement:

- update the relevant status section here
- update `SYSTEM.md` health summary and progress log
- document exact checks run and any checks skipped
