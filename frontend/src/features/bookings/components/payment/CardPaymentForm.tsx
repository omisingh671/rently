import type { ChangeEvent } from "react";

type CardPaymentFormProps = {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  errors: Readonly<Record<string, string>>;
  onCardNameChange: (value: string) => void;
  onCardNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onExpiryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCvvChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const getInputClassName = (hasError: boolean) =>
  `w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
  }`;

export function CardPaymentForm({
  cardName,
  cardNumber,
  expiry,
  cvv,
  errors,
  onCardNameChange,
  onCardNumberChange,
  onExpiryChange,
  onCvvChange,
}: CardPaymentFormProps) {
  return (
    <div className="space-y-6">
      <div className="relative mx-auto flex h-48 w-full max-w-sm flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="z-10 flex items-center justify-between">
          <div className="relative flex h-8 w-12 items-center justify-center rounded-md bg-amber-400/80 opacity-80">
            <div className="absolute inset-1 rounded-sm border border-amber-600/30" />
          </div>
          <span className="text-lg font-black tracking-widest text-slate-400">
            VISA
          </span>
        </div>
        <div className="z-10 my-4 font-mono text-xl font-bold tracking-[0.2em]">
          {cardNumber || "•••• •••• •••• ••••"}
        </div>
        <div className="z-10 flex items-end justify-between">
          <div className="max-w-[70%]">
            <div className="text-[9px] font-semibold tracking-widest text-slate-400 uppercase">
              Cardholder
            </div>
            <div className="truncate text-sm font-bold tracking-wide">
              {cardName.toUpperCase() || "NAME SURNAME"}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold tracking-widest text-slate-400 uppercase">
              Expires
            </div>
            <div className="font-mono text-sm font-bold tracking-wide">
              {expiry || "MM/YY"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <PaymentInput
          id="cardName"
          label="Cardholder Name"
          type="text"
          value={cardName}
          placeholder="John Doe"
          error={errors.cardName}
          onChange={(event) => onCardNameChange(event.target.value)}
        />
        <PaymentInput
          id="cardNumber"
          label="Card Number"
          type="text"
          value={cardNumber}
          placeholder="4111 1111 1111 1111"
          error={errors.cardNumber}
          onChange={onCardNumberChange}
        />
        <div className="grid grid-cols-2 gap-4">
          <PaymentInput
            id="expiry"
            label="Expiry Date"
            type="text"
            value={expiry}
            placeholder="MM/YY"
            error={errors.expiry}
            onChange={onExpiryChange}
          />
          <PaymentInput
            id="cvv"
            label="CVV"
            type="password"
            value={cvv}
            placeholder="•••"
            error={errors.cvv}
            onChange={onCvvChange}
          />
        </div>
      </div>
    </div>
  );
}

function PaymentInput({
  id,
  label,
  type,
  value,
  placeholder,
  error,
  onChange,
}: {
  id: string;
  label: string;
  type: "password" | "text";
  value: string;
  placeholder: string;
  error: string | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={getInputClassName(Boolean(error))}
      />
      {error && <p className="mt-1 text-xs font-bold text-red-600">{error}</p>}
    </div>
  );
}
