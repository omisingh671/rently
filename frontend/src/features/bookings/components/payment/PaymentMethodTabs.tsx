import { FiCreditCard, FiSmartphone } from "react-icons/fi";

export type PaymentMethodTab = "card" | "upi";

type PaymentMethodTabsProps = {
  activeTab: PaymentMethodTab;
  onChange: (tab: PaymentMethodTab) => void;
};

export function PaymentMethodTabs({
  activeTab,
  onChange,
}: PaymentMethodTabsProps) {
  return (
    <div className="flex border-b border-slate-100 bg-slate-50/50">
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-center text-sm font-bold transition ${
          activeTab === "card"
            ? "border-indigo-600 bg-white text-indigo-600"
            : "border-transparent text-slate-500 hover:text-slate-700"
        }`}
      >
        <FiCreditCard className="h-4 w-4" />
        Credit / Debit Card
      </button>
      <button
        type="button"
        onClick={() => onChange("upi")}
        className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-center text-sm font-bold transition ${
          activeTab === "upi"
            ? "border-indigo-600 bg-white text-indigo-600"
            : "border-transparent text-slate-500 hover:text-slate-700"
        }`}
      >
        <FiSmartphone className="h-4 w-4" />
        UPI Payment
      </button>
    </div>
  );
}
