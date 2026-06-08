import {
  FiBookOpen,
  FiHome,
  FiSunrise,
  FiUsers,
  FiWind,
  FiX,
} from "react-icons/fi";
import type {
  AvailabilityAmenity,
  AvailabilityOption,
} from "@/features/availability/domain";
import Modal from "@/components/ui/Modal";

interface OptionDetailsModalProps {
  option: AvailabilityOption;
  isOpen: boolean;
  onClose: () => void;
  formatPrice: (price: number) => string;
}

const getDistinctAmenities = (
  option: AvailabilityOption,
): AvailabilityAmenity[] => {
  const amenities = new Map<string, AvailabilityAmenity>();

  for (const item of option.items) {
    for (const amenity of item.amenities) {
      amenities.set(amenity.id, amenity);
    }

    for (const room of item.rooms) {
      for (const amenity of room.amenities) {
        amenities.set(amenity.id, amenity);
      }
    }
  }

  return [...amenities.values()];
};

const formatGuests = (count: number) =>
  `${count} guest${count === 1 ? "" : "s"}`;

export const OptionDetailsModal = ({
  option,
  isOpen,
  onClose,
  formatPrice,
}: OptionDetailsModalProps) => {
  const amenities = getDistinctAmenities(option);
  const optionGuestSplitParts = option.guestSplitParts ?? [];
  const guestSplitParts =
    optionGuestSplitParts.length > 0
      ? optionGuestSplitParts
      : option.guestSplit
          .split("+")
          .map((part) => Number(part.trim()))
          .filter((part) => Number.isFinite(part));
  const requestedGuests =
    option.requestedGuests ??
    guestSplitParts.reduce((total, count) => total + count, 0) ??
    option.totalCapacity;
  const spareCapacity =
    option.spareCapacity ?? Math.max(0, option.totalCapacity - requestedGuests);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        option.optionType === "ROOM"
          ? "Room details"
          : "Package details"
      }
      size="lg"
    >
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <FiX className="h-5 w-5" />
      </button>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <h3 className="text-base font-bold text-slate-900">{option.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
              <FiUsers />
              {formatGuests(requestedGuests)} requested
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              <FiUsers />
              Capacity {formatGuests(option.totalCapacity)}
              {spareCapacity > 0
                ? ` · ${formatGuests(spareCapacity)} spare`
                : ""}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                option.comfortOption === "AC"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {option.comfortOption === "AC" ? <FiWind /> : <FiSunrise />}
              {option.comfortOption === "AC" ? "AC included" : "Non-AC"}
            </span>
          </div>
          <div className="mt-3 space-y-1 text-sm font-semibold text-slate-700">
            <div className="flex items-start gap-2">
              <FiBookOpen className="mt-0.5 shrink-0 text-slate-400" />
              <span>Includes: {option.includedLabel || option.title}</span>
            </div>
            <div className="flex items-start gap-2">
              <FiBookOpen className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                Guest split: {guestSplitParts.join(" + ")}{" "}
                {guestSplitParts.length === 1 ? "guest" : "guests"}
              </span>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            Amenities
          </div>
          {amenities.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenities.map((amenity) => (
                <span
                  key={amenity.id}
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                >
                  {amenity.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Amenities not listed for this option.
            </p>
          )}
        </section>

        <div className="space-y-3">
          {option.items.map((item) => (
            <section
              key={`${item.targetType}-${item.roomId ?? item.unitId}`}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <FiHome className="text-slate-400" />
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    {item.productName}
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                    <div>
                      Allocated: {item.guestCount} guest
                      {item.guestCount === 1 ? "" : "s"}
                    </div>
                    <div>
                      Capacity: {item.capacity} guest
                      {item.capacity === 1 ? "" : "s"}
                    </div>
                    <div>
                      Priced as: {item.priceGuestCount} guest
                      {item.priceGuestCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className="text-sm font-bold text-slate-800">
                  <span className="font-normal text-slate-500">Rate: </span>
                  {formatPrice(item.pricePerNight)}
                  <span className="font-normal text-slate-400">/night</span>
                </div>
              </div>

              {item.rooms.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="mb-2 text-xs font-bold uppercase text-slate-500">
                    Rooms included
                  </div>
                  <div className="space-y-2">
                    {item.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              {room.label}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Capacity {room.capacity}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                              room.hasAC
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {room.hasAC ? "AC" : "Non-AC"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};
