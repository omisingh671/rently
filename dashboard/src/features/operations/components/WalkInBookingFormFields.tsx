export interface ManualBookingForm {
  guestName: string;
  guestEmail: string;
  countryCode: string;
  contactNumber: string;
  from: string;
  to: string;
  guests: string;
  comfortOption: "AC" | "NON_AC" | "ALL";
  internalNotes: string;
  couponCode: string;
}

export interface GuestFieldErrors {
  guestName?: string;
  guestEmail?: string;
}

interface GuestFieldsProps {
  form: ManualBookingForm;
  disabled: boolean;
  errors: GuestFieldErrors;
  onChange: (patch: Partial<ManualBookingForm>) => void;
}

export function GuestFields({
  form,
  disabled,
  errors,
  onChange,
}: GuestFieldsProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Guest name</span>
        <input
          value={form.guestName}
          disabled={disabled}
          onChange={(event) => onChange({ guestName: event.target.value })}
          aria-invalid={errors.guestName ? "true" : "false"}
          className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
            errors.guestName
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {errors.guestName && (
          <span className="mt-1 block text-xs text-red-600">
            {errors.guestName}
          </span>
        )}
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Guest email</span>
        <input
          type="email"
          value={form.guestEmail}
          disabled={disabled}
          onChange={(event) => onChange({ guestEmail: event.target.value })}
          aria-invalid={errors.guestEmail ? "true" : "false"}
          className={`mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
            errors.guestEmail
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {errors.guestEmail && (
          <span className="mt-1 block text-xs text-red-600">
            {errors.guestEmail}
          </span>
        )}
      </label>
      <div className="grid grid-cols-[96px_1fr] gap-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Code</span>
          <input
            value={form.countryCode}
            disabled={disabled}
            onChange={(event) => onChange({ countryCode: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            value={form.contactNumber}
            disabled={disabled}
            onChange={(event) =>
              onChange({ contactNumber: event.target.value })
            }
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
    </div>
  );
}

interface StayFieldsProps {
  form: ManualBookingForm;
  disabled: boolean;
  onChange: (patch: Partial<ManualBookingForm>) => void;
}

export function StayFields({
  form,
  disabled,
  onChange,
}: StayFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">From</span>
          <input
            type="date"
            value={form.from}
            required
            disabled={disabled}
            onChange={(event) => onChange({ from: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">To</span>
          <input
            type="date"
            value={form.to}
            required
            disabled={disabled}
            onChange={(event) => onChange({ to: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Guests</span>
          <input
            type="number"
            min={1}
            max={20}
            value={form.guests}
            required
            disabled={disabled}
            onChange={(event) => onChange({ guests: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Comfort</span>
          <select
            value={form.comfortOption}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                comfortOption: event.target
                  .value as ManualBookingForm["comfortOption"],
              })
            }
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">All</option>
            <option value="NON_AC">Non-AC</option>
            <option value="AC">AC</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Coupon code</span>
        <input
          type="text"
          value={form.couponCode}
          disabled={disabled}
          placeholder="DISCOUNT20"
          onChange={(event) =>
            onChange({ couponCode: event.target.value.toUpperCase() })
          }
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold uppercase tracking-wider outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
        />
      </label>
    </div>
  );
}
