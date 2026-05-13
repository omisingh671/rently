import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiSearch } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";
import { useAdminProperties } from "@/features/admin/properties/hooks/useAdminProperties";
import {
  checkManualBookingAvailabilityApi,
  createManualBookingApi,
} from "@/features/admin/operations/api";
import type {
  ManualBookingAvailabilityResponse,
  ManualBookingAvailabilityItem,
} from "@/features/admin/operations/types";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";

type ManualBookingForm = {
  guestName: string;
  guestEmail: string;
  countryCode: string;
  contactNumber: string;
  from: string;
  to: string;
  guests: string;
  comfortOption: "AC" | "NON_AC";
  internalNotes: string;
};

type GuestFieldErrors = {
  guestName?: string;
  guestEmail?: string;
};

const emptyForm: ManualBookingForm = {
  guestName: "",
  guestEmail: "",
  countryCode: "+91",
  contactNumber: "",
  from: "",
  to: "",
  guests: "1",
  comfortOption: "NON_AC",
  internalNotes: "",
};

export default function WalkInBookingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [form, setForm] = useState<ManualBookingForm>(emptyForm);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [availability, setAvailability] =
    useState<ManualBookingAvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

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

  const availabilityBySpaceId = useMemo(
    () =>
      new Map(
        availability?.items.map((item) => [item.spaceId, item]) ?? [],
      ),
    [availability],
  );
  const availableCount = availability?.availableSpaceIds.length ?? 0;
  const requestedGuests = Number(form.guests);
  const selectedCapacity = selectedSpaceIds.reduce(
    (total, spaceId) =>
      total + (availabilityBySpaceId.get(spaceId)?.capacity ?? 0),
    0,
  );
  const selectedCapacityCoversGuests =
    selectedSpaceIds.length > 0 && selectedCapacity >= requestedGuests;
  const selectedSpacesAreAvailable =
    availability !== null &&
    selectedSpaceIds.every(
      (spaceId) => availabilityBySpaceId.get(spaceId)?.available === true,
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
    mutationFn: () =>
      checkManualBookingAvailabilityApi(selectedPropertyId, {
        from: form.from,
        to: form.to,
        guests: Number(form.guests),
        comfortOption: form.comfortOption,
      }),
    onSuccess: (result) => {
      setAvailability(result);
      setAvailabilityError("");
      setSelectedSpaceIds([]);
    },
    onError: () => {
      setAvailability(null);
      setAvailabilityError("Could not check availability. Try again.");
      setSelectedSpaceIds([]);
    },
  });

  const createBooking = useMutation({
    mutationFn: () => {
      return createManualBookingApi(selectedPropertyId, {
        bookingType: "SINGLE_TARGET",
        bookingOptionId: selectedSpaceIds[0],
        from: form.from,
        to: form.to,
        guests: Number(form.guests),
        comfortOption: form.comfortOption,
        guestName: form.guestName.trim(),
        guestEmail: form.guestEmail.trim().toLowerCase(),
        ...(form.countryCode.trim() &&
          form.contactNumber.trim() && {
            countryCode: form.countryCode.trim(),
            contactNumber: form.contactNumber.trim(),
          }),
        internalNotes: form.internalNotes.trim() || null,
      });
    },
    onSuccess: async (booking) => {
      await queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.operations.bookings(booking.propertyId),
      });
      navigate(adminPath(ADMIN_ROUTES.BOOKINGS));
    },
    onError: () => {
      setSubmitError("Could not create booking. Recheck availability and try again.");
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
    setPropertyId(nextPropertyId);
    setAvailability(null);
    setAvailabilityError("");
    setSubmitError("");
    setSelectedSpaceIds([]);
  };

  const toggleSpace = (spaceId: string) => {
    const rowAvailability = availabilityBySpaceId.get(spaceId);
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
            <div className="mt-2 flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3">
              <FiSearch className="text-slate-400" />
              <input
                value={propertySearch}
                onChange={(event) => setPropertySearch(event.target.value)}
                placeholder="Search property"
                className="min-w-0 flex-1 text-sm outline-none"
              />
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!canCheckAvailability}
                onClick={() => checkAvailability.mutate()}
              >
                {checkAvailability.isPending ? "Checking..." : "Check availability"}
              </Button>
            </div>

            {availabilityError && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {availabilityError}
              </div>
            )}

            <SpaceAvailabilityList
              selectedSpaceIds={selectedSpaceIds}
              availability={availability}
              availabilityBySpaceId={availabilityBySpaceId}
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

function GuestFields({
  form,
  disabled,
  errors,
  onChange,
}: {
  form: ManualBookingForm;
  disabled: boolean;
  errors: GuestFieldErrors;
  onChange: (patch: Partial<ManualBookingForm>) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Guest Details</h3>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Guest name</span>
        <input
          value={form.guestName}
          disabled={disabled}
          onChange={(event) => onChange({ guestName: event.target.value })}
          aria-invalid={errors.guestName ? "true" : "false"}
          className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
            errors.guestName
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {errors.guestName && (
          <span className="mt-1 block text-xs text-red-600">
            {errors.guestName}
          </span>
        )}
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Guest email</span>
        <input
          type="email"
          value={form.guestEmail}
          disabled={disabled}
          onChange={(event) => onChange({ guestEmail: event.target.value })}
          aria-invalid={errors.guestEmail ? "true" : "false"}
          className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
            errors.guestEmail
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {errors.guestEmail && (
          <span className="mt-1 block text-xs text-red-600">
            {errors.guestEmail}
          </span>
        )}
      </label>
      <div className="grid grid-cols-[96px_1fr] gap-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Code</span>
          <input
            value={form.countryCode}
            disabled={disabled}
            onChange={(event) => onChange({ countryCode: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            value={form.contactNumber}
            disabled={disabled}
            onChange={(event) => onChange({ contactNumber: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
    </div>
  );
}

function StayFields({
  form,
  disabled,
  onChange,
}: {
  form: ManualBookingForm;
  disabled: boolean;
  onChange: (patch: Partial<ManualBookingForm>) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Stay Details</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">From</span>
          <input
            type="date"
            value={form.from}
            required
            disabled={disabled}
            onChange={(event) => onChange({ from: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">To</span>
          <input
            type="date"
            value={form.to}
            required
            disabled={disabled}
            onChange={(event) => onChange({ to: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Guests</span>
        <input
          type="number"
          min={1}
          max={20}
          value={form.guests}
          required
          disabled={disabled}
          onChange={(event) => onChange({ guests: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Comfort</span>
        <select
          value={form.comfortOption}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              comfortOption: event.target.value as ManualBookingForm["comfortOption"],
            })
          }
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="NON_AC">Non-AC</option>
          <option value="AC">AC</option>
        </select>
      </label>
    </div>
  );
}

function SpaceAvailabilityList({
  selectedSpaceIds,
  availability,
  availabilityBySpaceId,
  requestedGuests,
  isChecking,
  isSubmitting,
  onToggleSpace,
}: {
  selectedSpaceIds: string[];
  availability: ManualBookingAvailabilityResponse | null;
  availabilityBySpaceId: Map<string, ManualBookingAvailabilityItem>;
  requestedGuests: number;
  isChecking: boolean;
  isSubmitting: boolean;
  onToggleSpace: (spaceId: string) => void;
}) {
  if (isChecking) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
        Checking availability...
      </div>
    );
  }

  if (availability === null) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
        Check availability to see booking options.
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="grid gap-2 xl:grid-cols-2">
        {availability.items.map((item) => (
          <SpaceRow
            key={item.bookingOptionId}
            item={item}
            checked={selectedSpaceIds.includes(item.bookingOptionId)}
            disabled={isSubmitting}
            availability={availabilityBySpaceId.get(item.bookingOptionId) ?? null}
            hasAvailabilityResult={availability !== null}
            requestedGuests={requestedGuests}
            onToggle={() => onToggleSpace(item.bookingOptionId)}
          />
        ))}
      </div>
    </div>
  );
}

function SpaceRow({
  item,
  checked,
  disabled,
  availability,
  hasAvailabilityResult,
  requestedGuests,
  onToggle,
}: {
  item: ManualBookingAvailabilityItem;
  checked: boolean;
  disabled: boolean;
  availability: ManualBookingAvailabilityItem | null;
  hasAvailabilityResult: boolean;
  requestedGuests: number;
  onToggle: () => void;
}) {
  const isAvailable = availability?.available === true;
  const capacity = availability?.capacity ?? null;
  const isGroupCandidate =
    isAvailable && capacity !== null && capacity < requestedGuests;
  const isDisabled = disabled || !isAvailable;
  const statusText = !hasAvailabilityResult
    ? "Check needed"
    : isAvailable
      ? isGroupCandidate
        ? "Group candidate"
        : "Available"
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
            {item.title}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
            {statusText}
          </span>
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          Guest split {item.guestSplit} / Capacity {item.capacity}
        </span>
        {hasAvailabilityResult && capacity !== null && (
          <span className="mt-1 block text-xs text-slate-500">
            Capacity {capacity}
            {availability?.guestCount
              ? ` / priced for ${availability.guestCount} guest${
                  availability.guestCount === 1 ? "" : "s"
                }`
              : ""}
            {isGroupCandidate
              ? ` / needs more rooms for ${requestedGuests} guests`
              : ""}
          </span>
        )}
        {hasAvailabilityResult && availability?.pricePerNight && (
          <span className="mt-1 block text-xs text-slate-500">
            Nightly INR {availability.pricePerNight} / Stay total INR{" "}
            {item.stayTotal}
          </span>
        )}
      </span>
    </label>
  );
}
