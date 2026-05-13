import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminProperties } from "@/features/admin/properties/hooks/useAdminProperties";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import { listRatesApi } from "@/features/admin/pricing/api";
import type { AdminRoomPricing } from "@/features/admin/pricing/types";
import { useAdminOperations } from "../hooks/useAdminOperations";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type {
  AdminBooking,
  AdminEnquiry,
  AdminQuote,
  BookingStatus,
  LeadStatus,
  ManualBookingAvailabilityResponse,
} from "../types";
import StatusBadge from "@/components/common/StatusBadge";
import { FiLogIn, FiLogOut, FiPlus } from "react-icons/fi";

type Module = "bookings" | "enquiries" | "quotes";

type Props = {
  module: Module;
};

type BookingWorkflowAction = "checkIn" | "checkOut";

type ActiveBookingWorkflow = {
  action: BookingWorkflowAction;
  booking: AdminBooking;
};

type ManualBookingForm = {
  guestName: string;
  guestEmail: string;
  countryCode: string;
  contactNumber: string;
  from: string;
  to: string;
  guests: string;
  internalNotes: string;
};

const emptyManualBookingForm: ManualBookingForm = {
  guestName: "",
  guestEmail: "",
  countryCode: "+91",
  contactNumber: "",
  from: "",
  to: "",
  guests: "1",
  internalNotes: "",
};

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
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

const bookingStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
};

const getBookingStatusOptions = (status: BookingStatus): BookingStatus[] => [
  status,
  ...bookingStatusTransitions[status],
];

const titles: Record<Module, string> = {
  bookings: "Bookings",
  enquiries: "Enquiries",
  quotes: "Quotes",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatRateTarget = (rate: AdminRoomPricing) =>
  rate.roomLabel ?? (rate.unitNumber ? `Unit ${rate.unitNumber}` : "Space");

const isRoomRate = (rate: AdminRoomPricing) => rate.roomId !== null;

export default function OperationsPage({ module }: Props) {
  const [propertyId, setPropertyId] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    source: "",
  });
  const [activeBookingWorkflow, setActiveBookingWorkflow] =
    useState<ActiveBookingWorkflow | null>(null);
  const [workflowNote, setWorkflowNote] = useState("");
  const [workflowInternalNotes, setWorkflowInternalNotes] = useState("");
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualBookingForm, setManualBookingForm] =
    useState<ManualBookingForm>(emptyManualBookingForm);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [manualAvailability, setManualAvailability] =
    useState<ManualBookingAvailabilityResponse | null>(null);
  const [manualAvailabilityError, setManualAvailabilityError] = useState("");

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

  const {
    data,
    isPending,
    isFetching,
    updateBooking,
    createManualBooking,
    checkManualBookingAvailability,
    checkInBooking,
    checkOutBooking,
    updateEnquiry,
    updateQuote,
    isMutating,
  } = useAdminOperations(module, selectedPropertyId, filters);

  const { data: ratesData, isFetching: isRatesFetching } = useQuery({
    queryKey: selectedPropertyId
      ? [...ADMIN_KEYS.pricing.rates(selectedPropertyId), "manual-booking"]
      : ADMIN_KEYS.pricing.all(),
    queryFn: () =>
      listRatesApi(selectedPropertyId, {
        page: 1,
        limit: 100,
      }),
    enabled: module === "bookings" && manualBookingOpen && !!selectedPropertyId,
  });

  const items = data?.items ?? [];
  const statuses = module === "bookings" ? bookingStatuses : leadStatuses;
  const rates = ratesData?.items ?? [];
  const selectedRates = rates.filter((rate) =>
    selectedSpaceIds.includes(rate.id),
  );
  const availabilityBySpaceId = useMemo(
    () =>
      new Map(
        manualAvailability?.items.map((item) => [item.spaceId, item]) ?? [],
      ),
    [manualAvailability],
  );
  const selectedSpacesAreMultiRoomReady =
    selectedRates.length <= 1 || selectedRates.every(isRoomRate);
  const selectedSpacesAreAvailable =
    manualAvailability !== null &&
    selectedSpaceIds.every(
      (spaceId) => availabilityBySpaceId.get(spaceId)?.available === true,
    );

  const openBookingWorkflow = (
    action: BookingWorkflowAction,
    booking: AdminBooking,
  ) => {
    setActiveBookingWorkflow({ action, booking });
    setWorkflowNote(
      action === "checkIn"
        ? "Guest checked in."
        : "Guest checked out.",
    );
    setWorkflowInternalNotes(booking.internalNotes ?? "");
  };

  const closeBookingWorkflow = () => {
    setActiveBookingWorkflow(null);
    setWorkflowNote("");
    setWorkflowInternalNotes("");
  };

  const submitBookingWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeBookingWorkflow) return;

    const note = workflowNote.trim();
    const internalNotes = workflowInternalNotes.trim();
    const existingInternalNotes =
      activeBookingWorkflow.booking.internalNotes ?? "";
    const payload = {
      note,
      ...(workflowInternalNotes !== existingInternalNotes && {
        internalNotes: internalNotes.length > 0 ? internalNotes : null,
      }),
    };

    if (activeBookingWorkflow.action === "checkIn") {
      await checkInBooking({
        bookingId: activeBookingWorkflow.booking.id,
        payload,
      });
    } else {
      await checkOutBooking({
        bookingId: activeBookingWorkflow.booking.id,
        payload,
      });
    }

    closeBookingWorkflow();
  };

  const closeManualBooking = () => {
    setManualBookingOpen(false);
    setManualBookingForm(emptyManualBookingForm);
    setSelectedSpaceIds([]);
    setManualAvailability(null);
    setManualAvailabilityError("");
  };

  const updateManualBookingForm = (patch: Partial<ManualBookingForm>) => {
    setManualBookingForm((prev) => ({ ...prev, ...patch }));
    if (
      patch.from !== undefined ||
      patch.to !== undefined ||
      patch.guests !== undefined
    ) {
      setManualAvailability(null);
      setManualAvailabilityError("");
      setSelectedSpaceIds([]);
    }
  };

  const toggleManualBookingSpace = (spaceId: string) => {
    if (manualAvailability !== null) {
      const availability = availabilityBySpaceId.get(spaceId);
      if (availability?.available !== true) return;
    }

    setSelectedSpaceIds((prev) =>
      prev.includes(spaceId)
        ? prev.filter((id) => id !== spaceId)
        : [...prev, spaceId],
    );
  };

  const checkManualAvailability = async () => {
    if (!selectedPropertyId || rates.length === 0) return;
    setManualAvailabilityError("");
    setSelectedSpaceIds([]);

    try {
      const result = await checkManualBookingAvailability({
        propertyId: selectedPropertyId,
        payload: {
          spaceIds: rates.map((rate) => rate.id),
          from: manualBookingForm.from,
          to: manualBookingForm.to,
          guests: Number(manualBookingForm.guests),
        },
      });

      setManualAvailability(result);
    } catch {
      setManualAvailability(null);
      setManualAvailabilityError("Could not check availability. Try again.");
    }
  };

  const submitManualBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPropertyId || selectedSpaceIds.length === 0) return;
    if (!selectedSpacesAreAvailable) return;

    const isMultiRoom = selectedSpaceIds.length > 1;
    await createManualBooking({
      propertyId: selectedPropertyId,
      payload: {
        bookingType: isMultiRoom ? "MULTI_ROOM" : "SINGLE_TARGET",
        ...(isMultiRoom
          ? { spaceIds: selectedSpaceIds }
          : { spaceId: selectedSpaceIds[0] }),
        from: manualBookingForm.from,
        to: manualBookingForm.to,
        guests: Number(manualBookingForm.guests),
        guestName: manualBookingForm.guestName.trim(),
        guestEmail: manualBookingForm.guestEmail.trim().toLowerCase(),
        ...(manualBookingForm.countryCode.trim() &&
          manualBookingForm.contactNumber.trim() && {
            countryCode: manualBookingForm.countryCode.trim(),
            contactNumber: manualBookingForm.contactNumber.trim(),
          }),
        internalNotes: manualBookingForm.internalNotes.trim() || null,
      },
    });

    closeManualBooking();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {titles[module]}
          </h2>
          <p className="text-sm text-slate-500">
            {items.length} records in the selected property
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {module === "bookings" && (
            <Button
              type="button"
              size="sm"
              variant="dark"
              icon={<FiPlus />}
              disabled={!selectedPropertyId}
              onClick={() => setManualBookingOpen(true)}
            >
              Walk-in booking
            </Button>
          )}

          <select
            value={selectedPropertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
            placeholder="Search"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, status: event.target.value }))
            }
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          {module === "enquiries" && (
            <select
              value={filters.source}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, source: event.target.value }))
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All sources</option>
              {enquirySources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!selectedPropertyId ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          Select a property to view {titles[module].toLowerCase()}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {module === "bookings" ? (
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Stay</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              ) : module === "enquiries" ? (
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              )}
            </thead>
            <tbody className={isFetching ? "opacity-70" : ""}>
              {isPending && items.length === 0 ? (
                <EmptyRow
                  message="Loading records..."
                  colSpan={module === "bookings" ? 6 : 5}
                />
              ) : items.length === 0 ? (
                <EmptyRow
                  message="No records found."
                  colSpan={module === "bookings" ? 6 : 5}
                />
              ) : module === "bookings" ? (
                (items as AdminBooking[]).map((booking) => (
                  <tr key={booking.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {booking.guestName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {booking.guestEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {booking.bookingType === "MULTI_ROOM"
                          ? `Multi-room stay (${booking.items.length} rooms)`
                          : booking.targetLabel}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(booking.checkIn)} -{" "}
                        {formatDate(booking.checkOut)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Guests: {booking.guestCount}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{booking.productName}</div>
                      {booking.items.length > 1 && (
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.items
                            .map((item) => item.targetLabel)
                            .join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{booking.totalAmount}</div>
                      <div className="text-xs text-slate-500">
                        {Number(booking.upfrontAmount) > 0
                          ? `Token ${booking.upfrontAmount}`
                          : "No upfront"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={booking.status}
                        statuses={getBookingStatusOptions(booking.status)}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateBooking({
                            bookingId: booking.id,
                            payload: { status: status as BookingStatus },
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <BookingWorkflowActions
                        booking={booking}
                        disabled={isMutating}
                        onCheckIn={() => openBookingWorkflow("checkIn", booking)}
                        onCheckOut={() =>
                          openBookingWorkflow("checkOut", booking)
                        }
                      />
                    </td>
                  </tr>
                ))
              ) : module === "enquiries" ? (
                (items as AdminEnquiry[]).map((enquiry) => (
                  <tr key={enquiry.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {enquiry.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enquiry.email} / {enquiry.contactNumber}
                      </div>
                    </td>
                    <td className="max-w-sm px-4 py-3">{enquiry.message}</td>
                    <td className="px-4 py-3">
                      {formatEnquirySource(enquiry.source)}
                    </td>
                    <td className="px-4 py-3">{formatDate(enquiry.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={enquiry.status}
                        statuses={leadStatuses}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateEnquiry({
                            enquiryId: enquiry.id,
                            status: status as LeadStatus,
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                (items as AdminQuote[]).map((quote) => (
                  <tr key={quote.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {quote.guestName ?? "Guest"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {quote.guestEmail ?? "No email"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {quote.productName ?? quote.targetType}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(quote.checkIn)} - {formatDate(quote.checkOut)}
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      {quote.notes ?? "No notes"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={quote.status}
                        statuses={leadStatuses}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateQuote({
                            quoteId: quote.id,
                            status: status as LeadStatus,
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ManualBookingModal
        isOpen={manualBookingOpen}
        form={manualBookingForm}
        rates={rates}
        selectedSpaceIds={selectedSpaceIds}
        isFetchingRates={isRatesFetching}
        isSubmitting={isMutating}
        selectedSpacesAreMultiRoomReady={selectedSpacesAreMultiRoomReady}
        selectedSpacesAreAvailable={selectedSpacesAreAvailable}
        availability={manualAvailability}
        availabilityBySpaceId={availabilityBySpaceId}
        availabilityError={manualAvailabilityError}
        onFormChange={updateManualBookingForm}
        onCheckAvailability={checkManualAvailability}
        onToggleSpace={toggleManualBookingSpace}
        onClose={closeManualBooking}
        onSubmit={submitManualBooking}
      />

      <BookingWorkflowModal
        workflow={activeBookingWorkflow}
        note={workflowNote}
        internalNotes={workflowInternalNotes}
        isSubmitting={isMutating}
        onNoteChange={setWorkflowNote}
        onInternalNotesChange={setWorkflowInternalNotes}
        onClose={closeBookingWorkflow}
        onSubmit={submitBookingWorkflow}
      />
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

function ManualBookingModal({
  isOpen,
  form,
  rates,
  selectedSpaceIds,
  isFetchingRates,
  isSubmitting,
  selectedSpacesAreMultiRoomReady,
  selectedSpacesAreAvailable,
  availability,
  availabilityBySpaceId,
  availabilityError,
  onFormChange,
  onCheckAvailability,
  onToggleSpace,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  form: ManualBookingForm;
  rates: AdminRoomPricing[];
  selectedSpaceIds: string[];
  isFetchingRates: boolean;
  isSubmitting: boolean;
  selectedSpacesAreMultiRoomReady: boolean;
  selectedSpacesAreAvailable: boolean;
  availability: ManualBookingAvailabilityResponse | null;
  availabilityBySpaceId: Map<
    string,
    ManualBookingAvailabilityResponse["items"][number]
  >;
  availabilityError: string;
  onFormChange: (patch: Partial<ManualBookingForm>) => void;
  onCheckAvailability: () => void;
  onToggleSpace: (spaceId: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canCheckAvailability =
    form.from.length > 0 &&
    form.to.length > 0 &&
    Number(form.guests) > 0 &&
    rates.length > 0 &&
    !isSubmitting;
  const canSubmit =
    selectedSpaceIds.length > 0 &&
    selectedSpacesAreMultiRoomReady &&
    selectedSpacesAreAvailable &&
    form.guestName.trim().length > 0 &&
    form.guestEmail.trim().length > 0 &&
    form.from.length > 0 &&
    form.to.length > 0 &&
    Number(form.guests) > 0 &&
    !isSubmitting;
  const availableCount = availability?.availableSpaceIds.length ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Walk-in Booking"
      size="xl"
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Guest name</span>
            <input
              value={form.guestName}
              required
              disabled={isSubmitting}
              onChange={(event) => onFormChange({ guestName: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Guest email</span>
            <input
              type="email"
              value={form.guestEmail}
              required
              disabled={isSubmitting}
              onChange={(event) => onFormChange({ guestEmail: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">From</span>
            <input
              type="date"
              value={form.from}
              required
              disabled={isSubmitting}
              onChange={(event) => onFormChange({ from: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">To</span>
            <input
              type="date"
              value={form.to}
              required
              disabled={isSubmitting}
              onChange={(event) => onFormChange({ to: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Guests</span>
            <input
              type="number"
              min={1}
              max={20}
              value={form.guests}
              required
              disabled={isSubmitting}
              onChange={(event) => onFormChange({ guests: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="grid grid-cols-[96px_1fr] gap-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Code</span>
              <input
                value={form.countryCode}
                disabled={isSubmitting}
                onChange={(event) =>
                  onFormChange({ countryCode: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Phone</span>
              <input
                value={form.contactNumber}
                disabled={isSubmitting}
                onChange={(event) =>
                  onFormChange({ contactNumber: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-medium text-slate-700">Spaces</span>
              <div className="text-xs text-slate-500">
                {availability
                  ? `${availableCount} available / ${selectedSpaceIds.length} selected`
                  : "Check dates before selecting rooms"}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!canCheckAvailability}
              onClick={onCheckAvailability}
            >
              Check availability
            </Button>
          </div>
          {availabilityError && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {availabilityError}
            </div>
          )}
          {availability && availableCount === 0 && (
            <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No spaces are available for these dates.
            </div>
          )}
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
            {isFetchingRates ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Loading spaces...
              </div>
            ) : rates.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No priced spaces found.
              </div>
            ) : (
              rates.map((rate) => (
                <ManualBookingSpaceOption
                  key={rate.id}
                  rate={rate}
                  checked={selectedSpaceIds.includes(rate.id)}
                  disabled={isSubmitting}
                  availability={availabilityBySpaceId.get(rate.id) ?? null}
                  hasAvailabilityResult={availability !== null}
                  onToggle={() => onToggleSpace(rate.id)}
                />
              ))
            )}
          </div>
          {availability === null && (
            <p className="mt-2 text-xs text-slate-500">
              Availability is checked against bookings and maintenance blocks.
            </p>
          )}
          {!selectedSpacesAreAvailable && selectedSpaceIds.length > 0 && (
            <p className="mt-2 text-xs text-red-600">
              Remove unavailable spaces before creating the booking.
            </p>
          )}
          {!selectedSpacesAreMultiRoomReady && (
            <p className="mt-2 text-xs text-red-600">
              Multi-room walk-in bookings can combine rooms only.
            </p>
          )}
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Internal notes</span>
          <textarea
            value={form.internalNotes}
            maxLength={5000}
            disabled={isSubmitting}
            onChange={(event) =>
              onFormChange({ internalNotes: event.target.value })
            }
            className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            Create booking
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManualBookingSpaceOption({
  rate,
  checked,
  disabled,
  availability,
  hasAvailabilityResult,
  onToggle,
}: {
  rate: AdminRoomPricing;
  checked: boolean;
  disabled: boolean;
  availability: ManualBookingAvailabilityResponse["items"][number] | null;
  hasAvailabilityResult: boolean;
  onToggle: () => void;
}) {
  const isAvailable = availability?.available === true;
  const isDisabled = disabled || !isAvailable;
  const statusText = !hasAvailabilityResult
    ? "Check needed"
    : isAvailable
      ? "Available"
      : availability?.reason ?? "Unavailable";
  const statusClass = !hasAvailabilityResult
    ? "bg-slate-100 text-slate-600"
    : isAvailable
      ? "bg-green-50 text-green-700 ring-1 ring-green-200"
      : "bg-red-50 text-red-700 ring-1 ring-red-200";

  return (
    <label
      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
        isAvailable
          ? "border-green-200 bg-white"
          : "border-slate-200 bg-white opacity-75"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={isDisabled}
        onChange={onToggle}
        className="mt-1"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">
            {formatRateTarget(rate)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
            {statusText}
          </span>
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          {rate.productName} / INR {rate.price} / {rate.rateType}
        </span>
      </span>
    </label>
  );
}

function BookingWorkflowActions({
  booking,
  disabled,
  onCheckIn,
  onCheckOut,
}: {
  booking: AdminBooking;
  disabled: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const canCheckIn = booking.status === "CONFIRMED";
  const canCheckOut = booking.status === "CHECKED_IN";

  return (
    <div className="flex min-w-40 flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="success"
        outline={!canCheckIn}
        disabled={disabled || !canCheckIn}
        icon={<FiLogIn />}
        className={!canCheckIn ? "opacity-50" : undefined}
        onClick={onCheckIn}
      >
        Check in
      </Button>
      <Button
        type="button"
        size="sm"
        variant="info"
        outline={!canCheckOut}
        disabled={disabled || !canCheckOut}
        icon={<FiLogOut />}
        className={!canCheckOut ? "opacity-50" : undefined}
        onClick={onCheckOut}
      >
        Check out
      </Button>
    </div>
  );
}

function BookingWorkflowModal({
  workflow,
  note,
  internalNotes,
  isSubmitting,
  onNoteChange,
  onInternalNotesChange,
  onClose,
  onSubmit,
}: {
  workflow: ActiveBookingWorkflow | null;
  note: string;
  internalNotes: string;
  isSubmitting: boolean;
  onNoteChange: (value: string) => void;
  onInternalNotesChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const booking = workflow?.booking;
  const title =
    workflow?.action === "checkIn"
      ? "Confirm Check In"
      : "Confirm Check Out";
  const canSubmit = note.trim().length > 0 && !isSubmitting;

  return (
    <Modal
      isOpen={workflow !== null}
      onClose={onClose}
      title={title}
      size="md"
      disableBackdropClose={isSubmitting}
      disableEscapeClose={isSubmitting}
    >
      {booking && (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-900">
              {booking.guestNameSnapshot}
            </div>
            <div className="mt-1 text-slate-500">
              {booking.bookingRef} / {booking.targetLabel}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Audit note</span>
            <textarea
              value={note}
              required
              maxLength={1000}
              disabled={isSubmitting}
              onChange={(event) => onNoteChange(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Internal notes</span>
            <textarea
              value={internalNotes}
              maxLength={5000}
              disabled={isSubmitting}
              onChange={(event) => onInternalNotesChange(event.target.value)}
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              Confirm
            </Button>
          </div>
        </form>
      )}
    </Modal>
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
    <div className="flex items-center gap-2">
      <StatusBadge status={value} />
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-60"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
