# Rently App Health Review

## Critical Bugs

- Fixed: `GET /public/bookings/:id` no longer allows unauthenticated booking ID reads. Public detail access now requires either the booking owner session or the released checkout token.
- Fixed: public manual payment no longer accepts booking ID alone. Anonymous payment now requires the matching checkout token; authenticated owner behavior is preserved.

## High Priority Bugs

- Fixed: public availability ignores `RESOLVED` and `CANCELLED` maintenance blocks.
- Fixed: backend Docker runtime now sets `PORT=4000`, matching the exposed container port.
- Fixed: frontend buildspec validates required `VITE_TENANT_SLUG`.

## Medium / UX Bugs

- Fixed: dashboard refund request panel now surfaces a `Process refund` action next to open refund requests when a refundable payment exists.
- Fixed: duplicated backend seed-account env example block was removed.
- Remaining: public mock card/UPI copy should be replaced by a real provider checkout or gated behind an explicit sandbox environment before production.

## React Query / Cache Bugs

- Fixed: public booking detail query keys now separate authenticated access from checkout-token access.
- Fixed: public payment success invalidates related billing document keys.
- Fixed: dashboard gallery queries now use centralized `ADMIN_KEYS.galleries`.

## Backend / Security Notes

- Booking totals and snapshots remain server-owned.
- Manual payment idempotency remains DB-backed and now requires the same anonymous access proof before returning an idempotent result.
- Prisma errors continue to flow through centralized error mapping.

## Refactor Candidates

Execution plan: see `REFACTOR_PLAN.md`.

Required over 1000 lines:

- `backend/src/modules/bookings/bookings.service.ts`
- `backend/src/modules/public/bookings/bookings.service.ts`
- `backend/src/modules/public/availability/availability.service.ts`
- `dashboard/src/features/operations/components/BookingDetailsPage.tsx`
- `dashboard/src/features/operations/components/OperationsPage.tsx`
- `dashboard/src/pages/admin/SystemGuidePage.tsx`
- `dashboard/src/pages/admin/PricingPage.tsx`
- `frontend/src/pages/guest/BookingDetailPage.tsx`

Warning over 700 lines:

- `backend/src/modules/billing/billing.service.ts`
- `dashboard/src/features/operations/components/FrontDeskPage.tsx`
- `dashboard/src/pages/admin/RoomBoardPage.tsx`
- `dashboard/src/pages/admin/UserManagementPage.tsx`
- `dashboard/src/pages/admin/WalkInBookingPage.tsx`
- `frontend/src/pages/guest/BookingPaymentProcessPage.tsx`
- `frontend/src/pages/guest/SpacesListPage.tsx`

Generated Prisma files are intentionally excluded from this list.

## Tests Added / Updated

- Public booking detail denial without owner/token.
- Public booking detail success with released checkout token.
- Anonymous public payment denial without checkout token.
- Anonymous public payment idempotent replay with checkout token.
- Public availability with `RESOLVED` and `CANCELLED` maintenance blocks.

## Remaining Test Gaps

- Frontend/dashboard do not currently have a focused React Query/component test setup for booking/payment/refund UI states.
- Manual QA is still needed for full public checkout, account booking detail, dashboard refund processing, and current-property switching.

## Manual QA Checklist

- Public availability search by city, property, date, guest count, and comfort option.
- Anonymous checkout quote, edit, booking detail, billing document, and payment flows.
- Authenticated account booking detail, cancellation, and refund request flows.
- Dashboard booking detail terminal states: cancelled, refunded, no-show, checked-out.
- Dashboard current-property switch refetches bookings, room board, pricing, maintenance, gallery, and billing views.
