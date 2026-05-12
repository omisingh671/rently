import React from "react";
import {
  FiGrid,
  FiCoffee,
  FiHome,
  FiDroplet,
  FiSun,
  FiLayers,
} from "react-icons/fi";

import IconBadge from "@/components/ui/IconBadge";

type Feature = {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: string;
  bg?: string;
};

type DesignedForLivingProps = {
  className?: string;
  imageSrc?: string;
  kicker?: string;
  title?: React.ReactNode;
  description?: string;
  features?: Feature[];
  quote?: string;
};

const defaultFeatures: Feature[] = [
  {
    icon: FiGrid,
    title: "Spacious Living Room",
    subtitle: "Sofa, TV & Large Windows",
    color: "text-indigo-600",
    bg: "bg-indigo-50 ring-indigo-100",
  },
  {
    icon: FiLayers,
    title: "Dining Area",
    subtitle: "4-6 Seater Table",
    color: "text-emerald-600",
    bg: "bg-emerald-50 ring-emerald-100",
  },
  {
    icon: FiCoffee,
    title: "Fully Functional Kitchen",
    subtitle: "Stove, Fridge & Utensils",
    color: "text-amber-600",
    bg: "bg-amber-50 ring-amber-100",
  },
  {
    icon: FiHome,
    title: "3 Furnished Bedrooms",
    subtitle: "With Wardrobes",
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50 ring-fuchsia-100",
  },
  {
    icon: FiDroplet,
    title: "Clean Bathrooms",
    subtitle: "Well-maintained & Hygienic",
    color: "text-sky-600",
    bg: "bg-sky-50 ring-sky-100",
  },
  {
    icon: FiSun,
    title: "Balcony",
    subtitle: "In Select Units",
    color: "text-rose-600",
    bg: "bg-rose-50 ring-rose-100",
  },
];

const roomImage = "/assets/images/sucasa-homes/living-area.jpg";

export default function Inside3BHK({
  className = "",
  imageSrc = roomImage,
  kicker = "INSIDE YOUR 3BHK",
  title = (
    <>
      Thoughtfully Designed for
      <br />
      Living
    </>
  ),
  description = `Every apartment is designed so you can simply unpack and start living. No cramped hotel rooms—just open, airy spaces that feel like home.`,
  features = defaultFeatures,
  quote = `“Spacious enough for the whole family.”`,
}: DesignedForLivingProps) {
  return (
    <section className={`section bg-white ${className}`}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 lg:col-span-5">
            <div className="max-w-lg">
              <div className="kicker text-indigo-500 mb-4">{kicker}</div>

              <h3 className="heading heading-lg text-slate-700 mb-6">
                {title}
              </h3>

              <p className="text-muted text-lg mb-8">{description}</p>

              <div className="space-y-6">
                {features.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4"
                    aria-hidden={false}
                  >
                    <IconBadge
                      icon={f.icon}
                      size="lg"
                      layout="square"
                      color={f.color ?? "text-indigo-700"}
                      bg={f.bg ?? "bg-surface-3 ring-indigo-100"}
                    />

                    <div>
                      <div className="font-heading font-semibold text-lg text-slate-800">
                        {f.title}
                      </div>
                      {f.subtitle && (
                        <div className="text-sm text-muted mt-1">
                          {f.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-6 lg:col-span-7">
            <div
              className="relative h-auto md:min-h-80 rounded-2xl overflow-hidden shadow-2xl"
              aria-hidden={false}
            >
              <img
                src={imageSrc}
                alt="Apartment interior"
                className="w-full h-full object-cover block"
                style={{ aspectRatio: "16/12" }}
              />

              {/* dark gradient overlay for readability */}
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.45) 100%)",
                }}
              />

              {/* quote at bottom-left */}
              <div className="absolute left-6 bottom-6">
                <div className="float-badge">{quote}</div>
              </div>

              {/* soft card shadow outline (for the floating look) */}
              <div
                className="absolute -inset-2 rounded-2xl pointer-events-none"
                style={{
                  boxShadow:
                    "0 20px 40px rgba(2,6,23,0.12), 0 6px 18px rgba(2,6,23,0.06)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
