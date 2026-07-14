import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { getBookingStatusTone } from "../operationPalette";
import type {
  AdminBooking,
  AdminEnquiry,
  AdminQuote,
  LeadStatus,
} from "../types";

const { FiFilter, FiMail } = ICON_REGISTRY;

const leadStatuses: LeadStatus[] = ["NEW", "IN_PROGRESS", "CLOSED"];

const enquirySources = [
  { value: "PUBLIC_WEBSITE", label: "Website" },
  { value: "PUBLIC_QUOTE_REQUEST", label: "Quote requests" },
] as const;

type OperationsModule = "bookings" | "enquiries" | "quotes";

type OperationsRecord = AdminBooking | AdminEnquiry | AdminQuote;

type OperationsRecordsTableProps = {
  module: OperationsModule;
  items: OperationsRecord[];
  page: number;
  limit: number;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  isMutating: boolean;
  onLeadStatusChange: (
    type: "enquiry" | "quote",
    id: string,
    currentStatus: LeadStatus,
    nextStatus: LeadStatus,
  ) => void;
};

export function OperationsRecordsTable({
  module,
  items,
  page,
  limit,
  isPending,
  isFetching,
  isError,
  isMutating,
  onLeadStatusChange,
}: OperationsRecordsTableProps) {
  const colSpan = module === "bookings" ? 7 : 6;
  const showInitialLoading = isPending && items.length === 0;
  const emptyMessage = showInitialLoading
    ? "Loading records..."
    : isError
      ? "Could not load records."
      : "No records found.";

  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <OperationsTableHead module={module} />
      <tbody
        className={`divide-y divide-slate-200 ${isFetching ? "opacity-70" : ""}`}
      >
        {showInitialLoading || isError || items.length === 0 ? (
          <EmptyRow message={emptyMessage} colSpan={colSpan} />
        ) : module === "bookings" ? (
          <BookingRows
            bookings={items as AdminBooking[]}
            page={page}
            limit={limit}
          />
        ) : module === "enquiries" ? (
          <EnquiryRows
            enquiries={items as AdminEnquiry[]}
            page={page}
            limit={limit}
            isMutating={isMutating}
            onStatusChange={(enquiry, nextStatus) =>
              onLeadStatusChange(
                "enquiry",
                enquiry.id,
                enquiry.status,
                nextStatus,
              )
            }
          />
        ) : (
          <QuoteRows
            quotes={items as AdminQuote[]}
            page={page}
            limit={limit}
            isMutating={isMutating}
            onStatusChange={(quote, nextStatus) =>
              onLeadStatusChange("quote", quote.id, quote.status, nextStatus)
            }
          />
        )}
      </tbody>
    </table>
  );
}

function OperationsTableHead({ module }: { module: OperationsModule }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-700 backdrop-blur-sm">
      {module === "bookings" ? (
        <tr>
          <th className="w-16 whitespace-nowrap px-6 py-4 text-center">#SN</th>
          <th className="whitespace-nowrap px-6 py-4">Guest</th>
          <th className="whitespace-nowrap px-6 py-4">Assigned Room/Unit</th>
          <th className="whitespace-nowrap px-6 py-4">Dates</th>
          <th className="whitespace-nowrap px-6 py-4 text-right">Financials</th>
          <th className="whitespace-nowrap px-6 py-4 text-center">Status</th>
          <th className="whitespace-nowrap px-6 py-4 text-right">Details</th>
        </tr>
      ) : module === "enquiries" ? (
        <tr>
          <th className="w-16 whitespace-nowrap px-6 py-4 text-center">#SN</th>
          <th className="whitespace-nowrap px-6 py-4">Guest</th>
          <th className="whitespace-nowrap px-6 py-4">Message</th>
          <th className="whitespace-nowrap px-6 py-4">Source</th>
          <th className="whitespace-nowrap px-6 py-4">Created</th>
          <th className="whitespace-nowrap px-6 py-4">Status</th>
        </tr>
      ) : (
        <tr>
          <th className="w-16 whitespace-nowrap px-6 py-4 text-center">#SN</th>
          <th className="whitespace-nowrap px-6 py-4">Guest</th>
          <th className="whitespace-nowrap px-6 py-4">Product</th>
          <th className="whitespace-nowrap px-6 py-4">Dates</th>
          <th className="whitespace-nowrap px-6 py-4">Notes</th>
          <th className="whitespace-nowrap px-6 py-4">Status</th>
        </tr>
      )}
    </thead>
  );
}

function BookingRows({
  bookings,
  page,
  limit,
}: {
  bookings: AdminBooking[];
  page: number;
  limit: number;
}) {
  return bookings.map((booking, index) => {
    const bookingTone = getBookingStatusTone(booking.status);
    const refundIndicator = getBookingRefundIndicator(booking);

    return (
      <tr
        key={booking.id}
        className={`transition-all duration-150 ${bookingTone.rowHover}`}
      >
        <td
          className={`whitespace-nowrap border-l-4 px-6 py-4 text-center text-sm font-semibold text-slate-500 ${bookingTone.tableAccent}`}
        >
          {(page - 1) * limit + index + 1}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <GuestAvatar name={booking.guestName} />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-900">
                  {booking.guestName}
                </span>
              </div>
              <div className="flex items-center text-xs font-medium text-slate-500">
                <span className="flex min-w-0 items-center gap-1">
                  <FiMail className="shrink-0 text-slate-400" />
                  <span className="truncate" title={booking.guestEmail}>
                    {booking.guestEmail}
                  </span>
                </span>
              </div>
              <div className="pt-0.5 text-[11px] font-semibold text-slate-500">
                <span>
                  {booking.guestCount}{" "}
                  {booking.guestCount === 1 ? "guest" : "guests"}
                </span>
                <span className="mx-1.5 text-slate-300">/</span>
                <span className="font-mono text-slate-600">
                  {booking.bookingRef}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-sm font-medium text-slate-700">
          {getBookingAssignedSummary(booking)}
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="flex flex-col text-sm text-slate-600">
            <span>{formatDate(booking.checkIn)}</span>
            <span>{formatDate(booking.checkOut)}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex flex-col items-end gap-1">
            <div className="text-base font-black leading-tight text-indigo-700">
              {formatMoney(booking.totalAmount)}
            </div>
            <div className="flex items-center justify-end gap-1 text-[9px] font-extrabold uppercase tracking-wider">
              {Number(booking.upfrontAmount) > 0 ? (
                <span className="rounded border border-emerald-200 bg-emerald-50/60 px-1.5 py-0.5 text-emerald-600">
                  Token: {formatMoney(booking.upfrontAmount)}
                </span>
              ) : (
                <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-slate-400">
                  No upfront
                </span>
              )}
            </div>
            {refundIndicator && (
              <div className="mt-0.5 rounded border border-amber-200 bg-amber-50/60 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-650">
                {refundIndicator}
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex justify-center">
            <StatusBadge status={booking.status} />
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right">
          <Button
            size="sm"
            variant="secondary"
            to={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
            className="whitespace-nowrap"
          >
            View Details
          </Button>
        </td>
      </tr>
    );
  });
}

function EnquiryRows({
  enquiries,
  page,
  limit,
  isMutating,
  onStatusChange,
}: {
  enquiries: AdminEnquiry[];
  page: number;
  limit: number;
  isMutating: boolean;
  onStatusChange: (enquiry: AdminEnquiry, status: LeadStatus) => void;
}) {
  return enquiries.map((enquiry, index) => (
    <tr key={enquiry.id} className="transition-colors hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-slate-500">
        {(page - 1) * limit + index + 1}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <GuestAvatar name={enquiry.name} />
          <div>
            <div className="font-semibold text-slate-900">{enquiry.name}</div>
            <div className="text-xs text-slate-500">
              {enquiry.email} / {enquiry.contactNumber}
            </div>
          </div>
        </div>
      </td>
      <td className="max-w-sm px-6 py-4">
        <div className="line-clamp-2 text-sm italic text-slate-600">
          &quot;{enquiry.message}&quot;
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
          onChange={(status) => onStatusChange(enquiry, status as LeadStatus)}
        />
      </td>
    </tr>
  ));
}

function QuoteRows({
  quotes,
  page,
  limit,
  isMutating,
  onStatusChange,
}: {
  quotes: AdminQuote[];
  page: number;
  limit: number;
  isMutating: boolean;
  onStatusChange: (quote: AdminQuote, status: LeadStatus) => void;
}) {
  return quotes.map((quote, index) => (
    <tr key={quote.id} className="transition-colors hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-slate-500">
        {(page - 1) * limit + index + 1}
      </td>
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
          onChange={(status) => onStatusChange(quote, status as LeadStatus)}
        />
      </td>
    </tr>
  ));
}

function EmptyRow({ message, colSpan }: { message: string; colSpan: number }) {
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
  statuses: readonly string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="group relative flex items-center gap-2">
      <StatusBadge
        status={value}
        className="origin-left scale-95 transition-transform group-hover:scale-100"
      />
      <div className="relative">
        <select
          value={value}
          disabled={disabled || statuses.length <= 1}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full appearance-none rounded border border-slate-200 bg-slate-50/50 pl-2 pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-600 outline-none transition-all hover:bg-white focus:border-indigo-500 focus:bg-white disabled:opacity-50"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatEnumLabel(status)}
            </option>
          ))}
        </select>
        <FiFilter className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function GuestAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-sky-100 text-sky-700",
  ];
  const colorClass = colors[name.length % colors.length];

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {initials}
    </div>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatMoney = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatEnquirySource = (source: string | null) =>
  enquirySources.find((item) => item.value === source)?.label ??
  source ??
  "Website";

const getBookingAssignedSummary = (booking: AdminBooking) => {
  if (booking.items.length === 0) {
    return booking.targetLabel;
  }

  return booking.items.map((item) => item.targetLabel).join(" + ");
};

const getBookingRefundIndicator = (booking: AdminBooking) => {
  if (booking.refundRequest?.status === "REQUESTED") {
    return "Refund requested";
  }

  if (booking.refundRequest?.status === "IN_REVIEW") {
    return "Refund in review";
  }

  if (booking.refundRequest?.status === "REJECTED") {
    return "Refund rejected";
  }

  if (
    (booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
    Number(booking.paidAmount) > 0 &&
    Number(booking.refundableAmount) <= 0
  ) {
    return "Refunded";
  }

  if (
    (booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
    Number(booking.refundableAmount) > 0
  ) {
    return "Refund pending";
  }

  return null;
};
