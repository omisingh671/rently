import { FiArrowRight } from "react-icons/fi";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import type { AdminBooking } from "@/features/operations/types";
import {
  formatAmount,
  formatDisplayDate,
  getBookingNightProgress,
  getBookingStayLabel,
  getBookingTargetSummary,
  getGuestAvatarTone,
  getGuestInitials,
  RECENT_BOOKINGS_LIMIT,
} from "../dashboard.helpers";
import { DashboardWidgetCard } from "./DashboardWidgetCard";

type RecentBookingsTableProps = {
  bookings: AdminBooking[];
  propertyId: string;
  isLoading: boolean;
  isError: boolean;
};

export function RecentBookingsTable({
  bookings,
  propertyId,
  isLoading,
  isError,
}: RecentBookingsTableProps) {
  return (
    <DashboardWidgetCard
      title="Recent Bookings"
      subtitle={`Latest ${RECENT_BOOKINGS_LIMIT} booking records`}
      action={
        <Button
          size="sm"
          variant="secondary"
          to={adminPath(ADMIN_ROUTES.BOOKINGS)}
          iconRight={<FiArrowRight />}
        >
          View more
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-5 py-3">Guest</th>
              <th className="whitespace-nowrap px-5 py-3">Stay</th>
              <th className="whitespace-nowrap px-5 py-3">Amount</th>
              <th className="whitespace-nowrap px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!propertyId ? (
              <RecentBookingsEmptyRow message="Create or assign a property to see recent bookings." />
            ) : isLoading ? (
              <RecentBookingsEmptyRow message="Loading recent bookings..." />
            ) : isError ? (
              <RecentBookingsEmptyRow message="Could not load recent bookings." />
            ) : bookings.length === 0 ? (
              <RecentBookingsEmptyRow message="No bookings found yet." />
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-5 py-[18px]">
                    <div className="flex min-w-44 items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${getGuestAvatarTone(
                          booking.guestName,
                        )}`}
                        aria-hidden="true"
                      >
                        {getGuestInitials(booking.guestName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {booking.guestName}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {booking.bookingRef}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-[18px]">
                    <div className="min-w-52">
                      <p className="font-medium text-slate-700">
                        {getBookingStayLabel(booking)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getBookingTargetSummary(booking)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDisplayDate(booking.checkIn)} -{" "}
                        {formatDisplayDate(booking.checkOut)}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-600">
                        {getBookingNightProgress(booking)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-[18px] font-semibold text-slate-900">
                    {formatAmount(booking.totalAmount)}
                  </td>
                  <td className="px-5 py-[18px]">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardWidgetCard>
  );
}

function RecentBookingsEmptyRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
        {message}
      </td>
    </tr>
  );
}
