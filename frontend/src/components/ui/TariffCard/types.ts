export type TariffPriceVariant = "neutral" | "primary" | "accent";

export interface TariffPrice {
  label: string;
  price: string;
  suffix?: string;
}

export interface TariffCardProps {
  occupancy: "single" | "double" | "corporate";
  title: string;
  subtitle: string;
  description: string;

  prices: TariffPrice[];
  highlightText?: string;

  features: string[];

  ctaLabel: string;
  ctaTo?: string;
  onCtaClick?: () => void;
}
