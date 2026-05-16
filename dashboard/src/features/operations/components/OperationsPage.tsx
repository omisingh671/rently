import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import { useAdminOperations } from "../hooks/useAdminOperations";
import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import type {
  AdminBooking,
  AdminEnquiry,
  AdminQuote,
  BookingStatus,
  LeadStatus,
} from "../types";
import StatusBadge from "@/components/common/StatusBadge";
import {
  FiCalendar,
  FiClipboard,
  FiFilter,
  FiHome,
  FiMail,
  FiPlus,
  FiSearch,
  FiUser,
} from "react-icons/fi";
import { normalizeApiError } from "@/utils/errors";

type Module = "bookings" | "enquiries" | "quotes";

type Props = {
  module: Module;
};

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
];

const leadStatuses: LeadStatus[] = ["NEW", "IN_PROGRESS", "CLOSED"];

const enquirySources = [
  { value: "PUBLIC_WEBSITE", label: "Website" },
  { value: "PUBLIC_QUOTE_REQUEST", label: "Quote requests" },
] as const;

const formatEnquirySource = (source: string | null) =>
  enquirySources.find((item) => item.value === source)?.label ??
  source ??
  "Website";

const titles: Record<Module, string> = {
  bookings: "Bookings",
  enquiries: "Enquiries",
  quotes: "Quotes",
};

const isStatusAllowedForModule = (module: Module, status: string) =>
  module === "bookings"
    ? bookingStatuses.includes(status as BookingStatus)
    : leadStatuses.includes(status as LeadStatus);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const getBookingStayLabel = (booking: AdminBooking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-room stay`;
  }

  if (booking.productName === "Booking option") {
    const target = booking.targetLabel.toLowerCase();
    if (target.includes("unit")) return "Private unit stay";
    if (target.includes("room")) return "Room stay";
  }

  return booking.productName;
};

const getBookingTargetSummary = (booking: AdminBooking) => {
  if (booking.items.length > 1) {
    return booking.items
      .map((item, index) =>
        item.targetType === "UNIT" ? `Unit ${index + 1}` : `Room ${index + 1}`,
      )
      .join(" + ");
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit" : "Private room";
  }

  return booking.targetLabel;
};

const getBookingAssignedSummary = (booking: AdminBooking) => {
  if (booking.items.length === 0) {
    return booking.targetLabel;
  }

  return booking.items.map((item) => item.targetLabel).join(" + ");
};

function GuestAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-sky-100 text-sky-700",
  ];

  const colorIndex = name.length % colors.length;
  const colorClass = colors[colorIndex];

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {initials}
    </div>
  );
}

export default function OperationsPage({ module }: Props) {
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    source: "",
  });
  const [actionError, setActionError] = useState("");

  const { data: propertiesData } = useAdminProperties(1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const properties = useMemo(
    () => propertiesData?.items ?? [],
    [propertiesData?.items],
  );
  const selectedPropertyId = propertyId || properties[0]?.id || "";
  const activeFilters = useMemo(
    () => ({
      ...filters,
      status: isStatusAllowedForModule(module, filters.status)
        ? filters.status
        : "",
      source: module === "enquiries" ? filters.source : "",
    }),
    [filters, module],
  );

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    updateEnquiry,
    updateQuote,
    isMutating,
  } = useAdminOperations(module, selectedPropertyId, activeFilters);

  const items = data?.items ?? [];
  const statuses = module === "bookings" ? bookingStatuses : leadStatuses;

  const setFilterValue = (key: keyof typeof filters, value: string) => {
    setActionError("");
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateLeadStatus = async (
    type: "enquiry" | "quote",
    id: string,
    currentStatus: LeadStatus,
    nextStatus: LeadStatus,
  ) => {
    if (nextStatus === currentStatus) return;

    try {
      setActionError("");
      if (type === "enquiry") {
        await updateEnquiry({ enquiryId: id, status: nextStatus });
      } else {
        await updateQuote({ quoteId: id, status: nextStatus });
      }
    } catch (err) {
      setActionError(normalizeApiError(err).message);
    }
  };

  const openBookingDetails = (bookingId: string) => {
    navigate(adminPath(ADMIN_ROUTES.BOOKING_DETAIL(bookingId)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {titles[module]}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isPending ? "Loading data..." : `${items.length} records found in the selected property`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) =>
              setFilterValue("search", event.target.value)
            }
            placeholder={`Search ${module}...`}
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
          />
        </div>

        <div className="h-6 w-px bg-slate-200 hidden lg:block" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
          <div className="relative">
            <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedPropertyId}
              onChange={(event) => {
                setActionError("");
                setPropertyId(event.target.value);
              }}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-8 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-72"
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={activeFilters.status}
              onChange={(event) =>
                setFilterValue("status", event.target.value)
              }
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-8 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-40"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {module === "enquiries" && (
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={activeFilters.source}
                onChange={(event) =>
                  setFilterValue("source", event.target.value)
                }
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-8 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-40"
              >
                <option value="">All sources</option>
                {enquirySources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {module === "bookings" && (
          <div className="flex items-center gap-3 lg:ml-auto">
            <div className="h-6 w-px bg-slate-200 hidden lg:block mr-1" />
            <Button
              size="md"
              variant="secondary"
              icon={<FiClipboard />}
              to={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
            >
              Room board
            </Button>
            <Button
              size="md"
              variant="dark"
              icon={<FiPlus />}
              to={adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}
            >
              Walk-in
            </Button>
          </div>
        )}
      </div>

      {!selectedPropertyId ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <div className="rounded-full bg-slate-50 p-4">
            <FiHome className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No Property Selected</h3>
          <p className="mt-1 max-w-[200px] text-sm text-slate-500">
            Select a property from the toolbar to view its {titles[module].toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {(actionError || isError) && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
              {actionError ||
                normalizeApiError(error).message ||
                "Could not load records."}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                {module === "bookings" ? (
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4">Guest</th>
                    <th className="whitespace-nowrap px-6 py-4">Stay & Product</th>
                    <th className="whitespace-nowrap px-6 py-4">Assigned Room/Unit</th>
                    <th className="whitespace-nowrap px-6 py-4">Dates</th>
                    <th className="whitespace-nowrap px-6 py-4">Financials</th>
                    <th className="whitespace-nowrap px-6 py-4">Status</th>
                    <th className="whitespace-nowrap px-6 py-4 text-right">Details</th>
                  </tr>
                ) : module === "enquiries" ? (
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4">Guest</th>
                    <th className="whitespace-nowrap px-6 py-4">Message</th>
                    <th className="whitespace-nowrap px-6 py-4">Source</th>
                    <th className="whitespace-nowrap px-6 py-4">Created</th>
                    <th className="whitespace-nowrap px-6 py-4">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4">Guest</th>
                    <th className="whitespace-nowrap px-6 py-4">Product</th>
                    <th className="whitespace-nowrap px-6 py-4">Dates</th>
                    <th className="whitespace-nowrap px-6 py-4">Notes</th>
                    <th className="whitespace-nowrap px-6 py-4">Status</th>
                  </tr>
                )}
              </thead>
            <tbody className={`divide-y divide-slate-100 ${isFetching ? "opacity-70" : ""}`}>
              {isPending && items.length === 0 ? (
                <EmptyRow
                  message="Loading records..."
                  colSpan={module === "bookings" ? 7 : 5}
                />
              ) : isError ? (
                <EmptyRow
                  message="Could not load records."
                  colSpan={module === "bookings" ? 7 : 5}
                />
              ) : items.length === 0 ? (
                <EmptyRow
                  message="No records found."
                  colSpan={module === "bookings" ? 7 : 5}
                />
              ) : module === "bookings" ? (
                (items as AdminBooking[]).map((booking) => (
                  <tr
                    key={booking.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openBookingDetails(booking.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openBookingDetails(booking.id);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80 focus:bg-slate-50 focus:outline-none"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GuestAvatar name={booking.guestName} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {booking.guestName}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <FiMail className="shrink-0" />
                            <span className="truncate">{booking.guestEmail}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <FiHome className="h-3.5 w-3.5 text-slate-400" />
                          <span>{getBookingStayLabel(booking)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{getBookingTargetSummary(booking)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <FiUser className="h-3.5 w-3.5 text-slate-400" />
                          <span>Guests: {booking.guestCount}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {getBookingAssignedSummary(booking)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <FiCalendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-0.5 text-lg font-bold text-indigo-700">
                          <span className="text-xs font-medium text-indigo-400">INR</span>
                          <span>{booking.totalAmount}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                          {Number(booking.upfrontAmount) > 0 ? (
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Token: {booking.upfrontAmount}</span>
                          ) : (
                            <span className="text-slate-400">No upfront</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        to={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : module === "enquiries" ? (
                (items as AdminEnquiry[]).map((enquiry) => (
                  <tr key={enquiry.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GuestAvatar name={enquiry.name} />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {enquiry.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {enquiry.email} / {enquiry.contactNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-sm px-6 py-4">
                      <div className="line-clamp-2 text-sm text-slate-600 italic">
                        "{enquiry.message}"
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        {formatEnquirySource(enquiry.source)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(enquiry.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusSelect
                        value={enquiry.status}
                        statuses={leadStatuses}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateLeadStatus(
                            "enquiry",
                            enquiry.id,
                            enquiry.status,
                            status as LeadStatus,
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                (items as AdminQuote[]).map((quote) => (
                  <tr key={quote.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GuestAvatar name={quote.guestName ?? "Guest"} />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {quote.guestName ?? "Guest"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {quote.guestEmail ?? "No email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {quote.productName ?? quote.targetType}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(quote.checkIn)} - {formatDate(quote.checkOut)}
                    </td>
                    <td className="max-w-sm px-6 py-4">
                      <div className="line-clamp-1 text-sm text-slate-500">
                        {quote.notes ?? "No notes"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusSelect
                        value={quote.status}
                        statuses={leadStatuses}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateLeadStatus(
                            "quote",
                            quote.id,
                            quote.status,
                            status as LeadStatus,
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyRow({ message, colSpan = 5 }: { message: string; colSpan?: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-8 text-center text-sm text-slate-500"
      >
        {message}
      </td>
    </tr>
  );
}

function StatusSelect({
  value,
  statuses,
  disabled,
  onChange,
}: {
  value: string;
  statuses: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="group relative flex items-center gap-2">
      <StatusBadge status={value} className="scale-95 group-hover:scale-100 transition-transform origin-left" />
      <div className="relative">
        <select
          value={value}
          disabled={disabled || statuses.length <= 1}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full appearance-none rounded border border-slate-200 bg-slate-50/50 pl-2 pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-600 outline-none transition-all hover:bg-white focus:border-indigo-500 focus:bg-white disabled:opacity-50"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <FiFilter className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
