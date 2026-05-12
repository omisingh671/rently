import BookingsList from "@/features/bookings/components/BookingsList";
import { useBookings } from "@/features/bookings/hooks";

export default function BookingsPage() {
  const bookingsQuery = useBookings(true);

  if (bookingsQuery.status === "pending") {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-semibold">Bookings</h1>
        <div>Loading your bookings...</div>
      </div>
    );
  }

  if (bookingsQuery.status === "error") {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-semibold">Bookings</h1>
        <div className="text-red-600">
          Error: {bookingsQuery.error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">Bookings</h1>
      <BookingsList bookings={bookingsQuery.data ?? []} />
    </div>
  );
}
