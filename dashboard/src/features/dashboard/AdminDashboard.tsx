import type { ReactNode } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiInbox,
  FiTool,
  FiUsers,
  FiWind,
} from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useDashboardContext } from "@/features/dashboard/hooks";
import { getRoomBoardApi, listBookingsApi } from "@/features/operations/api";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/common/StatusBadge";
import {
  STATUS_BG_COLORS,
  STATUS_TEXT_COLORS,
  STATUS_BORDER_DARK_COLORS,
} from "@/configs/theme";
import type { AdminBooking } from "@/features/operations/types";

const RECENT_BOOKINGS_LIMIT = 5;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDisplayDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatAmount = (value: string) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return `INR ${value}`;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getBookingStayLabel = (booking: AdminBooking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-room stay`;
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit stay" : "Room stay";
  }

  return booking.productName;
};

const getBookingTargetSummary = (booking: AdminBooking) => {
  if (booking.items.length > 1) {
    return booking.items.map((item) => item.targetLabel).join(" + ");
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit" : "Private room";
  }

  return booking.targetLabel;
};

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: context } = useDashboardContext();

  const propertyId = context?.properties?.[0]?.id || "";
  const from = todayStr();
  const to = tomorrowStr();

  const boardQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.operations.roomBoard({ propertyId, from, to })
      : ADMIN_KEYS.operations.all(),
    queryFn: () => getRoomBoardApi(propertyId, { from, to }),
    enabled: Boolean(propertyId),
  });

  const recentBookingsQuery = useQuery({
    queryKey: propertyId
      ? ([
          ...ADMIN_KEYS.operations.bookings(propertyId),
          "recent",
          { limit: RECENT_BOOKINGS_LIMIT },
        ] as const)
      : ADMIN_KEYS.operations.all(),
    queryFn: () =>
      listBookingsApi(propertyId, {
        page: 1,
        limit: RECENT_BOOKINGS_LIMIT,
      }),
    enabled: Boolean(propertyId),
  });

  const role = context?.user.role ?? user?.role;
  const isManager = role === "MANAGER";
  const recentBookings = recentBookingsQuery.data?.items ?? [];
  const hasRoomInventory =
    boardQuery.data?.units.some((unit) => unit.rooms.length > 0) ?? false;

  const noPropertyMessage = isManager
    ? "No property is assigned yet. Ask an admin to assign a property and create inventory."
    : "Create a property, units, and rooms to start tracking today's room status.";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Today's Room Status
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDisplayDate(new Date().toISOString())}
                </p>
              </div>
            </div>

            {!propertyId ? (
              <EmptyState
                title="No inventory found"
                message={noPropertyMessage}
                action={
                  !isManager ? (
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
              <EmptyState
                title="Loading room status"
                message="Checking today's room inventory and occupancy."
              />
            ) : boardQuery.isError ? (
              <EmptyState
                title="Room status unavailable"
                message="Could not load today's room status. Please try again."
              />
            ) : !hasRoomInventory ? (
              <EmptyState
                title="No inventory found"
                message="Create units and rooms to start seeing today's room status here."
                action={
                  !isManager ? (
                    <Button
                      size="sm"
                      variant="dark"
                      to={adminPath(
                        ADMIN_ROUTES.INVENTORY,
                        ADMIN_ROUTES.INVENTORY_CHILDREN.ROOMS,
                      )}
                    >
                      Create inventory
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {boardQuery.data.units.map((unit) => (
                  <div
                    key={unit.unitId}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4">
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        Unit {unit.unitNumber}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {unit.rooms.map((room) => {
                        const bgClass =
                          STATUS_BG_COLORS[room.boardStatus] ||
                          "bg-slate-50 border-slate-100";
                        const textClass =
                          STATUS_TEXT_COLORS[room.boardStatus] ||
                          "text-slate-700";
                        const borderClass =
                          STATUS_BORDER_DARK_COLORS[room.boardStatus] ||
                          "border-slate-200";

                        let Icon = FiCheckCircle;
                        if (room.boardStatus === "OCCUPIED") Icon = FiUsers;
                        if (room.boardStatus === "RESERVED") Icon = FiCalendar;
                        if (room.boardStatus === "MAINTENANCE") Icon = FiTool;
                        if (room.boardStatus === "INACTIVE") Icon = FiWind;

                        return (
                          <div
                            key={room.roomId}
                            className={`flex-1 min-w-[100px] flex flex-col items-center justify-center rounded-xl border px-4 py-6 shadow-sm transition-all hover:shadow-md ${bgClass} ${borderClass} ${textClass}`}
                            title={`${room.roomNumber} - ${room.boardStatus}`}
                          >
                            <Icon className="mb-3 text-3xl opacity-90" />
                            <div className="flex flex-col items-center text-center">
                              <span className="text-base font-bold tracking-tight">
                                {room.roomNumber}
                              </span>
                              <span className="mt-1 text-[11px] font-medium uppercase tracking-wider opacity-70">
                                {room.roomName} - {room.hasAC ? "AC" : "Non-AC"}
                              </span>
                              <div className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                                {room.boardStatus}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>

        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent Bookings
                </h3>
                <p className="text-xs text-slate-500">
                  Latest {RECENT_BOOKINGS_LIMIT} booking records
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                to={adminPath(ADMIN_ROUTES.BOOKINGS)}
                iconRight={<FiArrowRight />}
              >
                View more
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    <tr>
                      <th className="whitespace-nowrap px-5 py-3">Guest</th>
                      <th className="whitespace-nowrap px-5 py-3">Stay</th>
                      <th className="whitespace-nowrap px-5 py-3">Amount</th>
                      <th className="whitespace-nowrap px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {!propertyId ? (
                      <RecentBookingsEmptyRow message="Create or assign a property to see recent bookings." />
                    ) : recentBookingsQuery.isPending ? (
                      <RecentBookingsEmptyRow message="Loading recent bookings..." />
                    ) : recentBookingsQuery.isError ? (
                      <RecentBookingsEmptyRow message="Could not load recent bookings." />
                    ) : recentBookings.length === 0 ? (
                      <RecentBookingsEmptyRow message="No bookings found yet." />
                    ) : (
                      recentBookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-[18px]">
                            <div className="min-w-40">
                              <p className="font-semibold text-slate-900">
                                {booking.guestName}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {booking.bookingRef}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-[18px]">
                            <div className="min-w-44">
                              <p className="font-medium text-slate-700">
                                {getBookingStayLabel(booking)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {getBookingTargetSummary(booking)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDisplayDate(booking.checkIn)} -{" "}
                                {formatDisplayDate(booking.checkOut)}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-[18px] font-semibold text-slate-900">
                            {formatAmount(booking.totalAmount)}
                          </td>
                          <td className="px-5 py-[18px]">
                            <StatusBadge status={booking.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </section>

        <section className="xl:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Dashboard Context
                </h3>
              </div>

              <div className="flex flex-col gap-6 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {context?.user.role ?? user?.role ?? "Unknown"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {context?.modules.length ?? 0} enabled dashboard modules
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Accessible Properties
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(context?.properties ?? []).length === 0 ? (
                      <span className="text-sm text-slate-500">
                        No properties assigned yet.
                      </span>
                    ) : (
                      (context?.properties ?? []).map((property) => (
                        <span
                          key={property.id}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {property.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
      <div className="rounded-full bg-slate-50 p-4 text-slate-400">
        <FiInbox className="h-7 w-7" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function RecentBookingsEmptyRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
        {message}
      </td>
    </tr>
  );
}
