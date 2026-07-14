type UpiPaymentFormProps = {
  upiId: string;
  error: string | undefined;
  onChange: (value: string) => void;
};

export function UpiPaymentForm({
  upiId,
  error,
  onChange,
}: UpiPaymentFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
          <svg className="h-full w-full text-slate-800" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="none" />
            <rect x="10" y="10" width="20" height="20" fill="currentColor" />
            <rect x="15" y="15" width="10" height="10" fill="white" />
            <rect x="70" y="10" width="20" height="20" fill="currentColor" />
            <rect x="75" y="15" width="10" height="10" fill="white" />
            <rect x="10" y="70" width="20" height="20" fill="currentColor" />
            <rect x="15" y="75" width="10" height="10" fill="white" />
            <rect x="40" y="20" width="10" height="10" fill="currentColor" />
            <rect x="50" y="35" width="15" height="10" fill="currentColor" />
            <rect x="30" y="50" width="10" height="15" fill="currentColor" />
            <rect x="55" y="55" width="10" height="10" fill="currentColor" />
            <rect x="45" y="70" width="20" height="15" fill="currentColor" />
            <rect x="75" y="45" width="15" height="20" fill="currentColor" />
          </svg>
        </div>
        <p className="mt-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
          Scan QR or enter UPI ID
        </p>
      </div>

      <div>
        <label
          htmlFor="upiId"
          className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
        >
          UPI ID / VPA
        </label>
        <input
          id="upiId"
          type="text"
          value={upiId}
          onChange={(event) => onChange(event.target.value)}
          placeholder="john.doe@okaxis"
          className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
          }`}
        />
        {error && <p className="mt-1 text-xs font-bold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
