import type { ReactNode } from "react";
import { FiCalendar, FiClock, FiHome, FiUsers } from "react-icons/fi";

import type { Booking } from "../types";

type BookingStaySummaryPanelProps = {
  booking: Booking;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

type DetailItemProps = {
  icon: ReactNode;
  label: string;
  value: string;
  subValue?: string;
};

function DetailItem({ icon, label, value, subValue }: DetailItemProps) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-extrabold text-slate-900">{value}</p>
        {subValue && (
          <p className="text-sm font-medium text-slate-500">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default function BookingStaySummaryPanel({
  booking,
  checkInTimeLabel,
  checkOutTimeLabel,
}: BookingStaySummaryPanelProps) {
  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="border-b border-slate-200 bg-slate-50 px-8 py-5">
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
                subValue={`After ${checkInTimeLabel}`}
              />
              <DetailItem
                icon={<FiUsers className="text-slate-400" />}
                label="Guests"
                value={`${booking.guestCount} Adults`}
                subValue={
                  booking.comfortOption === "AC"
                    ? "AC Premium"
                    : "Non-AC Standard"
                }
              />
            </div>
            <div className="space-y-6">
              <DetailItem
                icon={<FiCalendar className="text-slate-400" />}
                label="Check-out"
                value={formatDate(booking.to)}
                subValue={`Before ${checkOutTimeLabel}`}
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
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
              Items in this booking
            </h3>
            <div className="space-y-3">
              {booking.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-500 shadow-sm">
                      <FiHome />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {item.productName}
                      </p>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {item.targetLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatPrice(item.totalAmount)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                      {formatPrice(item.pricePerNight)} / night
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 flex items-center gap-3 text-lg font-bold text-slate-900">
          <FiUsers className="text-indigo-500" />
          Guest Information
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Guest Name
            </p>
            <p className="font-bold text-slate-900">{booking.guestName}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Email Address
            </p>
            <p className="truncate font-bold text-slate-900">
              {booking.guestEmail}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Phone Number
            </p>
            <p className="font-bold text-slate-900">
              {booking.guestContactNumber ?? "Not provided"}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
