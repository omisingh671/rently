import { FiAlertTriangle } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";

type PaymentFailureStateProps = {
  bookingId: string;
  failureCode: string;
  failureMessage: string;
  onTryAgain: () => void;
};

export function PaymentFailureState({
  bookingId,
  failureCode,
  failureMessage,
  onTryAgain,
}: PaymentFailureStateProps) {
  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-2xl">
        <div className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <FiAlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-black text-slate-900">
            Payment Declined / Attempt Failed
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Your payment attempt was declined by the simulated gateway.
          </p>
          <div className="mx-auto mt-6 w-full max-w-md divide-y divide-slate-200 rounded-2xl border border-red-100 bg-red-50/50 px-5 py-4 text-left">
            <FailureDetail label="Payment Status" value="FAILED" isStatus />
            <FailureDetail label="Failure Code" value={failureCode} />
            <FailureDetail label="Failure Message" value={failureMessage} />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="primary" onClick={onTryAgain}>
              Try Again
            </Button>
            <Button
              to={ROUTES.BOOKING_PAYMENT(bookingId)}
              variant="secondary"
            >
              Change Details
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FailureDetail({
  label,
  value,
  isStatus = false,
}: {
  label: string;
  value: string;
  isStatus?: boolean;
}) {
  return (
    <div className="py-2">
      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </span>
      <p
        className={
          isStatus
            ? "text-sm font-black text-red-700"
            : label === "Failure Code"
              ? "text-sm font-semibold text-slate-700"
              : "text-sm font-medium text-slate-600"
        }
      >
        {value}
      </p>
    </div>
  );
}
