import React from "react";
import { Link } from "react-router-dom";
import ChipFeatured from "@/components/ui/ChipFeatured";
import {
  MdBusiness,
  MdLocalHospital,
  MdTrain,
  MdRestaurant,
  MdShoppingBag,
  MdOutlineLocationOn,
  MdOutlineDirections,
} from "react-icons/md";

type Amenity = {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc?: string;
  distance?: string;
};

type LocationSectionProps = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  amenities?: Amenity[];
  variant?: "light" | "dark";
};

const defaultAmenities: Amenity[] = [
  {
    id: "business",
    icon: <MdBusiness className="w-6 h-6" />,
    title: "Business Hubs",
    desc: "Hitech City & Financial Dist.",
  },
  {
    id: "hospitals",
    icon: <MdLocalHospital className="w-6 h-6" />,
    title: "Hospitals",
    desc: "Apollo & Care Hospitals",
  },
  {
    id: "metro",
    icon: <MdTrain className="w-6 h-6" />,
    title: "Metro Station",
    desc: "Easy city-wide connectivity",
  },
  {
    id: "restaurants",
    icon: <MdRestaurant className="w-6 h-6" />,
    title: "Restaurants & Cafés",
    desc: "Walkable dining options",
  },
  {
    id: "grocery",
    icon: <MdShoppingBag className="w-6 h-6" />,
    title: "Grocery & Essentials",
    desc: "Nearby stores for everyday needs",
  },
];

const mapEmbedSrc =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.7520087562148!2d78.4552971!3d17.423684899999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb9715676cac57%3A0x9aef7e0e782213ab!2sSUCASA%20HOMES%20(Home%20Away%20From%20Home%20Guests%20Services)!5e0!3m2!1sen!2sin!4v1765882664834!5m2!1sen!2sin";

const mapDirection =
  "https://www.google.com/maps/dir/?api=1&destination=17.4236849,78.4552971";

const variants = {
  light: {
    sectionBg: "bg-white text-slate-900",
    mutedText: "text-slate-600",
    cardBg: "bg-white border-indigo-100",
    borderClass: "border",
    iconBg: "bg-indigo-50 text-indigo-600",
    chipIsDark: false,
    mapBorder: "border-slate-200",
    mapOverlayBg: "bg-white border-slate-100",
    buttonBg: "bg-slate-800 hover:opacity-90",
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-600",
    kickerColor: "text-indigo-600",
  },

  dark: {
    sectionBg: "bg-[#120b49] text-white",
    mutedText: "text-indigo-100/85",
    cardBg: "bg-[#4533e6]/20 border-[#6a56ff]/20",
    borderClass: "border-transparent",
    iconBg: "bg-white/10 text-amber-300",
    chipIsDark: true,
    mapBorder: "border-[#6a56ff]/20",
    mapOverlayBg: "bg-[#4533e6]/30 border-[#6a56ff]/30 backdrop-blur-sm",
    buttonBg: "bg-white/10 hover:bg-white/20",
    textPrimary: "text-white",
    textSecondary: "text-indigo-100/85",
    kickerColor: "text-indigo-200",
  },
} as const;

export default function Location({
  eyebrow = "LOCATION",
  heading = "Well-Connected. Calm. Convenient.",
  description = "Located in a peaceful residential neighbourhood, Sucasa Homes offers the perfect balance of quiet living and quick access to Hyderabad’s bustling hubs.",
  amenities,
  variant = "light",
}: LocationSectionProps) {
  const theme = variants[variant];
  const items = amenities ?? defaultAmenities;

  return (
    <section className={`section ${theme.sectionBg}`}>
      <div className="container">
        {/* Header */}
        <div>
          <p
            className={`kicker uppercase tracking-wider mb-4 ${theme.kickerColor}`}
          >
            {eyebrow}
          </p>

          <h2 className={`heading heading-lg mb-6 ${theme.textPrimary}`}>
            {heading}
          </h2>

          <p className={`text-lg max-w-3xl mb-6 ${theme.textSecondary}`}>
            {description}
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Amenities List */}
          <div className="lg:col-span-5">
            <div className="space-y-4">
              {items.map((a) => (
                <ChipFeatured
                  key={a.id}
                  icon={a.icon}
                  title={a.title}
                  desc={a.desc ?? ""}
                  isDark={theme.chipIsDark}
                  cardBg={theme.cardBg}
                  borderClass={theme.borderClass}
                  iconBg={theme.iconBg}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 relative">
            <div
              className={`w-full aspect-16/10 rounded-2xl overflow-hidden shadow-xl border ${theme.mapBorder}`}
            >
              <iframe
                src={mapEmbedSrc}
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen={true}
                title="Location map"
              />
            </div>

            <div
              className={`md:absolute md:bottom-6 md:left-6 md:z-20 rounded-xl mt-6 md:mt-0 px-5 py-4 md:w-64 shadow-lg backdrop-blur-sm border ${
                variant === "dark"
                  ? "bg-[#2b1f66]/80 border-[#6a56ff]/40"
                  : "bg-white/95 border-slate-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    variant === "dark"
                      ? "bg-indigo-800 text-amber-300"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <MdOutlineLocationOn className="w-4 h-4" />
                </span>

                <div>
                  <p
                    className={`text-sm font-semibold ${
                      variant === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Sucasa Homes
                  </p>
                  <p
                    className={`text-xs ${
                      variant === "dark"
                        ? "text-indigo-100/90"
                        : "text-slate-500"
                    }`}
                  >
                    Hyderabad, Telangana
                  </p>
                </div>
              </div>

              <Link
                to={mapDirection}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  variant === "dark"
                    ? "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                    : "bg-slate-800 text-white"
                }`}
              >
                <MdOutlineDirections className="w-4 h-4 opacity-95" />
                Get Directions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
