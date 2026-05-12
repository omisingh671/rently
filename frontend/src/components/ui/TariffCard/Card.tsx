"use client";

import {
  RiCheckLine,
  RiArrowRightLine,
  RiUserLine,
  RiGroupLine,
  RiBuildingLine,
} from "react-icons/ri";

import clsx from "clsx";

import Button from "@/components/ui/Button";
import TariffPriceBox from "./TariffPriceBox";
import type { TariffCardProps } from "./types";

const OCCUPANCY_ICON_MAP = {
  single: RiUserLine,
  double: RiGroupLine,
  corporate: RiBuildingLine,
} as const;

export default function TariffCard({
  occupancy,
  title,
  subtitle,
  description,
  prices,
  highlightText,
  features,
  ctaLabel,
  ctaTo,
  onCtaClick,
}: TariffCardProps) {
  const isCorporate = occupancy === "corporate";

  return (
    <div
      className={clsx(
        "relative flex h-full flex-col rounded-3xl px-8 py-10 border shadow-lg transition-all duration-200",
        isCorporate
          ? "bg-amber-100/10 border-slate-300 hover:border-amber-600"
          : "bg-white border-slate-200 hover:border-indigo-600"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span
          className={clsx(
            "mt-1 inline-flex h-12 w-12 items-center justify-center rounded-xl",
            isCorporate
              ? "bg-slate-200 text-slate-600"
              : "bg-indigo-100 text-indigo-600"
          )}
        >
          {(() => {
            const Icon = OCCUPANCY_ICON_MAP[occupancy];
            return <Icon className="h-6 w-6" />;
          })()}
        </span>

        {/* Title + Subtitle */}
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          <p
            className={clsx(
              "mt-1 text-sm font-medium",
              isCorporate ? "text-slate-600" : "text-indigo-600"
            )}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-6 text-sm leading-relaxed text-slate-600">
        {description}
      </p>

      {/* Pricing */}
      <div className="mt-8">
        <TariffPriceBox
          prices={prices}
          variant={isCorporate ? "accent" : "primary"}
        />
      </div>

      {/* Highlight */}
      {highlightText && (
        <p
          className={clsx(
            "mt-6 text-base font-medium",
            isCorporate ? "text-amber-600" : "text-indigo-600"
          )}
        >
          {highlightText}
        </p>
      )}

      {/* Features */}
      <ul className="mt-8 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-start gap-3 text-base text-slate-600"
          >
            <RiCheckLine
              className={clsx(
                "mt-0.5 shrink-0",
                isCorporate ? "text-amber-600" : "text-indigo-600"
              )}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-10">
        <Button
          size="fluid"
          variant={isCorporate ? "dark" : "primary"}
          iconRight={<RiArrowRightLine />}
          to={ctaTo}
          onClick={!ctaTo ? onCtaClick : undefined}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
