# Rently Engineering Rules

## Project Context

Rently is a modular monolith fullstack application.

Frontend:

- React
- TypeScript strict mode
- React Query
- Zustand
- Tailwind CSS
- Feature-based architecture

Backend:

- Node.js
- Express
- Prisma
- Layered architecture:
  Route → Controller → Service → Repository

Core Rules:

- No `any`
- No breaking architecture boundaries
- DTO-based responses only
- Runtime validation with Zod
- Reuse existing patterns before introducing new abstractions
- Maintain deterministic query keys
- Maintain existing admin-table architecture
- Preserve centralized API layer patterns

---

## Budget-Friendly Codex Workflow

Codex must save usage and avoid unnecessary full-repo work.

For every task:

1. Inspect only files directly related to the task.
2. Reuse existing patterns before creating new abstractions.
3. Avoid broad architecture audits unless the user explicitly asks.
4. Avoid unrelated refactors.
5. Avoid running all checks for all apps by default.
6. Prefer targeted verification based on changed files.
7. Clearly mention what was checked and what was skipped.

---

## Exploration Rules

Before implementing, Codex should do focused exploration only:

- Find the relevant route/controller/service/repository/component/hook/API file.
- Check nearby existing patterns.
- Check only directly related types, DTOs, validation schemas, and query keys.
- Check for obvious bugs in the touched flow.

Do not perform full-project scans for every task.

Only do deep repo-wide review when the user asks for:

- full code review
- architecture review
- security audit
- roadmap audit
- dead code cleanup
- large refactor
- cross-app contract review

---

## Implementation Rules

Codex should:

1. Explain current understanding briefly.
2. Mention the files it plans to change.
3. Implement the smallest safe change.
4. Preserve existing architecture.
5. Avoid changing public APIs unless required.
6. Avoid changing database schema unless required.
7. Avoid package/dependency changes unless required.
8. Avoid formatting unrelated files.

---

## Verification / Command Budget

Do not automatically run all commands after every task.

Use this order:

### 1. Docs-only / prompt-only changes

Do not run code checks.

Examples:

- README update
- ROADMAP update
- AGENTS.md update
- prompt writing
- comments only

### 2. Backend-only changes

Prefer targeted checks first.

Run only the smallest relevant command, for example:

- targeted backend test for changed module
- backend typecheck
- backend lint only if many TypeScript files changed
- backend build only if exports/config/package/schema changed

Do not run dashboard/frontend checks unless backend contract changes affect them.

### 3. Dashboard-only changes

Run only dashboard-related checks.

Prefer:

- dashboard lint for touched UI files
- dashboard build only for route/config/shared API changes

Do not run backend/frontend checks unless contracts changed.

### 4. Frontend-only changes

Run only frontend-related checks.

Prefer:

- frontend lint for touched UI files
- frontend build only for route/config/shared API changes

Do not run backend/dashboard checks unless contracts changed.

### 5. Prisma/schema/migration changes

Run backend Prisma-related checks.

Recommended:

- prisma generate
- migration validation if applicable
- backend typecheck
- targeted backend tests for affected flow

Run frontend/dashboard checks only if API contracts changed.

### 6. Shared contract/auth/booking/pricing/security changes

These are higher risk.

Run focused backend tests first, then one final broader backend verification if needed.

Full repo checks are allowed only when:

- user explicitly says “run full checks”
- package/dependency/config files changed
- CI files changed
- Prisma schema/migrations changed significantly
- public API contracts changed across apps
- auth, booking, pricing, payment, tenant scoping, or security changes affect multiple apps

---

## Failed Command Rules

If a command fails:

1. Read the error.
2. Fix only the relevant issue.
3. Rerun only the failed command.
4. Do not start running unrelated commands.

---

## Bug Hunting Scope

Always check for bugs only inside the touched flow.

For touched frontend/dashboard flows, check:

- loading states
- error states
- query keys
- duplicate API calls
- invalid query invalidation
- form validation
- mobile layout only if UI changed

For touched backend flows, check:

- DTO mapping
- Zod validation
- auth/RBAC
- property/tenant scoping
- Prisma error leaks
- transaction safety
- pagination if the endpoint uses pagination

Do not perform full bug hunting across the repo unless requested.

---

## Output Format

For small tasks, keep output concise:

### Findings

### Changes Made

### Validation

### Skipped Checks

For large tasks or audits, use:

### Repository Findings

### Existing Patterns Reused

### Bugs/Risks Found

### Implementation Plan

### Files Changed

### Validation Checklist
