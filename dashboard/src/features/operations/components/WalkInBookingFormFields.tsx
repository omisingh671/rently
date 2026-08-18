import WalkInStayDatePicker from "./WalkInStayDatePicker";
import CountryDialCodeSelect from "./CountryDialCodeSelect";

const editableFieldClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500";

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
          placeholder="e.g. Priya Sharma"
          disabled={disabled}
          onChange={(event) => onChange({ guestName: event.target.value })}
          aria-invalid={errors.guestName ? "true" : "false"}
          className={`${editableFieldClass} focus:ring-2 ${
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
          placeholder="e.g. priya@example.com"
          disabled={disabled}
          onChange={(event) => onChange({ guestEmail: event.target.value })}
          aria-invalid={errors.guestEmail ? "true" : "false"}
          className={`${editableFieldClass} focus:ring-2 ${
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
          <CountryDialCodeSelect
            value={form.countryCode}
            disabled={disabled}
            onChange={(countryCode) => onChange({ countryCode })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            value={form.contactNumber}
            placeholder="e.g. 9876543210"
            disabled={disabled}
            onChange={(event) =>
              onChange({ contactNumber: event.target.value })
            }
            className={editableFieldClass}
          />
        </label>
      </div>
    </div>
  );
}

interface StayFieldsProps {
  form: ManualBookingForm;
  propertyId: string;
  disabled: boolean;
  lockDates?: boolean;
  onChange: (patch: Partial<ManualBookingForm>) => void;
}

export function StayFields({
  form,
  propertyId,
  disabled,
  lockDates = false,
  onChange,
}: StayFieldsProps) {
  return (
    <div className="space-y-4">
      <WalkInStayDatePicker
        propertyId={propertyId}
        from={form.from}
        to={form.to}
        guests={Number(form.guests) || 1}
        comfortOption={form.comfortOption}
        disabled={disabled || lockDates}
        onChange={(from, to) => onChange({ from, to })}
      />
      {lockDates && (
        <p className="rounded-md bg-indigo-50 px-3 py-2 text-xs leading-5 text-indigo-700">
          Stay dates are fixed by the group room hold.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Guests</span>
          <input
            type="number"
            min={1}
            max={20}
            value={form.guests}
            placeholder="e.g. 2"
            required
            disabled={disabled}
            onChange={(event) => onChange({ guests: event.target.value })}
            className={editableFieldClass}
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
            className={editableFieldClass}
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
            className={`${editableFieldClass} font-semibold uppercase tracking-wider`}
        />
      </label>
    </div>
  );
}
