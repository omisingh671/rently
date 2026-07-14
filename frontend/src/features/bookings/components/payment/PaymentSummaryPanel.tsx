import { FiCalendar, FiUser } from "react-icons/fi";

type PaymentSummaryPanelProps = {
  guestName: string;
  spaceLabel: string;
  stayPeriod: string;
  paymentLabel: string;
  formattedAmount: string;
};

export function PaymentSummaryPanel({
  guestName,
  spaceLabel,
  stayPeriod,
  paymentLabel,
  formattedAmount,
}: PaymentSummaryPanelProps) {
  return (
    <aside className="space-y-6 lg:col-span-5">
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="border-b border-slate-100 pb-4 text-xs font-bold tracking-wider text-slate-900 uppercase">
          Stay Summary
        </h3>
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Guest Details
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-800">
              <FiUser className="text-slate-400" /> {guestName}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Selected Space
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">
              {spaceLabel}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Stay Period
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FiCalendar className="text-slate-400" /> {stayPeriod}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <span className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Total Amount
              </span>
              <span className="mt-0.5 text-[10px] font-semibold tracking-widest text-indigo-500 uppercase">
                {paymentLabel}
              </span>
            </div>
            <span className="text-2xl font-black text-slate-900">
              {formattedAmount}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
