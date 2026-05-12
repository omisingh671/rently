import TariffCard from "@/components/ui/TariffCard/Card";
import type { TariffCardProps } from "@/components/ui/TariffCard/types";

import { ROUTES } from "@/configs/routePaths";

export default function Tariffs() {
  const TARIFFS: TariffCardProps[] = [
    {
      occupancy: "single",
      title: "Single Occupancy",
      subtitle: "Private Bedroom",

      description: "Comfortable private bedroom ideal for solo guests.",

      prices: [
        {
          label: "Per Night",
          price: "₹1,500",
          suffix: "Non-AC",
        },
        {
          label: "Per Night",
          price: "₹1,750",
          suffix: "With AC",
        },
      ],

      highlightText: "Weekly / Monthly packages available",

      features: [
        "Private bedroom",
        "High-speed Wi-Fi",
        "Daily housekeeping",
        "Full apartment access",
      ],

      ctaLabel: "Check Availability",
      ctaTo: `${ROUTES.SPACES}?occupancy=single`,
    },

    {
      occupancy: "double",
      title: "Double Occupancy",
      subtitle: "Shared Bedroom",

      description: "Shared bedroom option ideal for couples or friends.",

      prices: [
        {
          label: "Per Night",
          price: "₹2,000",
          suffix: "Non-AC",
        },
        {
          label: "Per Night",
          price: "₹2,250",
          suffix: "With AC",
        },
      ],

      highlightText: "Weekly / Monthly discounts available",

      features: [
        "Shared bedroom",
        "High-speed Wi-Fi",
        "Daily housekeeping",
        "Full apartment access",
      ],

      ctaLabel: "Check Availability",
      ctaTo: `${ROUTES.SPACES}?occupancy=double`,
    },

    {
      occupancy: "corporate",
      title: "Long Stay & Corporate",
      subtitle: "Custom Pricing",
      description:
        "Special pricing for extended stays, corporate guests, and bulk bookings.",
      prices: [
        { label: "30+ Nights", price: "On Request" },
        { label: "Corporate Plans", price: "Custom" },
      ],
      highlightText: "Best rates for extended stays",
      features: [
        "Customized pricing",
        "Priority support",
        "Dedicated relationship manager",
        "Ideal for teams & relocations",
      ],
      ctaLabel: "Request Quote",
      ctaTo: `${ROUTES.CONTACT}?intent=quote`,
    },
  ];

  return (
    <section className="section bg-white">
      <div className="container grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {TARIFFS.map((tariff) => (
          <TariffCard
            key={tariff.occupancy}
            occupancy={tariff.occupancy}
            title={tariff.title}
            subtitle={tariff.subtitle}
            description={tariff.description}
            prices={tariff.prices}
            highlightText={tariff.highlightText}
            features={tariff.features}
            ctaLabel={tariff.ctaLabel}
            ctaTo={tariff.ctaTo}
          />
        ))}
      </div>
    </section>
  );
}
