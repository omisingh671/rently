import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
const { FiArrowLeft, FiCheckCircle } = ICON_REGISTRY;
import Button from "@/components/ui/Button";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
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
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ManualBookingForm>(emptyForm);
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
      setAvailability(result);
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
      navigate(adminPath(ADMIN_ROUTES.BOOKINGS));
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<FiArrowLeft />}
            to={adminPath(ADMIN_ROUTES.BOOKINGS)}
          >
            Back to bookings
          </Button>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Walk-in Booking
          </h2>
          <p className="text-sm text-slate-500">
            Check room availability first, then create a confirmed booking.
          </p>
        </div>

        {selectedProperty && (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">
            <div className="font-medium text-slate-900">
              {selectedProperty.name}
            </div>
            <div className="text-slate-500">
              {selectedProperty.city}, {selectedProperty.state}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-md border border-slate-200 bg-white p-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Properties</span>
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Available properties
            </div>
          </label>

          <div className="mt-3 max-h-[calc(100vh-260px)] min-h-72 overflow-y-auto pr-1">
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
                      className={`w-full rounded-md border p-3 text-left text-sm transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-950"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="block font-medium">{property.name}</span>
                      <span className="block text-xs text-slate-500">
                        {property.city}, {property.state}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <form
          noValidate
          className="rounded-md border border-slate-200 bg-white p-4"
          onSubmit={submit}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <GuestFields
              form={form}
              disabled={createBooking.isPending}
              errors={hasAttemptedSubmit ? guestFieldErrors : {}}
              onChange={updateForm}
            />
            <StayFields form={form} disabled={createBooking.isPending} onChange={updateForm} />
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
              {checkAvailability.isPending ? "Checking..." : "Check availability"}
            </Button>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Booking Options
                </h3>
                <p className="text-xs text-slate-500">
                  {availability
                    ? `${availableCount} options / ${selectedCapacity} of ${requestedGuests} guests covered`
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
              disabled={createBooking.isPending}
              onChange={(event) =>
                updateForm({ internalNotes: event.target.value })
              }
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
              to={adminPath(ADMIN_ROUTES.BOOKINGS)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBooking.isPending}
              icon={<FiCheckCircle />}
            >
              {createBooking.isPending ? "Creating..." : "Create booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
