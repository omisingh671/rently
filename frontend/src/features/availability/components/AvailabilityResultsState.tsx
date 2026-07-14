type AvailabilityResultsStateProps = {
  bookingError: string | null;
  canCheckAvailability: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  hasOptions: boolean;
};

export default function AvailabilityResultsState({
  bookingError,
  canCheckAvailability,
  isFetching,
  errorMessage,
  hasOptions,
}: AvailabilityResultsStateProps) {
  let stateContent = null;

  if (!canCheckAvailability) {
    stateContent = (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          Select stay dates
        </h2>
        <p className="mt-2 text-sm text-muted">
          Enter check-in, check-out, and guest count to see booking options.
        </p>
      </div>
    );
  } else if (isFetching) {
    stateContent = (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-muted">
        Checking availability for your stay...
      </div>
    );
  } else if (errorMessage) {
    stateContent = (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-red-900">
          Unable to check availability
        </h2>
        <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
      </div>
    );
  } else if (!hasOptions) {
    stateContent = (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          No booking options available
        </h2>
        <p className="mt-2 text-sm text-muted">
          Try different dates, guest count, or comfort selection.
        </p>
      </div>
    );
  }

  if (!bookingError && !stateContent) {
    return null;
  }

  return (
    <>
      {bookingError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {bookingError}
        </div>
      )}
      {stateContent}
    </>
  );
}
