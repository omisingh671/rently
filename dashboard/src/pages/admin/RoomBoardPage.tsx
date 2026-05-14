import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiSearch,
  FiTool,
  FiUsers,
  FiWind,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import { useAdminProperties } from "@/features/admin/properties/hooks/useAdminProperties";
import { getRoomBoardApi } from "@/features/admin/operations/api";
import type {
  RoomBoardRoom,
  RoomBoardStatus,
  RoomBoardUnit,
} from "@/features/admin/operations/types";
import { useAuthStore } from "@/stores/authStore";
import { STATUS_BG_COLORS, STATUS_BORDER_DARK_COLORS, STATUS_INNER_BORDER_COLORS, STATUS_TEXT_COLORS } from "@/configs/theme";

const boardStatuses: Array<{ value: RoomBoardStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];


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
  const { hasAnyRole } = useAuthStore();
  const canManageMaintenance = hasAnyRole(["SUPER_ADMIN", "ADMIN"]);

  const today = useMemo(() => new Date(), []);
  const [propertyId, setPropertyId] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [from, setFrom] = useState(toDateInput(today));
  const [to, setTo] = useState(toDateInput(addDays(today, 1)));
  const [status, setStatus] = useState<RoomBoardStatus | "">("");
  const [search, setSearch] = useState("");

  const { data: propertiesData, isPending: isLoadingProperties } =
    useAdminProperties(1, ADMIN_OPTION_LIST_LIMIT, {
      search: propertySearch,
      status: "",
      isActive: "true",
    });

  const properties = useMemo(
    () => propertiesData?.items ?? [],
    [propertiesData?.items],
  );
  const selectedPropertyId = propertyId || properties[0]?.id || "";
  const selectedProperty = properties.find(
    (property) => property.id === selectedPropertyId,
  );

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

  return (
    <div className="space-y-6 pb-12">
      {/* Header Area */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-xl bg-white p-5 shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Room Board</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live availability mapping for operations.
          </p>
        </div>

        {/* Top Controls: Property Dropdown + Property Search + Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={propertySearch}
            onChange={(event) => setPropertySearch(event.target.value)}
            placeholder="Search properties..."
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={selectedPropertyId}
            disabled={isLoadingProperties}
            onChange={(event) => setPropertyId(event.target.value)}
            className="h-10 min-w-[200px] rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          {canManageMaintenance && (
            <Button
              variant="secondary"
              icon={<FiTool />}
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
            icon={<FiPlus />}
            to={adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}
          >
            Walk-in booking
          </Button>
        </div>
      </div>

      {/* Summary Stats Panel */}
      {boardQuery.data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {boardStatuses.slice(1).map((item) => {
            const count = item.value ? boardQuery.data.summary[item.value] : 0;
            const bgClass =
              STATUS_BG_COLORS[item.value as string] || "bg-white";
            const borderClass =
              STATUS_BORDER_DARK_COLORS[item.value as string] ||
              "border-slate-200";
            const textClass =
              STATUS_TEXT_COLORS[item.value as string] || "text-slate-700";

            return (
              <div
                key={item.value}
                className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${bgClass} ${borderClass}`}
              >
                <div className={`text-xs font-bold uppercase tracking-wider ${textClass} opacity-80`}>
                  {item.label}
                </div>
                <div className={`mt-1 text-2xl font-bold ${textClass}`}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Date & Filters Area */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm">
        {selectedPropertyId && from && to && (
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-indigo-700">
            <FiCalendar className="shrink-0 text-indigo-400" />
            <span className="font-semibold">
              {selectedProperty?.name ?? ""}
            </span>
            <span className="text-indigo-300">•</span>
            <span>{formatDate(from)} to {formatDate(to)}</span>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">From Date</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">To Date</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Room Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RoomBoardStatus | "")
              }
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {boardStatuses.map((item) => (
                <option key={item.value || "ALL"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Search Guests / Rooms</span>
            <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <FiSearch className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, ref, room..."
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </div>
          </label>
        </div>
      </div>

      {/* Main Board Area */}
      {!selectedPropertyId ? (
        <EmptyState
          icon={<FiSearch className="mx-auto mb-2 h-6 w-6 text-slate-400" />}
          message="Select a property to view its room board."
        />
      ) : boardQuery.isPending ? (
        <div className="flex h-40 flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-500">Loading live availability...</p>
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
        <div className="space-y-6">
          {filteredUnits.map((unit) => (
            <UnitSection key={unit.unitId} unit={unit} />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitSection({ unit }: { unit: RoomBoardUnit }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-xl border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Unit {unit.unitNumber}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Floor {unit.floor}</span>
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
        <div className="text-sm font-medium text-slate-500">
          {unit.rooms.length} Room{unit.rooms.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-5">
        {unit.rooms.map((room) => (
          <RoomTile key={room.roomId} room={room} />
        ))}
      </div>
    </section>
  );
}

function RoomTile({ room }: { room: RoomBoardRoom }) {
  const tone = STATUS_BG_COLORS[room.boardStatus] || "bg-white border-slate-200";
  const innerBorder = STATUS_INNER_BORDER_COLORS[room.boardStatus] || "border-slate-200";
  const textTheme = STATUS_TEXT_COLORS[room.boardStatus] || "text-slate-700";

  return (
    <article className={`flex flex-1 min-w-[300px] min-h-[160px] flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${tone}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-slate-900">
            {room.roomNumber}
          </div>
          <div className={`mt-1 flex items-center gap-1 text-xs font-semibold ${textTheme} opacity-80`}>
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
        {room.booking && (
          <div className={`rounded-lg border bg-transparent p-3 ${innerBorder} ${textTheme}`}>
            <div className="flex items-center gap-2 font-bold opacity-90">
              <FiUsers className="opacity-70" /> {room.booking.guestName}
            </div>
            <div className="mt-2 font-semibold opacity-80">
              Ref: {room.booking.bookingRef}
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-semibold opacity-80">
              <FiClock className="opacity-70" />
              {formatDate(room.booking.checkIn)} to {formatDate(room.booking.checkOut)}
            </div>
          </div>
        )}
        {room.maintenance && (
          <div className={`rounded-lg border bg-transparent p-3 ${innerBorder} ${textTheme}`}>
            <div className="flex items-center gap-2 font-bold opacity-90">
              <FiTool className="opacity-70" /> {room.maintenance.reason}
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-semibold opacity-80">
              <FiCalendar className="opacity-70" />
              {formatDate(room.maintenance.startDate)} to {formatDate(room.maintenance.endDate)}
            </div>
          </div>
        )}
        {!room.booking && !room.maintenance && (
          <div className={`flex items-center gap-2 rounded-lg border bg-transparent p-3 font-semibold ${innerBorder} ${textTheme} opacity-80`}>
            <FiCheckCircle className="opacity-70" />
            {room.reason ?? "Ready"}
          </div>
        )}

      </div>
    </article>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon}
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
