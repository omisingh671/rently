import { type TariffPrice, type TariffPriceVariant } from "./types";
import clsx from "clsx";

interface Props {
  prices: TariffPrice[];
  variant?: TariffPriceVariant;
}

const VARIANT_STYLES: Record<
  TariffPriceVariant,
  {
    wrapper: string;
    label: string;
    price: string;
    suffix: string;
    divider: string;
  }
> = {
  neutral: {
    wrapper: "bg-slate-100 border border-slate-200",
    label: "text-slate-600",
    price: "text-slate-800",
    suffix: "bg-slate-300/20 text-slate-800",
    divider: "bg-slate-300/50",
  },

  primary: {
    wrapper: "bg-indigo-50 border border-indigo-200",
    label: "text-slate-700",
    price: "text-indigo-800",
    suffix: "bg-white text-indigo-800",
    divider: "bg-indigo-300/40",
  },

  accent: {
    wrapper: "bg-accent/5 border border-accent/30",
    label: "text-accent",
    price: "text-accent",
    suffix: "bg-amber-300 text-amber-900",
    divider: "bg-accent/30",
  },
};

export default function TariffPriceBox({ prices, variant = "neutral" }: Props) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={clsx("rounded-2xl p-5", styles.wrapper)}>
      <ul className="space-y-3">
        {prices.map((p, index) => (
          <li key={index}>
            <div className="flex items-center justify-between gap-4">
              {/* Left: Label */}
              <div
                className={clsx(
                  "text-xs font-semibold tracking-widest uppercase",
                  styles.label
                )}
              >
                {p.label}
              </div>

              {/* Right: Price + Suffix */}
              <div className="flex items-center gap-2">
                <span className={clsx("text-xl font-extrabold", styles.price)}>
                  {p.price}
                </span>

                {p.suffix && (
                  <span
                    className={clsx(
                      "px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap",
                      styles.suffix
                    )}
                  >
                    {p.suffix}
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            {index !== prices.length - 1 && (
              <div className={clsx("mt-3 h-px", styles.divider)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
