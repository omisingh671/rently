# Multi-Tenant Booking Management System Roadmap

## Product Target

Build a production-grade multi-tenant booking management platform with:

- One shared backend API.
- One internal management dashboard for platform and tenant operators.
- Multiple public client frontends, starting with Sucasa.
- Tenant-safe data boundaries for properties, users, inventory, bookings, leads, pricing, and reporting.

## Target Architecture

### Applications

- `backend/`: shared API, auth, RBAC, tenant scoping, booking logic, pricing, reporting, integrations.
- `dashboard/`: management app for `SUPER_ADMIN`, `ADMIN`, and `MANAGER`.
- `frontend/`: public guest/user app for Sucasa.
- Future client apps: additional branded public frontends that reuse the same backend contracts.

### API Namespaces

- `/api/v1/auth/*`: shared authentication.
- `/api/v1/dashboard/*`: management dashboard APIs.
- `/api/v1/public/*`: public booking/customer APIs.
- Future: `/api/v1/clients/:clientKey/*` or host-based client resolution if client-specific public behavior grows.

### Tenant Boundary

The platform should support multiple client brands and properties.

Current operational boundary is `Property`.

Needed long-term boundary:

- Add a top-level `Tenant` or `Client` model.
- Scope `Property` to tenant/client.
- Scope public frontend config and branding to tenant/client.
- Scope users, assignments, bookings, enquiries, quotes, pricing, and inventory through tenant-owned properties.

## Current Baseline

Already implemented:

- Split apps: `backend/`, `dashboard/`, `frontend/`.
- Dashboard app separated from public frontend.
- Dashboard roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`.
- Public frontend role: `GUEST`.
- Backend roles still shared: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `GUEST`.
- Dashboard CORS origin support via `DASHBOARD_URL`.
- Frontend/dashboard public env handling via `VITE_*`.
- Dashboard backend routes under `/api/v1/dashboard`.
- Public backend routes under `/api/v1/public`.
- Dashboard auth, sidebar, role guards, profile, change password.
- Dashboard modules for properties, admins, managers, assignments, amenities, units, rooms, maintenance, pricing, bookings, enquiries, quotes.
- Public frontend modules for pages, spaces, availability, booking, enquiries, auth, account, bookings.
- Minimal seed covering dashboard users, guest user, property, inventory, pricing, booking, enquiry, quote.
- Backend, dashboard, and frontend build/lint currently pass.
- Phase 1 stale source cleanup completed for unused dashboard placeholder/availability/spaces pages and frontend test page.
- Backend RBAC/property-scope integration tests added for dashboard property access, operations access, inventory denial, and cross-property direct access.
- Backend local smoke script added for health, public spaces, guest login, dashboard admin login, and dashboard `/me`.
- App-level check scripts added for backend, dashboard, and frontend.
- GitHub Actions CI workflow added for backend, dashboard, and frontend checks.
- Phase 2 tenant foundation completed:
  - `Tenant` model added with status, domain, branding, support, currency, and timezone fields.
  - `Property` is now tenant-scoped.
  - Default Sucasa tenant is backfilled by migration and seed data.
  - Public APIs resolve tenant by explicit slug/header/app key/host and scope spaces, availability, bookings, and enquiries.
  - Public tenant config endpoint is available.
  - Public frontend sends explicit tenant slug headers and uses tenant-aware spaces, availability, and bookings query keys.
  - Dashboard tenant management is available for `SUPER_ADMIN`.
  - Dashboard property create/edit/list now includes tenant ownership.
- Phase 4 pricing engine completed:
  - Nightly, weekly, and monthly rates supported.
  - Date-range conflict validation for pricing rules.
  - Tax calculation and coupon validation services implemented.
  - Final quote calculation integrated into booking creation.
  - Dashboard Pricing UX improved with bulk creation and property/unit/room overrides.
  - Coupon management and validation integrated across dashboard and frontend.
- Phase 5 public frontend refinements completed:
  - Modernized BookingForm with occupancy toggles and grid layout.
  - High-end Booking Payment and Account UI (Sucasa theme).
  - MVP cancellation flow and booking history integrated into guest account.
  - Detailed Guest Booking Page with stay breakdown, price summary, and coupon visibility.
- Phase 6 dashboard operations completed:
  - High-density Room Board with live status filtering and unit-based grouping.
  - Walk-in booking module with pricing and availability checks.
  - Manager check-in/check-out workflow with status history.
  - Synchronized availability logic between dashboard and public frontend using shared identifiers.

## Phase 1: Stabilize Current MVP

### Repository Cleanup

- Completed: removed stale unused files:
  - `dashboard/src/pages/admin/ModulePlaceholderPage.tsx`
  - `dashboard/src/pages/admin/AvailabilityPage.tsx`
  - `dashboard/src/pages/admin/SpacesPage.tsx`
  - `frontend/src/pages/test.tsx`
- Completed: searched source for stale references after cleanup.
- Completed: confirmed dashboard has no public guest/register surfaces.
- Completed: confirmed frontend has no admin/super-admin surfaces.
- Keep `ROADMAP.md` as the single planning source.

### Validation

- Completed: add repeatable smoke scripts for:
  - backend health
  - public spaces
  - guest login
  - dashboard admin login
  - dashboard `/me`
- Completed: add package scripts for app-level checks:
  - backend typecheck/lint/build
  - dashboard lint/build
  - frontend lint/build
- Document local run commands for backend, dashboard, and frontend.

### RBAC Hardening

- Completed: add backend tests for:
  - `SUPER_ADMIN` can access all dashboard resources.
  - `ADMIN` can access only assigned property data.
  - `MANAGER` can access only operations modules.
  - `MANAGER` cannot access inventory, pricing, properties, admins, managers, or assignments.
  - Direct ID access is blocked across property boundaries.
- Ensure frontend dashboard routes match backend permission rules.
- Ensure sidebar visibility is not treated as security.

## Phase 2: Multi-Tenant Foundation

### Data Model

- Completed: add `Tenant` model:
  - `id`
  - `name`
  - `slug`
  - `primaryDomain`
  - `status`
  - `brandName`
  - `logoUrl`
  - `primaryColor`
  - `secondaryColor`
  - `supportEmail`
  - `supportPhone`
  - `defaultCurrency`
  - `timezone`
  - `createdAt`
  - `updatedAt`
- Completed: add `tenantId` to `Property`.
- Deferred: tenant-level user ownership. Current user scope still flows through property assignments.
- Completed: tenant configuration and public branding fields live on `Tenant`.
- Current role boundary:
  - `SUPER_ADMIN`: platform global.
  - `ADMIN`: property scoped through assignments.
  - `MANAGER`: property scoped through assignments.

### Tenant Resolution

- Completed: public tenant resolution supports:
  - Host-based: `sucasa.example.com` resolves to Sucasa tenant.
  - Explicit public query: `?tenantSlug=sucasa`.
  - Explicit request headers: `x-tenant-slug` and `x-app-name`.
  - Fallback default active tenant.
- Deferred: path-based `/clients/sucasa` routing.
- Completed: public APIs scope spaces, availability, booking creation, and enquiry creation by tenant.
- Completed: dashboard property APIs use tenant ownership and existing property assignment scope.

### Tenant Configuration

- Completed: add tenant config fields:
  - brand name
  - logo
  - theme colors
  - support email
  - support phone
  - default currency
  - timezone
- Deferred: public booking rules as structured tenant policy.
- Completed: add dashboard page for super-admin tenant management.
- Completed: add public endpoint for tenant config.

### Remaining Tenant Work

- Add tenant-scoped dashboard users only if the product requires admin access across multiple properties without explicit property assignments.
- Add tenant-aware reporting filters.
- Completed for Sucasa frontend: add explicit `VITE_TENANT_SLUG=sucasa` env wiring and tenant-scoped public query keys.
- Add client-specific frontend environment examples for future public brands.
- Add deployment checklist for each public tenant/frontend.

## Phase 3: Booking Core

### Availability Engine

- Completed for current single room/unit booking scope: formalize availability checks for:
  - room-level bookings
  - unit-level bookings
  - maintenance blocks
  - min/max stay rules
  - occupancy rules
  - pricing validity windows
- Completed: add transaction-safe booking creation for public bookings.
- Completed: prevent overlapping public booking races with an in-transaction availability recheck and serializable transaction retry.
- Completed: add booking overlap indexes for room/date, unit/date, and status/date lookups.
- Deferred to group booking work: multi-room capacity selection and lock rollback.

### Booking Lifecycle

- Completed: add durable booking lifecycle foundation:
  - readable booking reference
  - guest name/email/contact snapshots
  - internal notes
  - booking status history/audit records
  - dashboard status update history notes
  - payment confirmation status history
- Current status workflow:
  - `PENDING`
  - `CONFIRMED`
  - `CHECKED_IN`
  - `CHECKED_OUT`
  - `CANCELLED`
  - `NO_SHOW`
- Deferred: `NO_SHOW` enum value. Current schema supports the active MVP statuses except `NO_SHOW`.
- Completed: cancellation policy fields for MVP guest cancellations:
  - `cancellationReason`
  - `cancelledAt`
  - guest cancellation allowed for `PENDING` and `CONFIRMED` bookings before check-in
- Completed: add booking notes and internal activity history.
- Completed: add manager check-in/check-out workflow UI and API ergonomics on top of the existing booking status lifecycle.
- Completed: add booking audit trail.

### Payments

- Completed: add payment foundation:
  - `Payment` model linked to booking, property, and user.
  - Payment provider/status enums.
  - Idempotency key uniqueness.
  - Manual payment endpoint for MVP booking confirmation.
  - Atomic payment creation plus booking confirmation.
  - Tests for payment confirmation, idempotent replay, and duplicate payment rejection.
- Current product decision: keep manual payment as the MVP flow and defer real payment gateway integration until the rest of the booking, dashboard, reporting, deployment, and operational workflows are stable.
- Ready for future gateways:
  - Razorpay
  - Stripe
  - provider order/payment/signature fields
  - idempotent payment creation
- Completed: add payment records:
  - amount
  - provider
  - status
  - provider order/payment ids
  - booking id
  - refund/failure metadata fields
- Deferred until late-stage gateway integration: webhook verification.
- Completed for manual payment: add idempotency keys for payment creation.
- Completed: expose the manual payment and confirmation flow in the public frontend.
- Deferred until late-stage gateway integration: provider callback idempotency keys and webhook event storage.

## Phase 4: Pricing Engine

### Pricing Rules

- Completed: add nightly, weekly, and monthly rate support.
- Completed: add date-range conflict validation for pricing.
- Completed: add tax calculation service.
- Completed: add coupon validation service.
- Completed: add final quote calculation API.

### Dashboard Pricing UX

- Completed: improve pricing page ergonomics:
  - better filters
  - inline validation
  - conflict warnings
  - bulk rate creation
  - clear active/inactive states
- Completed: add read-only preview of public price calculation.

## Phase 5: Public Frontend Platform

### Sucasa Frontend

- Completed: polish public booking flow:
  - search
  - availability
  - detail
  - booking
  - payment
  - confirmation
- Add loading and error states everywhere.
- Completed: public pending bookings can continue to manual payment and display confirmation state.
- Replace visual placeholders with real assets or tenant-managed media.
- Completed: improve account pages:
  - bookings
  - profile
  - payments
  - cancellation flow
- Completed for MVP cancellation flow: account bookings can cancel pending or confirmed future bookings.
- Add SEO metadata for public pages.

### Multi-Frontend Strategy

- Decide how new client frontends are created:
  - one reusable frontend with tenant config
  - separate branded frontends per client
  - hybrid with shared package/components
- Extract shared public app modules if multiple frontends diverge.
- Add client-specific env examples.
- Add deployment checklist per client.

## Phase 6: Dashboard Operations

### Admin Workflows

- Improve property assignment workflow:
  - one primary admin per property
  - manager assignment scoped to admin-owned properties
  - clear conflict/error messages
- Add audit logs for:
  - property changes
  - user changes
  - assignment changes
  - pricing changes
  - booking status changes
- Add dashboard notifications.

### Manager Workflows

- Completed: add manager-focused operations view:
  - Room Board for live status monitoring
  - Walk-in booking for quick reservations
  - pending enquiries
  - pending quotes
  - active bookings
- Completed: add quick status updates.
- Completed: add notes and follow-up reminders.

### Reporting

- [ ] Add dashboard reports:
  - [ ] occupancy
  - [ ] revenue
  - [ ] booking source
  - [ ] enquiry conversion
  - [ ] property performance
  - [ ] manager activity
- [ ] Add export to CSV.
- [ ] Add date range filters.

## Phase 7: Security And Reliability

### Authentication

- Review refresh token lifecycle.
- Add refresh token rotation if needed.
- Add session list and revoke sessions.
- Add password policy.
- Add rate limiting for:
  - login
  - register
  - forgot password
  - public enquiry
  - booking creation
- Add account lockout or throttling.

### API Security

- Add Helmet/security headers.
- Tighten CORS by environment.
- Add request size limits.
- Add structured error responses everywhere.
- Ensure no Prisma/internal errors leak to clients.
- Add input sanitization where needed.

### Observability

- Add request logging.
- Add structured application logs.
- Add error tracking integration.
- Add health checks:
  - API process
  - database connectivity
  - mail provider
  - payment provider
- Add metrics for bookings and failed requests.

## Phase 8: Testing

### Backend Tests

- Unit tests for services:
  - auth
  - dashboard scoping
  - availability
  - booking creation
  - pricing calculation
- Integration tests for routes:
  - auth
  - dashboard modules
  - public modules
- Transaction and race condition tests for booking creation.

### Frontend Tests

- Dashboard route permission tests.
- Public booking flow tests.
- Form validation tests.
- API error-state tests.
- Mobile layout smoke tests.

### E2E Tests

- Super-admin creates property.
- Super-admin creates admin.
- Super-admin assigns property.
- Admin creates manager.
- Admin creates inventory and pricing.
- Guest searches availability.
- Guest creates booking.
- Manager updates booking.

## Phase 9: Deployment

### Local And Docker

- Add or update Docker Compose for:
  - backend
  - MySQL
  - dashboard
  - frontend
- Add production Dockerfiles if needed.
- Add local seed/reset commands.
- Document local workflow.

### CI/CD

- Completed: add GitHub Actions CI workflow for:
  - backend typecheck/lint/build
  - frontend lint/build
  - dashboard lint/build
  - Prisma client generation
  - Prisma migration validation against CI MySQL
  - backend RBAC, booking, and payment tests
- Add deployment pipelines for:
  - backend
  - dashboard
  - public frontend(s)

### Production Configuration

- Backend env must include:
  - `FRONTEND_URL`
  - `DASHBOARD_URL`
  - database credentials
  - JWT secrets
  - mail credentials
  - payment provider secrets
- Frontend/dashboard env must include only public `VITE_*` values.
- Never put backend secrets in browser apps.

## Sucasa Business Reference

This section replaces the old `PROJECT_REF.md`. It captures product rules and future booking logic for the first client frontend, Sucasa.

### Business Model

Sucasa Homes rents serviced apartments where guests book complete rooms or complete units.

Core decisions:

- No bed model.
- No per-bed booking.
- No per-person pricing for normal room stays.
- A room is always booked as a whole.
- `maxOccupancy` differentiates room capacity.
- "Shared bedroom" means the room supports two known guests together, not strangers sharing inventory.

Primary products:

- Single occupancy private room: one room, one guest max.
- Double occupancy room: one room, up to two guests.
- Whole apartment/unit: all rooms in a unit booked exclusively.
- Long stay: extended stay flow with weekly/monthly pricing or quote.
- Corporate: negotiated or tenant-specific pricing.

### Booking Types

Current implemented booking target types:

- `ROOM`: one full room.
- `UNIT`: one full unit/apartment.

Future booking types from the product spec:

- `MULTI_ROOM`: guest selects multiple rooms/units to satisfy a larger group.
- `LONG_STAY`: longer stay with weekly/monthly rate logic.
- `CORPORATE`: company or HR-led booking with corporate pricing.

Quote requests are separate lead records, not a booking type. For long/corporate stays that need negotiation, the public app should create a quote request and the dashboard team should follow up.

### Search And Availability Rules

Current baseline:

- Public frontend can list active spaces.
- Availability checks active pricing, overlapping bookings, and maintenance blocks.
- Bookings are scoped to room/unit/property.

Target rules:

- `occupancyType=single`: return rooms where `maxOccupancy = 1`.
- `occupancyType=double`: return rooms where `maxOccupancy = 2`.
- `occupancyType=unit`: return units where total room capacity can cover requested guests.
- If no single unit covers the group size, activate group mode.
- Group mode should return available units and rooms in separate sections.
- Group booking button stays disabled until selected capacity covers requested guests.
- Unit booking blocks all rooms inside the unit for overlapping dates.
- Room booking blocks its parent unit for overlapping dates.
- Maintenance blocks remove matching properties, units, or rooms from availability.

### Inventory Locking Future Spec

Inventory locking is not yet fully implemented and should be treated as future work.

Target behavior:

- Create short-lived inventory locks during checkout.
- Use a 10-minute TTL.
- For group bookings, create one lock per selected item.
- If any group lock fails, rollback all locks acquired in the attempt.
- Release locks after successful booking confirmation.
- Expire stale locks automatically.

### Pricing Rules

Current baseline:

- Room products and room pricing exist.
- Taxes and coupons exist in dashboard/backend modules.
- Public spaces expose active price-per-night values.

Target rules:

- Normal room pricing is flat per room, not per person.
- 7-29 nights should prefer weekly or long-stay rates when available.
- 30+ nights should route to quote flow by default.
- Corporate pricing should prefer corporate tiers when applicable.
- Seasonal pricing should apply only inside valid date ranges.
- Tax and coupon calculation must be server-side.
- Frontend price preview is advisory only.
- Final totals must be recalculated on booking creation.
- Booking price snapshots must be frozen at creation time.
- Existing bookings must not change when rate records are edited later.

### Booking Data Future Spec

Current booking records store the selected target, product snapshot, price per night, dates, status, and total amount.

Future booking model should add:

- `bookingRef`, for example `SCH-2026-0001`.
- `bookingType`.
- guest snapshot fields.
- price breakdown fields.
- `BookingItem` records for multi-room/group bookings.
- coupon relation and frozen coupon metadata.
- tax breakdown.
- internal notes.
- status history/audit trail.

### Public Route Intent

Current public routes include:

- `/`
- `/apartments`
- `/rooms-tariffs`
- `/amenities`
- `/gallery`
- `/location`
- `/long-stays`
- `/faq`
- `/contact`
- `/spaces`
- `/spaces/:id`
- `/availability-result`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password/:token`
- `/account`
- `/bookings`
- `/privacy`
- `/terms`

Future public route intent:

- Add a dedicated search route if needed.
- Add a dedicated quote request route for 30+ nights and corporate leads.
- Add public booking payment and confirmation routes for the current manual payment flow.
- Improve account booking cancellation and payment history.

### Dashboard Route Intent

Current dashboard routes include:

- `/dashboard`
- `/properties`
- `/admins`
- `/managers`
- `/property-assignments`
- `/inventory/amenities`
- `/inventory/units`
- `/inventory/rooms`
- `/inventory/maintenance`
- `/inventory/pricing`
- `/bookings`
- `/enquiries`
- `/quotes`
- `/settings`
- `/profile`
- `/change-password`

Target dashboard behavior:

- Super admin manages tenants, properties, admins, and assignments.
- Admin manages assigned properties, managers, inventory, pricing, maintenance, and operations.
- Manager handles only bookings, enquiries, quotes, and operational status updates.

### Sucasa Business Rules

1. Flat per-room pricing for normal stays; no per-person charge by default.
2. A room is booked as a whole; no partial-room booking.
3. `maxOccupancy` is the main room capacity field.
4. Unit booking blocks all child rooms for overlapping dates.
5. Room booking blocks parent unit booking for overlapping dates.
6. Group mode should auto-activate when no single unit fits the guest count.
7. Group selection must cover the requested guest count before booking.
8. Group lock rollback must release all locks if any selected item fails.
9. 30+ night stays should go to quote flow.
10. 7-29 night stays should prefer weekly/long-stay rates where available.
11. Inventory lock TTL should be 10 minutes when locking is implemented.
12. Booking pricing must be frozen at creation time.
13. Coupon validation must be server-side.
14. A coupon applies to the whole booking subtotal for group bookings.
15. Quote requests should not require login.
16. Booking references should follow a readable yearly sequence.
17. Checkout session keys should be arrays to support single and group bookings.

## Immediate Next Tasks

1. **Reporting & Analytics (Phase 6)**: Build dashboard reports for occupancy, revenue, and manager activity to provide operational insights.
2. **Inventory Locking (Phase 3 Deferred)**: Implement TTL-based inventory locks to prevent double bookings during high-traffic checkouts.
3. **Security & Reliability (Phase 7)**: Implement rate limiting, password policy, and session management.
4. **Real Payment Gateway Integration**: Transition from manual payment flow to Stripe/Razorpay once operational workflows are fully stable.
5. **Mobile Responsiveness Polish**: Audit and fix layout shifts and density issues on mobile for the new Room Board and Pricing pages.
