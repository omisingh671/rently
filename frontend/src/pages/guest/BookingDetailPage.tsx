import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiUsers,
  FiTag,
  FiHome,
  FiClock,
  FiCreditCard,
  FiAlertTriangle,
  FiInfo,
} from "react-icons/fi";

import { useBooking } from "@/features/bookings/hooks";
import { ROUTES } from "@/configs/routePaths";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";

const bookingStatusMap: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-indigo-100 text-indigo-700",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBooking(id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-slate-500 font-medium">Fetching your booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-red-100 bg-red-50 p-12 text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Oops! Something went wrong</h2>
          <p className="mt-2 text-slate-600">
            {error instanceof Error ? error.message : "We couldn't find the booking you're looking for."}
          </p>
          <Button onClick={() => navigate(ROUTES.ACCOUNT)} className="mt-8" variant="secondary">
            Back to My Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <FiArrowLeft />
          Back
        </button>
        
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Booking Details
              </h1>
              <StatusBadge
                status={booking.status}
                variantMap={bookingStatusMap}
                className="rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider shadow-sm"
              />
            </div>
            <p className="mt-2 text-slate-500 font-medium">
              Reference: <span className="text-slate-900 font-bold uppercase tracking-wider">{booking.bookingRef}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {booking.status === "PENDING" && (
              <Button to={ROUTES.BOOKING_PAYMENT(booking.id)} variant="primary" size="md" className="shadow-lg shadow-indigo-200">
                <FiCreditCard className="mr-2" />
                Complete Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stay Info Card */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-5">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <FiHome className="text-indigo-500" />
                Stay Details
              </h2>
            </div>
            
            <div className="p-8">
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-6">
                  <DetailItem
                    icon={<FiCalendar className="text-slate-400" />}
                    label="Check-in"
                    value={formatDate(booking.from)}
                    subValue="After 12:00 PM"
                  />
                  <DetailItem
                    icon={<FiUsers className="text-slate-400" />}
                    label="Guests"
                    value={`${booking.guestCount} Adults`}
                    subValue={booking.comfortOption === "AC" ? "AC Premium" : "Non-AC Standard"}
                  />
                </div>
                <div className="space-y-6">
                  <DetailItem
                    icon={<FiCalendar className="text-slate-400" />}
                    label="Check-out"
                    value={formatDate(booking.to)}
                    subValue="Before 11:00 AM"
                  />
                  <DetailItem
                    icon={<FiClock className="text-slate-400" />}
                    label="Booked On"
                    value={formatDate(booking.createdAt)}
                    subValue={formatTime(booking.createdAt)}
                  />
                </div>
              </div>

              <div className="mt-10 border-t border-slate-100 pt-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Items in this booking</h3>
                <div className="space-y-3">
                  {booking.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-indigo-500">
                          <FiHome />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{item.targetLabel}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatPrice(item.totalAmount)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{formatPrice(item.pricePerNight)} / night</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Guest Details */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900 flex items-center gap-3">
              <FiUsers className="text-indigo-500" />
              Guest Information
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Guest Name</p>
                <p className="font-bold text-slate-900">{booking.guestName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Email Address</p>
                <p className="font-bold text-slate-900 truncate">{booking.guestEmail}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Phone Number</p>
                <p className="font-bold text-slate-900">{booking.guestContactNumber ?? "Not provided"}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Pricing & Payment */}
        <div className="space-y-8">
          {/* Pricing Summary */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900 flex items-center gap-3">
              <FiCreditCard className="text-indigo-500" />
              Payment Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Total Stay Price</span>
                <span className="font-bold text-slate-900">{formatPrice(booking.totalPrice + booking.discountAmount)}</span>
              </div>
              
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-sm font-medium text-emerald-600">
                  <div className="flex items-center gap-1.5">
                    <FiTag className="h-3.5 w-3.5" />
                    <span>Discount {booking.couponCode ? `(${booking.couponCode})` : ""}</span>
                  </div>
                  <span className="font-bold">-{formatPrice(booking.discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="flex justify-between text-base font-extrabold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-xl text-indigo-600">{formatPrice(booking.totalPrice)}</span>
                </div>
              </div>

              {booking.status === "PENDING" && booking.paymentPolicy === "TOKEN_AT_BOOKING" && (
                <div className="mt-6 rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Upfront Amount Due</p>
                  <p className="text-2xl font-black text-indigo-900">{formatPrice(booking.upfrontAmount)}</p>
                  <p className="mt-1 text-[10px] text-indigo-500 font-bold uppercase leading-tight">Required to confirm your stay</p>
                </div>
              )}
              
              {booking.remainingPayAtCheckIn > 0 && booking.status !== "PENDING" && booking.status !== "CANCELLED" && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-100">
                  <FiInfo className="mt-0.5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Pay at Property</p>
                    <p className="text-lg font-black text-amber-600">{formatPrice(booking.remainingPayAtCheckIn)}</p>
                    <p className="text-[10px] font-medium text-amber-700 mt-0.5">Pay this balance during check-in</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Cancellation Info */}
          {booking.status === "CANCELLED" && (
            <section className="rounded-3xl border border-red-100 bg-red-50 p-8">
              <h2 className="mb-4 text-lg font-bold text-red-900 flex items-center gap-3">
                <FiXCircle className="text-red-500" />
                Cancellation Info
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Date Cancelled</p>
                  <p className="font-bold text-red-900">{formatDate(booking.cancelledAt!)}</p>
                </div>
                {booking.cancellationReason && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Reason</p>
                    <p className="mt-1 text-sm text-red-700 italic">"{booking.cancellationReason}"</p>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-200">
            <h3 className="font-bold mb-4">Need Help?</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              If you have any questions or need to make changes to your booking, please contact our support team.
            </p>
            <Button variant="secondary" outline className="w-full border-slate-700 text-white hover:bg-slate-800" onClick={() => navigate(ROUTES.CONTACT)}>
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-extrabold text-slate-900">{value}</p>
        {subValue && <p className="text-sm text-slate-500 font-medium">{subValue}</p>}
      </div>
    </div>
  );
}

function FiXCircle(props: any) {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}
