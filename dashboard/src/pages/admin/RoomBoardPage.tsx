import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiCalendar,
  FiPlus,
  FiSearch,
  FiTool,
  FiWind,
} = ICON_REGISTRY;
import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import {
  getRoomBoardApi,
  updateRoomHousekeepingApi,
} from "@/features/operations/api";
import type {
  RoomBoardRoom,
  RoomBoardStatus,
  RoomHousekeepingStatus,
} from "@/features/operations/types";
import RoomBoardUnitSection from "@/features/operations/components/RoomBoardUnitSection";
import RoomBoardSummaryCards from "@/features/operations/components/RoomBoardSummaryCards";
import { useAuthStore } from "@/stores/authStore";

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const roomMatchesSearch = (room: RoomBoardRoom, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    room.roomNumber,
    room.roomName,
    room.unitNumber,
    room.booking?.guestName ?? "",
    room.booking?.bookingRef ?? "",
    room.maintenance?.reason ?? "",
  ].some((value) => value.toLowerCase().includes(normalized));
};

export default function RoomBoardPage() {
  const queryClient = useQueryClient();
  const { hasAnyRole } = useAuthStore();
  const canManageMaintenance = hasAnyRole(["SUPER_ADMIN", "ADMIN"]);

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toDateInput(today));
  const [to, setTo] = useState(toDateInput(addDays(today, 1)));
  const [status, setStatus] = useState<RoomBoardStatus | "">("");
  const [search, setSearch] = useState("");
  const [housekeepingError, setHousekeepingError] = useState("");

  const {
    properties,
    selectedPropertyId,
    selectedProperty,
    setSelectedPropertyId,
    isLoading: isLoadingProperties,
  } = useCurrentProperty();

  const boardQuery = useQuery({
    queryKey: selectedPropertyId
      ? ADMIN_KEYS.operations.roomBoard({
          propertyId: selectedPropertyId,
          from,
          to,
        })
      : ADMIN_KEYS.operations.all(),
    queryFn: () => getRoomBoardApi(selectedPropertyId, { from, to }),
    enabled: Boolean(
      selectedPropertyId && from && to && new Date(to) > new Date(from),
    ),
    retry: false,
  });
  const housekeepingMutation = useMutation({
    mutationFn: ({
      room,
      status: nextStatus,
    }: {
      room: RoomBoardRoom;
      status: RoomHousekeepingStatus;
    }) => {
      if (!selectedPropertyId) throw new Error("PropertyId required");
      return updateRoomHousekeepingApi(selectedPropertyId, room.roomId, {
        expectedStatus: room.housekeepingStatus,
        status: nextStatus,
      });
    },
    onSuccess: async () => {
      setHousekeepingError("");
      if (!selectedPropertyId) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ADMIN_KEYS.operations.roomBoards(selectedPropertyId),
        }),
        queryClient.invalidateQueries({
          queryKey: ADMIN_KEYS.operations.byProperty(selectedPropertyId),
        }),
      ]);
    },
    onError: (error) => {
      setHousekeepingError(
        error instanceof Error ? error.message : "Housekeeping update failed",
      );
    },
  });

  const filteredUnits = useMemo(() => {
    const units = boardQuery.data?.units ?? [];
    return units
      .map((unit) => ({
        ...unit,
        rooms: unit.rooms.filter(
          (room) =>
            (status ? room.boardStatus === status : true) &&
            roomMatchesSearch(room, search),
        ),
      }))
      .filter((unit) => unit.rooms.length > 0);
  }, [boardQuery.data?.units, search, status]);

  const totalRooms = boardQuery.data
    ? Object.values(boardQuery.data.summary).reduce(
        (sum, count) => sum + count,
        0,
      )
    : 0;

  const setDateRange = (start: string, end: string) => {
    setFrom(start);
    setTo(end);
  };
  const quickRanges = [
    {
      label: "Today",
      from: toDateInput(today),
      to: toDateInput(addDays(today, 1)),
    },
    {
      label: "Tomorrow",
      from: toDateInput(addDays(today, 1)),
      to: toDateInput(addDays(today, 2)),
    },
    {
      label: "7 days",
      from: toDateInput(today),
      to: toDateInput(addDays(today, 7)),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-200 rounded-t-lg px-5 py-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {boardQuery.isFetching && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  Syncing
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-lg text-slate-600">
              {selectedPropertyId && from && to && (
                <>
                  <FiCalendar className="text-indigo-600" size={20} />
                  <span className="font-bold text-slate-900">
                    {selectedProperty?.name ?? "Selected property"}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(from)} to {formatDate(to)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageMaintenance && (
              <Button
                variant="secondary"
                size="sm"
                icon={<FiTool />}
                className="h-10"
                to={adminPath(
                  ADMIN_ROUTES.INVENTORY,
                  ADMIN_ROUTES.INVENTORY_CHILDREN.MAINTENANCE,
                )}
              >
                Maintenance
              </Button>
            )}
            <Button
              variant="dark"
              size="sm"
              icon={<FiPlus />}
              className="h-10"
              to={adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}
            >
              Walk-in booking
            </Button>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="min-w-0">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                Property
              </span>
              <select
                value={selectedPropertyId}
                disabled={isLoadingProperties}
                onChange={(event) =>
                  setSelectedPropertyId(event.target.value || null)
                }
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="min-w-0">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                From
              </span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </label>
          </div>

          <div className="min-w-0">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                To
              </span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </label>
          </div>

          <div className="min-w-0">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                Search rooms
              </span>
              <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                <FiSearch className="shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Guest, ref, room..."
                  className="min-w-0 flex-1 text-sm outline-none"
                />
              </div>
            </label>
          </div>

          <div className="min-w-0">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Quick range
            </span>
            <div className="flex h-10 items-center gap-1.5">
              {quickRanges.map((range) => {
                const isActiveRange = from === range.from && to === range.to;

                return (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => setDateRange(range.from, range.to)}
                    className={`h-10 flex-1 rounded-md border px-1.5 text-xs font-bold transition-all duration-200 active:translate-y-0 ${
                      isActiveRange
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100"
                        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 hover:shadow-sm"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white rounded-b-xl px-5 py-4">
          <RoomBoardSummaryCards
            summary={boardQuery.data?.summary}
            totalRooms={totalRooms}
            selectedStatus={status}
            onShowAll={() => {
              setStatus("");
              setSearch("");
            }}
            onToggleStatus={(nextStatus) =>
              setStatus(status === nextStatus ? "" : nextStatus)
            }
          />
        </div>
      </section>

      {!selectedPropertyId ? (
        <EmptyState
          icon={<FiSearch className="mx-auto mb-2 h-6 w-6 text-slate-400" />}
          message="Select a property to view its room board."
        />
      ) : boardQuery.isPending ? (
        <div className="flex h-40 flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-500">
            Loading live availability...
          </p>
        </div>
      ) : boardQuery.isError ? (
        <EmptyState
          icon={<FiTool className="mx-auto mb-2 h-6 w-6 text-rose-400" />}
          message="Could not load room board. Check dates and try again."
        />
      ) : filteredUnits.length === 0 ? (
        <EmptyState
          icon={<FiWind className="mx-auto mb-2 h-6 w-6 text-slate-400" />}
          message="No rooms match the selected filters."
        />
      ) : (
        <>
          {housekeepingError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {housekeepingError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredUnits.map((unit) => (
            <RoomBoardUnitSection
              key={unit.unitId}
              unit={unit}
              isUpdating={housekeepingMutation.isPending}
              onHousekeepingChange={(room, nextStatus) =>
                housekeepingMutation.mutate({ room, status: nextStatus })
              }
            />
          ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon}
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
