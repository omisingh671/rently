import { FiLoader } from "react-icons/fi";

type PaymentProcessingStateProps = {
  paymentLabel: string;
  formattedAmount: string;
};

export function PaymentProcessingState({
  paymentLabel,
  formattedAmount,
}: PaymentProcessingStateProps) {
  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-3xl">
        <div className="rounded-3xl border border-indigo-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <FiLoader className="h-8 w-8 animate-spin" />
            </div>
            <p className="mt-6 text-xs font-bold tracking-widest text-indigo-500 uppercase">
              {paymentLabel}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Processing payment...
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Please stay on this page while we confirm your payment.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <ProgressStep label="Preparing payment" state="complete" />
            <ProgressStep label="Processing payment" state="active" />
            <ProgressStep label="Confirming booking" state="pending" />
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Amount</span>
              <span className="font-bold text-slate-900">{formattedAmount}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state: "complete" | "active" | "pending";
}) {
  const color =
    state === "complete"
      ? "bg-emerald-500"
      : state === "active"
        ? "bg-indigo-500"
        : "bg-slate-200";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
  );
}
