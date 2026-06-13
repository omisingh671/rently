# Rently Application Health Report

**Assessment date:** June 13, 2026  
**Initial status:** **Degraded**  
**Post-remediation status:** **Conditionally Healthy**

The initial end-to-end QA pass found cross-application authentication risk, test
isolation defects, an unreliable local smoke script, and a dashboard pricing
coverage false warning. The production code and automated tests have been
remediated. Final release status remains conditional on completing the two
environment-dependent verification gates listed below.

## QA Coverage

| Area | Result | Evidence |
| --- | --- | --- |
| Database connectivity | Pass | Prisma connected to local MySQL |
| Prisma migrations | Pass | 3 migrations found; database schema is up to date |
| Backend typecheck/lint/build | Pass | All completed successfully |
| Dashboard typecheck/lint | Pass | All completed successfully |
| Frontend typecheck/lint | Pass | All completed successfully |
| Dashboard production build | Blocked | Vite/esbuild denied parent-directory access by the desktop filesystem sandbox |
| Frontend production build | Blocked | Vite/esbuild denied parent-directory access by the desktop filesystem sandbox |
| RBAC/auth tests | Pass | 17/17 |
| Booking tests | Pass | 44/44 |
| Payment tests | Pass | 41/41 |
| Reporting tests | Pass | 2/2 |
| Dashboard pricing-health tests | Pass | 2/2 |
| Browser route smoke | Pass | Public, guest, admin, and super-admin routes rendered in the initial QA run |
| Corrected local API smoke | Blocked by data | Script exits non-zero because required guest smoke credentials are not configured |
| QA data cleanup | Pass | Removed 4 `booking-*` tenants, 8 properties, and 15 users |

## Remediations Completed

### Authentication Isolation

- Added the required `X-App-Client: frontend | dashboard` request contract.
- Frontend authentication accepts only `GUEST`.
- Dashboard authentication accepts only `SUPER_ADMIN`, `ADMIN`, or `MANAGER`.
- Invalid role/application combinations return `403 APP_ROLE_FORBIDDEN`.
- Access and refresh JWTs are audience-bound.
- Sessions persist a `FRONTEND` or `DASHBOARD` audience.
- Frontend and dashboard use separate HttpOnly refresh cookies.
- Login, refresh, logout, protected requests, and raw Axios requests send the
  application-client header.
- Session-management DTOs and the dashboard session table expose the audience.
- The frontend route guards reject staff identities from guest account routes.
- Added an RBAC integration test covering rejected cross-application logins,
  independent guest/staff sessions, and mismatched refresh rejection.

### Test Isolation

- Booking teardown removes all test-created properties and dependent records.
- Cleanup and Prisma disconnect now run through `try/finally`.
- City-scoping cases use unique test cities.
- The payment availability test now books and checks the same isolated
  November 2027 date window.

### Local Smoke Test

- Added required `SMOKE_TENANT_SLUG`.
- Every public endpoint receives explicit tenant identity.
- Removed hardcoded tenant/account assumptions.
- All auth and protected calls send `X-App-Client`.
- Failures retain a non-zero process exit code.

Required inputs:

```text
SMOKE_TENANT_SLUG
SMOKE_GUEST_EMAIL
SMOKE_GUEST_PASSWORD
SMOKE_DASHBOARD_EMAIL
SMOKE_DASHBOARD_PASSWORD
```

Optional inputs:

```text
SMOKE_BASE_URL
API_BASE_URL
API_PREFIX
```

The smoke run reads health, tenant configuration, spaces, guest auth, staff
auth, and dashboard identity. It also creates one future guest booking and one
manual payment. Run it only against a disposable or explicitly approved local
dataset; remove the generated booking/payment after evidence is captured.

### Dashboard Pricing Health

- Active property-wide pricing now covers every active room.
- Unit-wide pricing covers rooms in that unit.
- Room-specific pricing covers only its target room.
- Warnings remain only when no active property, unit, or room rate applies.
- Added focused unit tests for property fallback and room-specific isolation.

## Database Changes

- Added `SessionAudience` with `FRONTEND` and `DASHBOARD`.
- Added `Session.audience`, defaulting existing sessions to `DASHBOARD`.
- Expanded refresh-token storage to support audience-bound JWT length.

Existing guest sessions migrated as `DASHBOARD` will fail the new role/audience
checks and must sign in again. This is the intended secure behavior.

## Remaining Release Gates

1. Run dashboard and frontend production builds in an environment where
   Vite/esbuild can read the project path. The current failures are sandbox
   access errors, not compiler diagnostics.
2. Provision a dedicated active guest and staff smoke account for the configured
   tenant, run `npm run smoke:local`, capture the successful output, and remove
   the generated booking/payment.

The application should remain **Conditionally Healthy** until both gates pass.
