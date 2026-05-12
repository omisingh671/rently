import BookingsList from "@/features/bookings/components/BookingsList";
import { useBookings } from "@/features/bookings/hooks";

export default function MyBookings() {
  const bookingsQuery = useBookings(true);

  if (bookingsQuery.status === "pending") {
    return (
      <div>
        <h2 className="mb-2 text-2xl font-semibold">My Bookings</h2>
        <p className="text-slate-500">Loading your bookings...</p>
      </div>
    );
  }

  if (bookingsQuery.status === "error") {
    return (
      <div>
        <h2 className="mb-2 text-2xl font-semibold">My Bookings</h2>
        <p className="text-red-600">{bookingsQuery.error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">My Bookings</h2>
      <BookingsList bookings={bookingsQuery.data ?? []} />
    </div>
  );
}
