import { ICON_REGISTRY } from "@/configs/iconRegistry";
import type {
  ManualBookingAvailabilityItem,
  ManualBookingAvailabilityResponse,
} from "@/features/operations/types";

const { FiCheckCircle, FiUsers, FiInfo, FiCheck, FiWind, FiSun } =
  ICON_REGISTRY;

interface WalkInBookingAvailabilityListProps {
  selectedSpaceIds: string[];
  availability: ManualBookingAvailabilityResponse | null;
  availabilityByOptionId: Map<string, ManualBookingAvailabilityItem>;
  requestedGuests: number;
  isChecking: boolean;
  isSubmitting: boolean;
  onToggleSpace: (spaceId: string) => void;
}

export function WalkInBookingAvailabilityList({
  selectedSpaceIds,
  availability,
  availabilityByOptionId,
  requestedGuests,
  isChecking,
  isSubmitting,
  onToggleSpace,
}: WalkInBookingAvailabilityListProps) {
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
    <div className="max-h-187.5 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="grid gap-2 xl:grid-cols-2">
        {availability.items.map((item) => (
          <SpaceRow
            key={item.bookingOptionId}
            item={item}
            checked={selectedSpaceIds.includes(item.bookingOptionId)}
            disabled={isSubmitting}
            availability={availabilityByOptionId.get(item.bookingOptionId) ?? null}
            hasAvailabilityResult={availability !== null}
            requestedGuests={requestedGuests}
            onToggle={() => onToggleSpace(item.bookingOptionId)}
          />
        ))}
      </div>
    </div>
  );
}

interface SpaceRowProps {
  item: ManualBookingAvailabilityItem;
  checked: boolean;
  disabled: boolean;
  availability: ManualBookingAvailabilityItem | null;
  hasAvailabilityResult: boolean;
  requestedGuests: number;
  onToggle: () => void;
}

function SpaceRow({
  item,
  checked,
  disabled,
  availability,
  hasAvailabilityResult,
  requestedGuests,
  onToggle,
}: SpaceRowProps) {
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

  const baseCardClass =
    "relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 cursor-pointer overflow-hidden";
  const stateClass = checked
    ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-1 ring-indigo-500"
    : isAvailable
      ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      : "border-slate-200 bg-slate-50 opacity-75 cursor-not-allowed";

  const statusClass = !hasAvailabilityResult
    ? "bg-slate-100 text-slate-600"
    : isAvailable
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-red-50 text-red-700 border border-red-200";
  const comfortClass =
    item.comfortOption === "AC"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <label className={`${baseCardClass} ${stateClass}`}>
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}
          >
            {checked && (
              <FiCheck className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            )}
          </div>
          <input
            type="checkbox"
            checked={checked}
            disabled={isDisabled}
            onChange={onToggle}
            className="sr-only"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-base font-bold text-slate-900">
              {item.title}
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${comfortClass}`}
              >
                {item.comfortOption === "AC" ? (
                  <FiWind className="h-3 w-3" />
                ) : (
                  <FiSun className="h-3 w-3" />
                )}
                {item.comfortOption === "AC" ? "AC" : "Non-AC"}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${statusClass}`}
              >
                {statusText}
              </span>
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-start gap-2.5 text-sm">
              <FiUsers className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <span className="block font-medium text-slate-700">
                  Fits up to {item.capacity} guests
                </span>
                {item.guestSplit !== "1" && (
                  <span className="text-xs text-slate-500">
                    Bed distribution: {item.guestSplit}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-sm">
              <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
              <div>
                {item.title.toLowerCase().includes("unit") ? (
                  <>
                    <span className="block font-medium text-slate-700">
                      Entire space for full privacy
                    </span>
                    <span className="text-xs text-slate-500">
                      No shared areas, perfect for groups
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block font-medium text-slate-700">
                      Best fit for your stay
                    </span>
                    <span className="text-xs text-slate-500">
                      Comfortable and well-maintained rooms
                    </span>
                  </>
                )}
              </div>
            </div>

            {hasAvailabilityResult && (
              <div className="flex items-start gap-2.5 text-sm">
                <FiInfo className="mt-0.5 shrink-0 text-slate-400" />
                <div className="text-xs leading-snug text-slate-500">
                  {availability?.guestCount ? (
                    <span className="block">
                      Priced based on {availability.guestCount} guest
                      {availability.guestCount === 1 ? "" : "s"} occupancy.
                    </span>
                  ) : null}
                  {isGroupCandidate && (
                    <span className="mt-1 block font-medium text-amber-700">
                      Needs multiple bookings to cover all {requestedGuests} guests.
                    </span>
                  )}
                  {!availability?.guestCount && !isGroupCandidate && (
                    <span className="block">Standard rate applied.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasAvailabilityResult && availability?.pricePerNight && (
        <div
          className={`mt-2 flex items-center justify-between rounded-lg border p-3 ${checked ? "border-indigo-100 bg-white" : "border-slate-100 bg-slate-50"}`}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nightly Rate
            </div>
            <div className="mt-0.5 font-bold text-slate-900">
              {availability.priceBreakup?.length > 1 ? (
                <span>
                  {availability.priceBreakup
                    .map((price) => `INR ${price}`)
                    .join(" + ")}
                </span>
              ) : (
                <span>INR {availability.pricePerNight}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Stay
            </div>
            <div className="mt-0.5 text-lg font-bold text-indigo-700">
              INR {item.stayTotal}
            </div>
          </div>
        </div>
      )}
    </label>
  );
}
