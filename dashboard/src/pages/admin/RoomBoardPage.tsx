import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ICON_REGISTRY } from "@/configs/iconRegistry";

const {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiPlus,
  FiSearch,
  FiSlash,
  FiTool,
  FiUsers,
  FiWind,
} = ICON_REGISTRY;
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/common/StatusBadge";
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
  RoomBoardUnit,
  RoomHousekeepingStatus,
} from "@/features/operations/types";
import { useAuthStore } from "@/stores/authStore";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import {
  STATUS_BG_COLORS,
  STATUS_BORDER_DARK_COLORS,
  STATUS_INNER_BORDER_COLORS,
  STATUS_TEXT_COLORS,
} from "@/configs/theme";

const boardStatuses: Array<{ value: RoomBoardStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

const summaryStatuses = boardStatuses.filter(
  (item): item is { value: RoomBoardStatus; label: string } =>
    item.value !== "",
);

const statusActiveRingColors: Record<RoomBoardStatus, string> = {
  AVAILABLE: "ring-emerald-200/70",
  RESERVED: "ring-amber-200/70",
  OCCUPIED: "ring-indigo-200/70",
  MAINTENANCE: "ring-rose-200/70",
  INACTIVE: "ring-slate-200/80",
};

const statusIconMutedColors: Record<RoomBoardStatus, string> = {
  AVAILABLE: "text-emerald-700/20",
  RESERVED: "text-amber-700/20",
  OCCUPIED: "text-indigo-700/20",
  MAINTENANCE: "text-rose-700/20",
  INACTIVE: "text-slate-700/20",
};

const unitHeaderColors: Record<RoomBoardStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50/70",
  RESERVED: "border-amber-200 bg-amber-50/70",
  OCCUPIED: "border-indigo-200 bg-indigo-50/70",
  MAINTENANCE: "border-rose-200 bg-rose-50/70",
  INACTIVE: "border-slate-200 bg-slate-50/80",
};

const isRoomBoardStatus = (value: string): value is RoomBoardStatus =>
  summaryStatuses.some((item) => item.value === value);

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

const formatInclusiveEndDate = (value: string) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return formatDate(date.toISOString());
};

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
    ? summaryStatuses.reduce(
        (sum, item) => sum + boardQuery.data.summary[item.value],
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <button
              type="button"
              onClick={() => {
                setStatus("");
                setSearch("");
              }}
              className={`flex items-center justify-between rounded-lg border px-5 py-4 text-left transition-all duration-200 active:translate-y-0 ${
                status === ""
                  ? "border-slate-800 bg-slate-800 text-white shadow-md ring-2 ring-slate-200"
                  : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span
                  className={`block text-[10px] font-bold uppercase tracking-wider ${status === "" ? "text-slate-300" : "text-slate-500"}`}
                >
                  Total
                </span>
                <span className="mt-0.5 block text-2xl font-bold leading-tight">
                  {totalRooms}
                </span>
              </div>
              <FiGrid
                className={status === "" ? "text-white/40" : "text-slate-200"}
                size={32}
              />
            </button>
            {summaryStatuses.map((item) => {
              const count = boardQuery.data?.summary[item.value] ?? 0;
              const bgClass = STATUS_BG_COLORS[item.value] || "bg-white";
              const borderClass =
                STATUS_BORDER_DARK_COLORS[item.value] || "border-slate-200";
              const textClass =
                STATUS_TEXT_COLORS[item.value] || "text-slate-700";
              const ringClass = statusActiveRingColors[item.value];
              const isActive = status === item.value;

              const activeStyles: Record<RoomBoardStatus, string> = {
                AVAILABLE:
                  "bg-emerald-600 border-emerald-600 text-white shadow-emerald-200/50",
                RESERVED:
                  "bg-amber-600 border-amber-600 text-white shadow-amber-200/50",
                OCCUPIED:
                  "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200/50",
                MAINTENANCE:
                  "bg-rose-600 border-rose-600 text-white shadow-rose-200/50",
                INACTIVE:
                  "bg-slate-700 border-slate-700 text-white shadow-slate-200/50",
              };

              const statusIconMap: Record<RoomBoardStatus, React.ReactNode> = {
                AVAILABLE: <FiCheckCircle size={32} />,
                RESERVED: <FiClock size={32} />,
                OCCUPIED: <FiUsers size={32} />,
                MAINTENANCE: <FiTool size={32} />,
                INACTIVE: <FiSlash size={32} />,
              };

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatus(isActive ? "" : item.value)}
                  className={`flex items-center justify-between rounded-lg border px-5 py-4 text-left transition-all duration-200 active:translate-y-0 ${
                    isActive
                      ? `${activeStyles[item.value]} shadow-lg ring-2 ${ringClass}`
                      : `${bgClass} ${borderClass} ${textClass} hover:-translate-y-0.5 hover:shadow-md`
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-white/80" : ""}`}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-2xl font-bold leading-tight">
                      {count}
                    </span>
                  </div>
                  <span className={isActive ? "text-white/40" : statusIconMutedColors[item.value]}>
                    {statusIconMap[item.value]}
                  </span>
                </button>
              );
            })}
          </div>
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
            <UnitSection
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

function UnitSection({
  unit,
  isUpdating,
  onHousekeepingChange,
}: {
  unit: RoomBoardUnit;
  isUpdating: boolean;
  onHousekeepingChange: (
    room: RoomBoardRoom,
    status: RoomHousekeepingStatus,
  ) => void;
}) {
  const unitStatus = isRoomBoardStatus(unit.status) ? unit.status : "INACTIVE";
  const borderClass =
    STATUS_BORDER_DARK_COLORS[unitStatus] || "border-slate-300";
  const headerClass =
    unitHeaderColors[unitStatus] || "border-slate-200 bg-slate-50";
  const textClass = STATUS_TEXT_COLORS[unitStatus] || "text-slate-700";

  return (
    <section className={`rounded-lg border bg-white ${borderClass}`}>
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-t-lg border-b px-5 py-4 ${headerClass}`}>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Unit {unit.unitNumber}
          </h3>
          <div className={`mt-1 flex items-center gap-2 text-xs ${textClass}`}>
            <span className="font-semibold">Floor {unit.floor}</span>
            <span>•</span>
            {!unit.isActive ? (
              <StatusBadge
                status="DISABLED"
                variantMap={{ DISABLED: "bg-rose-100 text-rose-700" }}
              />
            ) : (
              <StatusBadge status={unit.status} />
            )}
          </div>
        </div>
        <div className={`text-sm font-bold ${textClass}`}>
          {unit.rooms.length} Room{unit.rooms.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-5">
        {unit.rooms.map((room) => (
          <RoomTile
            key={room.roomId}
            room={room}
            isUpdating={isUpdating}
            onHousekeepingChange={onHousekeepingChange}
          />
        ))}
      </div>
    </section>
  );
}

const nextHousekeepingStatus: Partial<
  Record<RoomHousekeepingStatus, RoomHousekeepingStatus>
> = {
  DIRTY: "CLEANING",
  CLEANING: "CLEAN",
  CLEAN: "INSPECTED",
};

function RoomTile({
  room,
  isUpdating,
  onHousekeepingChange,
}: {
  room: RoomBoardRoom;
  isUpdating: boolean;
  onHousekeepingChange: (
    room: RoomBoardRoom,
    status: RoomHousekeepingStatus,
  ) => void;
}) {
  const tone =
    STATUS_BG_COLORS[room.boardStatus] || "bg-white border-slate-200";
  const innerBorder =
    STATUS_INNER_BORDER_COLORS[room.boardStatus] || "border-slate-200";
  const textTheme = STATUS_TEXT_COLORS[room.boardStatus] || "text-slate-700";

  return (
    <article
      className={`flex flex-1 min-w-62.5 min-h-40 flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${tone}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-slate-900">
            {room.roomNumber}
          </div>
          <div
            className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${textTheme}`}
          >
            <span>{room.roomName}</span>
            <span>•</span>
            <span>{room.hasAC ? "AC" : "Non-AC"}</span>
            <span>•</span>
            <span>Cap: {room.maxOccupancy}</span>
          </div>
        </div>
        <StatusBadge status={room.boardStatus} />
      </div>

      <div className="mt-auto space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
          <span className="font-semibold text-slate-700">
            Housekeeping: {room.housekeepingStatus}
          </span>
          {nextHousekeepingStatus[room.housekeepingStatus] && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() =>
                onHousekeepingChange(
                  room,
                  nextHousekeepingStatus[room.housekeepingStatus]!,
                )
              }
              className="font-bold text-indigo-700 hover:underline disabled:opacity-50"
            >
              Mark {formatEnumLabel(nextHousekeepingStatus[room.housekeepingStatus]!)}
            </button>
          )}
        </div>
        {room.booking && (
          <div
            className={`rounded-lg border bg-transparent p-3 ${innerBorder} ${textTheme}`}
          >
            <div className="flex items-center gap-2 font-bold">
              <FiUsers className="shrink-0" /> {room.booking.guestName}
            </div>
            <div className="mt-2 font-bold">Ref: {room.booking.bookingRef}</div>
            <div className="mt-2 flex items-center gap-1.5 font-bold">
              <FiClock className="shrink-0" />
              {formatDate(room.booking.checkIn)} to{" "}
              {formatDate(room.booking.checkOut)}
            </div>
          </div>
        )}
        {room.maintenance && (
          <div
            className={`rounded-lg border bg-transparent p-3 ${innerBorder} ${textTheme}`}
          >
            <div className="flex items-center gap-2 font-bold">
              <FiTool className="shrink-0" /> {room.maintenance.reason}
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-bold">
              <FiCalendar className="shrink-0" />
              {formatDate(room.maintenance.startDate)} to{" "}
              {formatInclusiveEndDate(room.maintenance.endDate)}
            </div>
          </div>
        )}
        {!room.booking && !room.maintenance && (
          <div
            className={`flex items-center gap-2 rounded-lg border bg-transparent p-3 font-bold ${innerBorder} ${textTheme}`}
          >
            <FiCheckCircle className="shrink-0" />
            {room.reason ?? "Ready"}
          </div>
        )}
      </div>
    </article>
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
