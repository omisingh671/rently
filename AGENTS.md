# Sucasa Engineering Rules

## Project Context

Sucasa is a modular monolith fullstack application.

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

## What Codex Must Do First

Before implementing anything:

1. Explore repository structure
2. Understand existing architecture patterns
3. Identify completed modules
4. Identify reusable utilities/components/hooks/services
5. Detect inconsistencies and possible bugs
6. Detect duplicated logic
7. Detect dead code and stale patterns
8. Detect type safety violations
9. Detect React Query anti-patterns
10. Detect API contract mismatches

## Mandatory Workflow

For EVERY task:

1. First provide:
   - Current understanding
   - Existing related modules
   - Reusable code found
   - Risks
   - Missing information
   - Likely bugs discovered

2. Then provide:
   - Step-by-step implementation plan
   - Files to modify
   - Why those files
   - Architectural impact

3. Then implement incrementally:
   - Small safe commits
   - Preserve existing architecture
   - Avoid broad refactors unless requested

4. After implementation:
   - Run typecheck
   - Run lint
   - Check build
   - Validate imports
   - Validate query invalidation logic
   - Validate loading/error states
   - Validate mobile responsiveness

## Bug Hunting Requirements

Always check for:

- Missing loading states
- Missing error boundaries
- React Query stale cache issues
- Unhandled async errors
- Prisma error leaks
- Incorrect DTO mapping
- Invalid pagination handling
- Auth edge cases
- Refresh token race conditions
- Memory leaks
- useEffect dependency bugs
- Duplicate API calls
- Inconsistent query keys
- Broken optimistic updates
- Type drift between frontend/backend

## Planning Style

Never immediately code.

Always:

- Explore first
- Explain findings
- Produce a development plan
- Mention reusable existing modules
- Mention possible regressions
- Mention better architectural alternatives if relevant

## Output Format

For every task respond with:

### Repository Findings

### Existing Patterns Reused

### Bugs/Risks Found

### Implementation Plan

### Files To Change

### Validation Checklist
