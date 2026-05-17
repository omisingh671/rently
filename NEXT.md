Implement a dashboard-wide Current Working Property feature.

Goal:
Admins/managers should select a current property once, and dashboard pages should automatically use it as the default property filter/context.

Requirements:

1. Create a dashboard property context/store using existing Zustand patterns.
2. Store selectedPropertyId in localStorage for MVP.
3. On dashboard load, fetch assigned/accessible properties and validate saved selectedPropertyId.
4. If saved property is no longer accessible, fallback to the first accessible property and clear invalid selection.
5. Add a visible property switcher in the dashboard top navbar/header, shown like: "Current Property: Sucasa Kanpur ▼". It must be visible across dashboard pages so the admin always knows which property context is active.
6. Admin/manager dropdown must show only properties they are allowed to access. Super admin can see all properties.
7. Update rooms, room board, maintenance, pricing, bookings, enquiries, quotes, and reports pages to default to selectedPropertyId where applicable.
8. Keep backend security unchanged: every API must still validate RBAC and property access. Do not trust localStorage for permissions.
9. Include selectedPropertyId in React Query keys to avoid stale cache when switching property.
10. For pages that support “All Properties” like reports/bookings, allow it only where backend supports it; inventory/pricing/maintenance should require a specific property.
11. Show a clear empty state if the user has no accessible properties.
12. Use budget-friendly mode: inspect only relevant dashboard layout/store/API files and affected pages, run targeted dashboard checks only.

Do not create a backend user preference table yet. Keep this MVP frontend-first unless existing backend preference patterns already exist. Avoid unrelated refactors.
