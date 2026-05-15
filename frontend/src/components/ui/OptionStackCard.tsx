import { FiCheckCircle, FiUsers, FiWind, FiSunrise } from "react-icons/fi";
import type { AvailabilityOption } from "@/features/availability/domain";
import { OptionPricePanel } from "@/components/ui/OptionPricePanel";

interface OptionStackCardProps {
  option: AvailabilityOption;
  onBook: (option: AvailabilityOption) => void;
  isBooking: boolean;
  formatPrice: (price: number) => string;
}

export const OptionStackCard = ({ option, onBook, isBooking, formatPrice }: OptionStackCardProps) => {
  return (
    <article className="flex flex-col md:flex-row md:items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      {/* 1. Title & Tags */}
      <div className="flex-[0.8] min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <FiCheckCircle />
            {option.itemCount} item{option.itemCount === 1 ? "" : "s"}
          </div>
          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            option.comfortOption === "AC" 
              ? "bg-blue-50 text-blue-700" 
              : "bg-amber-50 text-amber-700"
          }`}>
            {option.comfortOption === "AC" ? <FiWind /> : <FiSunrise />}
            {option.comfortOption === "AC" ? "AC" : "Non-AC"}
          </div>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">{option.title}</h2>
      </div>

      {/* 2. Features */}
      <div className="mt-6 md:mt-0 md:flex-1 md:border-l md:border-slate-100 md:pl-8 space-y-3">
        <div className="flex items-start gap-3 text-sm text-slate-600">
          <FiUsers className="mt-0.5 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700">Fits up to {option.totalCapacity} guests</span>
        </div>

        <div className="flex items-start gap-3 text-sm text-slate-600">
          <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
          <div>
            {option.title.toLowerCase().includes("unit") ? (
              <span className="block font-medium text-slate-700 leading-tight">Entire space for full privacy</span>
            ) : (
              <div className="leading-tight">
                <span className="block font-medium text-slate-700">Best fit for your stay</span>
                <span className="text-[11px] text-slate-500">
                  {option.comfortOption === "AC" ? "Air-conditioned comfort" : "Well-ventilated budget rooms"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Pricing */}
      <div className="mt-6 md:mt-0 md:flex-[1.2] md:border-l md:border-slate-100 md:px-8">
        <OptionPricePanel
          option={option}
          formatPrice={formatPrice}
          totalClassName="text-indigo-600"
        />
      </div>

      {/* 4. Actions */}
      <div className="mt-6 md:mt-0 md:w-48 md:pl-8 md:border-l md:border-slate-100">
        <button
          type="button"
          disabled={isBooking}
          onClick={() => onBook(option)}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBooking ? "Booking..." : "Continue"}
        </button>
      </div>
    </article>
  );
};
