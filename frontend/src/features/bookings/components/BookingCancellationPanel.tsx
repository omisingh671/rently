import {
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

import Button from "@/components/ui/Button";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { getCancellationRefundLabel } from "../bookingDisplay";
import type { Booking } from "../types";

type BookingCancellationPanelProps = {
  booking: Booking;
  canRequestRefund: boolean;
  onRequestRefund: () => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function BookingCancellationPanel({
  booking,
  canRequestRefund,
  onRequestRefund,
}: BookingCancellationPanelProps) {
  if (booking.status !== "CANCELLED" && booking.status !== "NO_SHOW") {
    return null;
  }

  const isNoShow = booking.status === "NO_SHOW";
  const isRefundFulfilled = booking.refundRequest?.status === "FULFILLED";
  const theme = isRefundFulfilled
    ? {
        cardBg: "border-emerald-100 bg-emerald-50",
        heading: "text-emerald-900",
        icon: "text-emerald-500",
        label: "text-emerald-500",
        text: "text-emerald-900",
        subtext: "text-emerald-700",
        button: "primary" as const,
      }
    : {
        cardBg: "border-red-100 bg-red-50",
        heading: "text-red-900",
        icon: "text-red-500",
        label: "text-red-400",
        text: "text-red-900",
        subtext: "text-red-700",
        button: "danger" as const,
      };

  return (
    <section className={`rounded-3xl border p-8 ${theme.cardBg}`}>
      <h2
        className={`mb-4 flex items-center gap-3 text-lg font-bold ${theme.heading}`}
      >
        {isRefundFulfilled ? (
          <FiCheckCircle className={theme.icon} />
        ) : isNoShow ? (
          <FiAlertTriangle className={theme.icon} />
        ) : (
          <FiXCircle className={theme.icon} />
        )}
        {isNoShow ? "No-Show Info" : "Cancellation Info"}
      </h2>

      <div className="space-y-4">
        {booking.cancelledAt && (
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}
            >
              Date Cancelled
            </p>
            <p className={`font-bold ${theme.text}`}>
              {formatDate(booking.cancelledAt)}
            </p>
          </div>
        )}

        <div>
          <p
            className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}
          >
            Refund Status
          </p>
          <p className={`font-bold ${theme.text}`}>
            {getCancellationRefundLabel(booking)}
          </p>
        </div>

        {booking.refundRequest && (
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}
            >
              Refund Request
            </p>
            <p className={`mt-1 text-sm font-semibold ${theme.text}`}>
              {formatEnumLabel(booking.refundRequest.status)}
            </p>
            <p className={`mt-1 text-sm ${theme.subtext}`}>
              {booking.refundRequest.reason}
            </p>
            {booking.refundRequest.adminNote && (
              <p className={`mt-1 text-sm ${theme.subtext}`}>
                Admin note: {booking.refundRequest.adminNote}
              </p>
            )}
          </div>
        )}

        {booking.cancellationReason && (
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}
            >
              Reason
            </p>
            <p className={`mt-1 text-sm italic ${theme.subtext}`}>
              &quot;{booking.cancellationReason}&quot;
            </p>
          </div>
        )}

        {canRequestRefund && (
          <Button
            type="button"
            variant={theme.button}
            size="sm"
            onClick={onRequestRefund}
          >
            Request Refund
          </Button>
        )}
      </div>
    </section>
  );
}
