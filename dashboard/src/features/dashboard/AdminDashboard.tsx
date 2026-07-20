import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useDashboardContext } from "@/features/dashboard/hooks";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import {
  getRoomBoardApi,
  listBookingsApi,
  listEnquiriesApi,
  listQuotesApi,
} from "@/features/operations/api";
import { listRatesApi } from "@/features/pricing/api";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import Button from "@/components/ui/Button";
import { DashboardEmptyState } from "./components/DashboardEmptyState";
import { DashboardStats } from "./components/DashboardStats";
import { NeedsAttention } from "./components/NeedsAttention";
import { RecentBookingsTable } from "./components/RecentBookingsTable";
import { RoomStatusSummary } from "./components/RoomStatusSummary";
import { TodayOperations } from "./components/TodayOperations";
import {
  DASHBOARD_BOOKINGS_LIMIT,
  RECENT_BOOKINGS_LIMIT,
  getDashboardStats,
  getNeedsAttention,
  getTodayOperations,
  todayStr,
  tomorrowStr,
} from "./dashboard.helpers";

const DASHBOARD_SIGNAL_LIMIT = 100;

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: context } = useDashboardContext();
  const { selectedPropertyId } = useCurrentProperty();

  const propertyId = selectedPropertyId;
  const from = todayStr();
  const to = tomorrowStr();
  const role = context?.user.role ?? user?.role;
  const canViewLeads =
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
  const canViewPricing = canViewLeads;
  const canManageInventory = role === "SUPER_ADMIN" || role === "ADMIN";

  const boardQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.operations.roomBoard({ propertyId, from, to })
      : ADMIN_KEYS.operations.all(),
    queryFn: () => getRoomBoardApi(propertyId, { from, to }),
    enabled: Boolean(propertyId),
  });

  const bookingsQuery = useQuery({
    queryKey: propertyId
      ? ([
          ...ADMIN_KEYS.operations.bookings(propertyId),
          "dashboard",
          { limit: DASHBOARD_BOOKINGS_LIMIT },
        ] as const)
      : ADMIN_KEYS.operations.all(),
    queryFn: () =>
      listBookingsApi(propertyId, {
        page: 1,
        limit: DASHBOARD_BOOKINGS_LIMIT,
      }),
    enabled: Boolean(propertyId),
  });

  const enquiriesQuery = useQuery({
    queryKey: propertyId
      ? ([
          ...ADMIN_KEYS.operations.enquiries(propertyId),
          "dashboard",
          { status: "NEW", limit: DASHBOARD_SIGNAL_LIMIT },
        ] as const)
      : ADMIN_KEYS.operations.all(),
    queryFn: () =>
      listEnquiriesApi(propertyId, {
        page: 1,
        limit: DASHBOARD_SIGNAL_LIMIT,
        status: "NEW",
      }),
    enabled: Boolean(propertyId) && canViewLeads,
  });

  const quotesQuery = useQuery({
    queryKey: propertyId
      ? ([
          ...ADMIN_KEYS.operations.quotes(propertyId),
          "dashboard",
          { status: "NEW", limit: DASHBOARD_SIGNAL_LIMIT },
        ] as const)
      : ADMIN_KEYS.operations.all(),
    queryFn: () =>
      listQuotesApi(propertyId, {
        page: 1,
        limit: DASHBOARD_SIGNAL_LIMIT,
        status: "NEW",
      }),
    enabled: Boolean(propertyId) && canViewLeads,
  });

  const ratesQuery = useQuery({
    queryKey: propertyId
      ? ([...ADMIN_KEYS.pricing.rates(propertyId), "dashboard-health"] as const)
      : ADMIN_KEYS.pricing.all(),
    queryFn: () =>
      listRatesApi(propertyId, {
        page: 1,
        limit: DASHBOARD_SIGNAL_LIMIT,
      }),
    enabled: Boolean(propertyId) && canViewPricing,
  });

  const dashboardBookings = bookingsQuery.data?.items ?? [];
  const recentBookings = dashboardBookings.slice(0, RECENT_BOOKINGS_LIMIT);
  const stats = getDashboardStats(boardQuery.data, dashboardBookings, from);
  const todayOperations = getTodayOperations(
    boardQuery.data,
    dashboardBookings,
    enquiriesQuery.data?.pagination.total ?? 0,
    quotesQuery.data?.pagination.total ?? 0,
    from,
    canViewLeads,
  );
  const needsAttention = getNeedsAttention({
    board: boardQuery.data,
    bookings: dashboardBookings,
    rates: ratesQuery.data?.items ?? [],
    quotes: quotesQuery.data?.items ?? [],
    today: from,
    includePricingSignals: canViewPricing,
    includeLeadSignals: canViewLeads,
  });
  const hasRoomInventory =
    boardQuery.data?.units.some((unit) => unit.rooms.length > 0) ?? false;
  const isStatsLoading = Boolean(
    propertyId && (boardQuery.isPending || bookingsQuery.isPending),
  );
  const isSignalsLoading = Boolean(
    propertyId &&
      (boardQuery.isPending ||
        bookingsQuery.isPending ||
        (canViewLeads && enquiriesQuery.isPending) ||
        (canViewLeads && quotesQuery.isPending) ||
        (canViewPricing && ratesQuery.isPending)),
  );

  const noPropertyMessage = canManageInventory
    ? "Create a property, units, and rooms to start tracking today's room status."
    : "No property is assigned yet. Ask an admin to assign a property and create inventory.";

  return (
    <div className="-m-6 min-h-full p-6">
      <div className="space-y-10">
        <DashboardStats
          occupancyRate={stats.occupancyRate}
          todayCheckIns={stats.todayCheckIns}
          todayCheckOuts={stats.todayCheckOuts}
          healthIssues={stats.healthIssues}
          isLoading={isStatsLoading}
        />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <section className="space-y-4">
            {!propertyId ? (
              <DashboardEmptyState
                title="No inventory found"
                message={noPropertyMessage}
                action={
                  canManageInventory ? (
                    <Button
                      size="sm"
                      variant="dark"
                      to={adminPath(ADMIN_ROUTES.PROPERTIES)}
                    >
                      Create inventory
                    </Button>
                  ) : undefined
                }
              />
            ) : boardQuery.isPending ? (
              <DashboardEmptyState
                title="Loading room status"
                message="Checking today's room inventory and occupancy."
              />
            ) : boardQuery.isError ? (
              <DashboardEmptyState
                title="Room status unavailable"
                message="Could not load today's room status. Please try again."
              />
            ) : !hasRoomInventory ? (
              <DashboardEmptyState
                title="No inventory found"
                message="Create units and rooms to start seeing today's room status here."
                action={
                  canManageInventory ? (
                    <Button
                      size="sm"
                      variant="dark"
                      to={adminPath(
                        ADMIN_ROUTES.INVENTORY,
                        ADMIN_ROUTES.INVENTORY_CHILDREN.UNITS,
                      ).concat("?action=create")}
                    >
                      Create inventory
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <RoomStatusSummary
                board={boardQuery.data}
                canOpenRoomBoard={role !== "ACCOUNTANT"}
              />
            )}

            <TodayOperations
              items={todayOperations}
              isLoading={isSignalsLoading}
            />
            <NeedsAttention
              items={needsAttention}
              isLoading={isSignalsLoading}
            />
          </section>

          <section className="space-y-4">
            <RecentBookingsTable
              bookings={recentBookings}
              propertyId={propertyId}
              isLoading={bookingsQuery.isPending}
              isError={bookingsQuery.isError}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
