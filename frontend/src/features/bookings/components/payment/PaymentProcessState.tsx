import type { ReactNode } from "react";
import { FiAlertTriangle, FiArrowLeft, FiCreditCard, FiLoader } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";

type PaymentProcessStateProps = {
  tone: "loading" | "error" | "info";
  title: string;
  message: string;
  bookingId?: string;
  children?: ReactNode;
};

export function PaymentProcessState({
  tone,
  title,
  message,
  bookingId,
  children,
}: PaymentProcessStateProps) {
  const isError = tone === "error";

  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              isError
                ? "bg-red-50 text-red-500"
                : tone === "loading"
                  ? "bg-indigo-50 text-indigo-500"
                  : "bg-slate-50 text-slate-500"
            }`}
          >
            {tone === "loading" ? (
              <FiLoader className="h-7 w-7 animate-spin" />
            ) : isError ? (
              <FiAlertTriangle className="h-7 w-7" />
            ) : (
              <FiCreditCard className="h-7 w-7" />
            )}
          </div>
          <h1 className="mt-6 text-2xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {children}
            {bookingId && (
              <Button
                to={ROUTES.BOOKING_DETAIL(bookingId)}
                variant="secondary"
                icon={<FiArrowLeft />}
              >
                Booking Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
