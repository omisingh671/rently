import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
const { FiArrowLeft, FiCheckCircle } = ICON_REGISTRY;
import Button from "@/components/ui/Button";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { getGroupApi } from "@/features/commercial/api";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import {
  checkManualBookingAvailabilityApi,
  createManualBookingApi,
} from "@/features/operations/api";
import type {
  ConcreteComfortOption,
  ManualBookingAvailabilityResponse,
  ManualBookingAvailabilityItem,
} from "@/features/operations/types";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { normalizeApiError } from "@/utils/errors";
import {
  GuestFields,
  StayFields,
  type GuestFieldErrors,
  type ManualBookingForm,
} from "@/features/operations/components/WalkInBookingFormFields";
import { WalkInBookingAvailabilityList } from "@/features/operations/components/WalkInBookingAvailabilityList";

const emptyForm: ManualBookingForm = {
  guestName: "",
  guestEmail: "",
  countryCode: "+91",
  contactNumber: "",
  from: "",
  to: "",
  guests: "1",
  comfortOption: "ALL",
  internalNotes: "",
  couponCode: "",
};

const concreteComfortOptions: ConcreteComfortOption[] = ["AC", "NON_AC"];

const mergeAvailabilityResults = (
  results: ManualBookingAvailabilityResponse[],
): ManualBookingAvailabilityResponse => {
  const firstResult = results[0];
  const itemsById = new Map<string, ManualBookingAvailabilityItem>();

  for (const result of results) {
    for (const item of result.items) {
      itemsById.set(item.bookingOptionId, item);
    }
  }

  const items = [...itemsById.values()].sort(
    (left, right) =>
      left.capacity - right.capacity ||
      left.itemCount - right.itemCount ||
      Number(left.stayTotal) - Number(right.stayTotal),
  );

  return {
    from: firstResult?.from ?? "",
    to: firstResult?.to ?? "",
    guests: firstResult?.guests ?? 0,
    availableSpaceIds: items
      .filter((item) => item.available)
      .map((item) => item.bookingOptionId),
    items,
  };
};

export default function WalkInBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const bookingGroupId = searchParams.get("bookingGroupId") ?? "";
  const linkedGroupName = searchParams.get("groupName") ?? "";
  const inventoryLockToken = searchParams.get("inventoryLockToken") ?? "";
  const heldRoomId = searchParams.get("roomId") ?? "";
  const linkedRoomNumber = searchParams.get("roomNumber") ?? "";
  const linkedPropertyId = searchParams.get("propertyId") ?? "";
  const isCorporatePickup = Boolean(
    bookingGroupId && inventoryLockToken && heldRoomId && linkedPropertyId,
  );
  const [form, setForm] = useState<ManualBookingForm>(() => ({
    ...emptyForm,
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  }));
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [availability, setAvailability] =
    useState<ManualBookingAvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const {
    properties,
    selectedPropertyId,
    selectedProperty,
    setSelectedPropertyId,
    isLoading: isLoadingProperties,
  } = useCurrentProperty();

  const groupContextQuery = useQuery({
    queryKey: ADMIN_KEYS.commercial.group(bookingGroupId),
    queryFn: () => getGroupApi(bookingGroupId),
    enabled: isCorporatePickup && Boolean(bookingGroupId),
  });
  const heldRoomQuery = useAdminRooms(
    isCorporatePickup ? linkedPropertyId : undefined,
    1,
    100,
    { search: "", status: "AVAILABLE", isActive: "true" },
  );
  const resolvedRoomNumber =
    linkedRoomNumber ||
    heldRoomQuery.data?.items.find((room) => room.id === heldRoomId)?.number ||
    "";
  const heldRoomDisplay = resolvedRoomNumber
    ? `Room ${resolvedRoomNumber}`
    : "Held Room";
  const resolvedGroupName =
    linkedGroupName || groupContextQuery.data?.name || "Corporate Group";

  useEffect(() => {
    if (
      linkedPropertyId &&
      properties.some((property) => property.id === linkedPropertyId) &&
      selectedPropertyId !== linkedPropertyId
    ) {
      setSelectedPropertyId(linkedPropertyId);
    }
  }, [linkedPropertyId, properties, selectedPropertyId, setSelectedPropertyId]);

  const availabilityByOptionId = useMemo(
    () =>
      new Map(
        availability?.items.map((item) => [item.bookingOptionId, item]) ?? [],
      ),
    [availability],
  );
  const availableCount = availability?.availableSpaceIds.length ?? 0;
  const requestedGuests = Number(form.guests);
  const selectedCapacity = selectedSpaceIds.reduce(
    (total, spaceId) =>
      total + (availabilityByOptionId.get(spaceId)?.capacity ?? 0),
    0,
  );
  const selectedCapacityCoversGuests =
    selectedSpaceIds.length > 0 && selectedCapacity >= requestedGuests;
  const selectedSpacesAreAvailable =
    availability !== null &&
    selectedSpaceIds.every(
      (spaceId) => availabilityByOptionId.get(spaceId)?.available === true,
    );
  const guestFieldErrors = useMemo(() => {
    const errors: GuestFieldErrors = {};
    const guestName = form.guestName.trim();
    const guestEmail = form.guestEmail.trim();

    if (guestName.length === 0) {
      errors.guestName = "Guest name is required";
    }

    if (guestEmail.length === 0) {
      errors.guestEmail = "Guest email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      errors.guestEmail = "Enter a valid email address";
    }

    return errors;
  }, [form.guestEmail, form.guestName]);
  const hasGuestFieldErrors = Object.keys(guestFieldErrors).length > 0;

  const checkAvailability = useMutation({
    mutationFn: async () => {
      const basePayload = {
        from: form.from,
        to: form.to,
        guests: Number(form.guests),
        ...(inventoryLockToken && { inventoryLockToken }),
      };

      if (form.comfortOption === "ALL") {
        const results = await Promise.all(
          concreteComfortOptions.map((comfortOption) =>
            checkManualBookingAvailabilityApi(selectedPropertyId, {
              ...basePayload,
              comfortOption,
            }),
          ),
        );

        return mergeAvailabilityResults(results);
      }

      return checkManualBookingAvailabilityApi(selectedPropertyId, {
        ...basePayload,
        comfortOption: form.comfortOption,
      });
    },
    onSuccess: (result) => {
      const visibleItems = heldRoomId
        ? result.items.filter((item) => item.roomId === heldRoomId)
        : result.items;
      setAvailability({
        ...result,
        items: visibleItems,
        availableSpaceIds: visibleItems
          .filter((item) => item.available)
          .map((item) => item.bookingOptionId),
      });
      setAvailabilityError("");
      setSelectedSpaceIds([]);
    },
    onError: (error) => {
      setAvailability(null);
      setAvailabilityError(normalizeApiError(error).message);
      setSelectedSpaceIds([]);
    },
  });

  const createBooking = useMutation({
    mutationFn: () => {
      const selectedOption = availabilityByOptionId.get(selectedSpaceIds[0]);
      if (!selectedOption) {
        throw new Error("Selected booking option was not found.");
      }

      return createManualBookingApi(selectedPropertyId, {
        bookingType: "SINGLE_TARGET",
        bookingOptionId: selectedSpaceIds[0],
        ...(bookingGroupId && { bookingGroupId }),
        ...(inventoryLockToken && { inventoryLockToken }),
        from: form.from,
        to: form.to,
        guests: Number(form.guests),
        comfortOption: selectedOption.comfortOption,
        guestName: form.guestName.trim(),
        guestEmail: form.guestEmail.trim().toLowerCase(),
        ...(form.countryCode.trim() &&
          form.contactNumber.trim() && {
            countryCode: form.countryCode.trim(),
            contactNumber: form.contactNumber.trim(),
          }),
        couponCode: form.couponCode.trim() || undefined,
        internalNotes: form.internalNotes.trim() || null,
      });
    },
    onSuccess: async (booking) => {
      await queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.operations.byProperty(booking.propertyId),
      });
      navigate(
        isCorporatePickup
          ? adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))
          : adminPath(ADMIN_ROUTES.BOOKINGS),
      );
    },
    onError: (error) => {
      setSubmitError(normalizeApiError(error).message);
    },
  });

  const updateForm = (patch: Partial<ManualBookingForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSubmitError("");
    if (
      patch.from !== undefined ||
      patch.to !== undefined ||
      patch.guests !== undefined ||
      patch.comfortOption !== undefined
    ) {
      setAvailability(null);
      setAvailabilityError("");
      setSelectedSpaceIds([]);
    }
  };

  const selectProperty = (nextPropertyId: string) => {
    setSelectedPropertyId(nextPropertyId);
    setAvailability(null);
    setAvailabilityError("");
    setSubmitError("");
    setSelectedSpaceIds([]);
  };

  const toggleSpace = (spaceId: string) => {
    const rowAvailability = availabilityByOptionId.get(spaceId);
    if (availability === null || rowAvailability?.available !== true) return;
    setSubmitError("");

    setSelectedSpaceIds((current) =>
      current.includes(spaceId)
        ? current.filter((id) => id !== spaceId)
        : [spaceId],
    );
  };

  const canCheckAvailability =
    !!selectedPropertyId &&
    form.from.length > 0 &&
    form.to.length > 0 &&
    Number(form.guests) > 0 &&
    !checkAvailability.isPending;
  const canCreate =
    selectedSpacesAreAvailable &&
    selectedCapacityCoversGuests &&
    !createBooking.isPending;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);

    if (hasGuestFieldErrors) {
      setSubmitError("Complete the required guest details.");
      return;
    }

    if (availability === null) {
      setSubmitError("Check availability before creating a booking.");
      return;
    }

    if (selectedSpaceIds.length === 0) {
      setSubmitError("Select one available booking option.");
      return;
    }

    if (!selectedSpacesAreAvailable) {
      setSubmitError("Select an available booking option.");
      return;
    }

    if (!selectedCapacityCoversGuests) {
      setSubmitError(`Selected option must cover ${requestedGuests} guests.`);
      return;
    }

    if (!canCreate) return;

    setSubmitError("");
    createBooking.mutate();
  };

  return (
    <div className="space-y-5">
      <div>
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<FiArrowLeft />}
            to={adminPath(isCorporatePickup ? ADMIN_ROUTES.COMMERCIAL : ADMIN_ROUTES.BOOKINGS)}
          >
            {isCorporatePickup ? "Back to Corporate & Groups" : "Back to Bookings"}
          </Button>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {isCorporatePickup ? "Corporate Room Pickup" : "Walk-in Booking"}
          </h2>
          <p className="text-sm text-slate-500">
            {isCorporatePickup
              ? `Add one guest to ${resolvedRoomNumber ? heldRoomDisplay : "the held room"}. The property and stay dates are fixed by the group.`
              : "Check room availability first, then create a confirmed booking."}
          </p>
        </div>
      </div>

      {isCorporatePickup && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Corporate Booking Context</p>
              <h3 className="mt-1 text-xl font-semibold text-indigo-950">Book {heldRoomDisplay}</h3>
              <p className="mt-1 text-sm text-indigo-800">Group: {resolvedGroupName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-white px-3 py-2">
                <span className="block text-xs text-slate-500">Property</span>
                <strong className="mt-0.5 block text-slate-800">{selectedProperty?.name ?? "Loading..."}</strong>
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                <span className="block text-xs text-slate-500">Check-In</span>
                <strong className="mt-0.5 block text-slate-800">{form.from}</strong>
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                <span className="block text-xs text-slate-500">Check-Out</span>
                <strong className="mt-0.5 block text-slate-800">{form.to}</strong>
              </div>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
            Only {heldRoomDisplay} can be booked with this hold. After checking availability,
            choose its AC or Non-AC rate option and create the booking.
          </p>
        </section>
      )}

      <div className={`grid gap-5 ${isCorporatePickup ? "" : "xl:grid-cols-[420px_1fr]"}`}>
        {!isCorporatePickup && (
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Choose Property</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select where the guest will stay.
                </p>
              </div>
              {!isLoadingProperties && (
                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                  {properties.length} Available
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] min-h-72 overflow-y-auto p-3">
            {isLoadingProperties ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading properties...
              </div>
            ) : properties.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No properties found.
              </div>
            ) : (
              <div className="space-y-2">
                {properties.map((property) => {
                  const isSelected = property.id === selectedPropertyId;
                  return (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => selectProperty(property.id)}
                      className={`group flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-950 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-indigo-600" : "border-slate-300 group-hover:border-indigo-400"}`}>
                        {isSelected && <span className="size-2 rounded-full bg-indigo-600" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{property.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {property.city}, {property.state}
                        </span>
                      </span>
                      {isSelected && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          </aside>
        )}

        <form
          noValidate
          className="rounded-md border border-slate-200 bg-white p-4"
          onSubmit={submit}
        >
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Guest Details
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Enter the primary guest and optional contact number.
              </p>
              <div className="mt-4">
                <GuestFields
                  form={form}
                  disabled={createBooking.isPending}
                  errors={hasAttemptedSubmit ? guestFieldErrors : {}}
                  onChange={updateForm}
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Stay Details
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {isCorporatePickup
                  ? `Dates are locked to the group hold. Choose the guest count and rate type for ${heldRoomDisplay}.`
                  : "Select one stay range, guest count, comfort, and any coupon."}
              </p>
              <div className="mt-4">
                <StayFields
                  form={form}
                  propertyId={selectedPropertyId}
                  disabled={createBooking.isPending}
                  lockDates={isCorporatePickup}
                  onChange={updateForm}
                />
              </div>
            </section>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="info"
              className="h-10 whitespace-nowrap shadow-md shadow-sky-100"
              disabled={!canCheckAvailability}
              onClick={() => checkAvailability.mutate()}
            >
              {checkAvailability.isPending
                ? "Checking..."
                : isCorporatePickup
                  ? `Check ${heldRoomDisplay}`
                  : "Check Availability"}
            </Button>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {isCorporatePickup ? `Rate Options for ${heldRoomDisplay}` : "Booking Options"}
                </h3>
                <p className="text-xs text-slate-500">
                  {availability
                    ? isCorporatePickup
                      ? `${availableCount} rate ${availableCount === 1 ? "option" : "options"} for the exact held room`
                      : `${availableCount} options / ${selectedCapacity} of ${requestedGuests} guests covered`
                    : isCorporatePickup
                      ? `Check ${heldRoomDisplay} to load its available rate options.`
                      : "Select dates and check availability."}
                </p>
              </div>
            </div>

            {availabilityError && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {availabilityError}
              </div>
            )}

            <WalkInBookingAvailabilityList
              selectedSpaceIds={selectedSpaceIds}
              availability={availability}
              availabilityByOptionId={availabilityByOptionId}
              requestedGuests={requestedGuests}
              isChecking={checkAvailability.isPending}
              isSubmitting={createBooking.isPending}
              heldRoomLabel={isCorporatePickup ? heldRoomDisplay : undefined}
              onToggleSpace={toggleSpace}
            />

            {availability && availableCount === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                No booking options are available for these dates.
              </p>
            )}
            {availability && selectedSpaceIds.length > 0 && !selectedCapacityCoversGuests && (
              <p className="mt-2 text-xs text-amber-700">
                Select an option that covers {requestedGuests} guests.
              </p>
            )}
          </div>

          <label className="mt-5 block text-sm">
            <span className="font-medium text-slate-700">Internal notes</span>
            <textarea
              value={form.internalNotes}
              maxLength={5000}
              placeholder="Add a note for the front desk team (optional)"
              disabled={createBooking.isPending}
              onChange={(event) =>
                updateForm({ internalNotes: event.target.value })
              }
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </label>

          {submitError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={createBooking.isPending}
              to={adminPath(isCorporatePickup ? ADMIN_ROUTES.COMMERCIAL : ADMIN_ROUTES.BOOKINGS)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBooking.isPending}
              icon={<FiCheckCircle />}
            >
              {createBooking.isPending
                ? "Creating..."
                : isCorporatePickup
                  ? `Book ${heldRoomDisplay}`
                  : "Create Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
