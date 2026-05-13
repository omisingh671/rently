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

const boardStatuses: Array<{ value: RoomBoardStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

const statusTone: Record<RoomBoardStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  RESERVED: "border-amber-200 bg-amber-50 text-amber-800",
  OCCUPIED: "border-indigo-200 bg-indigo-50 text-indigo-800",
  MAINTENANCE: "border-rose-200 bg-rose-50 text-rose-800",
  INACTIVE: "border-slate-200 bg-slate-100 text-slate-600",
};

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

const formatStatus = (status: string) => status.replaceAll("_", " ");

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
    enabled: Boolean(selectedPropertyId && from && to && new Date(to) > new Date(from)),
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Room Board</h2>
          <p className="text-sm text-slate-500">
            Live room availability for operations, check-in, and maintenance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<FiTool />}
            to={adminPath(
              ADMIN_ROUTES.INVENTORY,
              ADMIN_ROUTES.INVENTORY_CHILDREN.MAINTENANCE,
            )}
          >
            Maintenance
          </Button>
          <Button
            size="sm"
            variant="dark"
            icon={<FiPlus />}
            to={adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}
          >
            Walk-in booking
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Property</span>
            <select
              value={selectedPropertyId}
              disabled={isLoadingProperties}
              onChange={(event) => setPropertyId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RoomBoardStatus | "")
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {boardStatuses.map((item) => (
                <option key={item.value || "ALL"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Search</span>
            <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <FiSearch className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Room, guest, ref"
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </div>
          </label>
        </div>
        <div className="mt-3">
          <input
            value={propertySearch}
            onChange={(event) => setPropertySearch(event.target.value)}
            placeholder="Search properties"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:max-w-sm"
          />
        </div>
      </div>

      {boardQuery.data && (
        <div className="grid gap-3 md:grid-cols-5">
          {boardStatuses.slice(1).map((item) => {
            const count = item.value ? boardQuery.data.summary[item.value] : 0;
            return (
              <div
                key={item.value}
                className={`rounded-md border px-4 py-3 ${item.value ? statusTone[item.value] : ""}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {item.label}
                </div>
                <div className="mt-1 text-2xl font-semibold">{count}</div>
              </div>
            );
          })}
        </div>
      )}

      {!selectedPropertyId ? (
        <EmptyState message="Select a property to view the room board." />
      ) : boardQuery.isPending ? (
        <EmptyState message="Loading room board..." />
      ) : boardQuery.isError ? (
        <EmptyState message="Could not load room board. Check dates and try again." />
      ) : filteredUnits.length === 0 ? (
        <EmptyState message="No rooms match the selected filters." />
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-500">
            {selectedProperty?.name ?? boardQuery.data?.propertyName} /{" "}
            {formatDate(from)} - {formatDate(to)}
          </div>
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
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Unit {unit.unitNumber}
          </h3>
          <p className="text-xs text-slate-500">
            Floor {unit.floor} / {formatStatus(unit.status)}
            {!unit.isActive ? " / Inactive" : ""}
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {unit.rooms.length} room{unit.rooms.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        {unit.rooms.map((room) => (
          <RoomTile key={room.roomId} room={room} />
        ))}
      </div>
    </section>
  );
}

function RoomTile({ room }: { room: RoomBoardRoom }) {
  return (
    <article className={`rounded-md border p-3 ${statusTone[room.boardStatus]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            {room.roomNumber}
          </div>
          <div className="mt-0.5 text-xs">
            {room.roomName} / {room.hasAC ? "AC" : "Non-AC"} / Capacity{" "}
            {room.maxOccupancy}
          </div>
        </div>
        <StatusBadge status={formatStatus(room.boardStatus)} />
      </div>

      <div className="mt-3 space-y-2 text-xs">
        {room.booking && (
          <div className="rounded border border-white/70 bg-white/70 p-2 text-slate-700">
            <div className="flex items-center gap-1 font-medium text-slate-900">
              <FiUsers /> {room.booking.guestName}
            </div>
            <div className="mt-1">
              {room.booking.bookingRef} / {formatStatus(room.booking.status)}
            </div>
            <div className="mt-1 flex items-center gap-1">
              <FiClock />
              {formatDate(room.booking.checkIn)} -{" "}
              {formatDate(room.booking.checkOut)}
            </div>
          </div>
        )}
        {room.maintenance && (
          <div className="rounded border border-white/70 bg-white/70 p-2 text-slate-700">
            <div className="flex items-center gap-1 font-medium text-slate-900">
              <FiTool /> {room.maintenance.reason}
            </div>
            <div className="mt-1 flex items-center gap-1">
              <FiCalendar />
              {formatDate(room.maintenance.startDate)} -{" "}
              {formatDate(room.maintenance.endDate)}
            </div>
          </div>
        )}
        {!room.booking && !room.maintenance && (
          <div className="flex items-center gap-1 text-slate-700">
            <FiCheckCircle />
            {room.reason ?? "Ready for booking"}
          </div>
        )}
        <div className="flex items-center gap-1 text-slate-600">
          <FiWind />
          Inventory: {formatStatus(room.inventoryStatus)}
          {!room.isActive ? " / Inactive" : ""}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
