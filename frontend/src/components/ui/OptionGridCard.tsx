import { FiCheckCircle, FiUsers } from "react-icons/fi";
import type { AvailabilityOption } from "@/features/availability/domain";

interface OptionGridCardProps {
  option: AvailabilityOption;
  onBook: (option: AvailabilityOption) => void;
  isBooking: boolean;
  formatPrice: (price: number) => string;
}

export const OptionGridCard = ({ option, onBook, isBooking, formatPrice }: OptionGridCardProps) => {
  return (
    <article className="flex min-h-[18rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <FiCheckCircle />
                {option.itemCount} item{option.itemCount === 1 ? "" : "s"}
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {option.comfortOption === "AC" ? "AC" : "Non-AC"}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">{option.title}</h2>
          </div>
        </div>

        <div className="mt-5 mb-auto space-y-3">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <FiUsers className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <span className="block font-medium text-slate-700">
                Fits up to {option.totalCapacity} guests
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm text-slate-600">
            <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
            <div>
              {option.title.toLowerCase().includes("unit") ? (
                <>
                  <span className="block font-medium text-slate-700">Entire space for full privacy</span>
                  <span className="text-xs text-slate-500">No shared areas, perfect for groups</span>
                </>
              ) : (
                <>
                  <span className="block font-medium text-slate-700">Best fit for your stay</span>
                  <span className="text-xs text-slate-500">
                    {option.comfortOption === "AC"
                      ? "Air-conditioned for maximum comfort"
                      : "Well-ventilated budget-friendly rooms"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nightly Rate</div>
            <div className="mt-0.5 text-sm font-bold text-slate-700">
              {option.priceBreakup?.length > 1 ? (
                <span>{option.priceBreakup.map(formatPrice).join(" + ")}</span>
              ) : (
                <span>{formatPrice(option.nightlyTotal)}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Stay</div>
            <div className="mt-0.5 text-lg font-bold text-[rgb(var(--primary)/1)]">{formatPrice(option.stayTotal)}</div>
          </div>
        </div>

        <button
          type="button"
          disabled={isBooking}
          onClick={() => onBook(option)}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBooking ? "Booking..." : "Continue"}
        </button>
      </div>
    </article>
  );
};
