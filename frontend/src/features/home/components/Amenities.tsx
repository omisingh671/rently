import React from "react";
import clsx from "clsx";
import {
  FiWifi,
  FiTruck,
  FiLock,
  FiSquare,
  FiTool,
  FiUser,
} from "react-icons/fi";
import { GiWaterDrop, GiStairs } from "react-icons/gi";

import ChipFeatured from "@/components/ui/ChipFeatured";

type Variant = "light" | "dark";

type Amenity = {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
};

const AMENITIES: Amenity[] = [
  {
    id: "wifi",
    icon: <FiWifi />,
    title: "High-speed Wi-Fi",
    desc: "Seamless connectivity for work & streaming",
  },
  {
    id: "housekeeping",
    icon: <FiUser />,
    title: "Housekeeping service",
    desc: "Regular cleaning and linen refresh",
  },
  {
    id: "power",
    icon: <FiTruck />,
    title: "Power backup",
    desc: "Uninterrupted power for your comfort",
  },
  {
    id: "water",
    icon: <GiWaterDrop />,
    title: "RO drinking water",
    desc: "Safe drinking water in every unit",
  },
  {
    id: "lift",
    icon: <GiStairs />,
    title: "Lift access",
    desc: "Easy access to all floors",
  },
  {
    id: "security",
    icon: <FiLock />,
    title: "24×7 building security",
    desc: "Round-the-clock building security & CCTV",
  },
  {
    id: "parking",
    icon: <FiSquare />,
    title: "Parking",
    desc: "Subject to availability",
  },
  {
    id: "linen",
    icon: <FiTool />,
    title: "Fresh linen & toiletries",
    desc: "Essentials provided and replaced as needed",
  },
];

export interface AmenitiesSectionProps {
  variant?: Variant;
  className?: string;
}

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({
  variant = "light",
  className,
}) => {
  const isDark = variant === "dark";

  const sectionBg = isDark
    ? "bg-[#120b49] text-white"
    : "bg-white text-slate-900";
  const mutedText = isDark ? "text-indigo-100/85" : "text-slate-600";
  const cardBg = isDark
    ? "bg-[#4533e6]/20 border-[#6a56ff]/20"
    : "bg-white border-indigo-100";
  const iconBg = isDark
    ? "bg-white/10 text-amber-300"
    : "bg-indigo-50 text-indigo-600";
  const borderClass = isDark ? "border-transparent" : "border";

  return (
    <section className={clsx(sectionBg, "py-16 lg:py-24", className)}>
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left column */}
          <div className="lg:col-span-1">
            <div className="inline-flex items-center gap-3 mb-4">
              <span
                className={clsx(
                  "w-12 h-0.5 block rounded-full",
                  isDark ? "bg-amber-400/80" : "bg-indigo-500"
                )}
              />
              <span
                className={clsx(
                  "text-sm font-semibold uppercase",
                  isDark ? "text-amber-200" : "text-indigo-600"
                )}
              >
                Amenities
              </span>
            </div>

            <h2
              className={clsx(
                "text-4xl md:text-5xl font-extrabold leading-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Everything You Need,
              <span
                className={clsx(
                  "block",
                  isDark ? "text-amber-300" : "text-amber-500"
                )}
              >
                Already Here
              </span>
            </h2>

            <p className={clsx("mt-6 text-lg", mutedText)}>
              Just bring your suitcase. The rest is taken care of.
            </p>

            <div
              className={clsx(
                "flex items-center mt-8 md:mt-12 rounded-xl p-4 shadow-sm",
                isDark
                  ? "bg-white/6 border-white/6"
                  : "bg-slate-50 border-slate-100"
              )}
            >
              <FiUser
                className={clsx(
                  "flex-none w-12 h-12 inline-block rounded-lg p-2 mr-4",
                  isDark ? "bg-amber-400/80" : "bg-slate-200"
                )}
              />
              <span
                className={clsx(
                  "text-base",
                  isDark ? "text-indigo-100/85" : "text-slate-700"
                )}
              >
                We've thought of every detail so you don’t have to. Settle in
                from day one.
              </span>
            </div>
          </div>

          {/* Right column: amenities grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AMENITIES.map((a) => (
                <ChipFeatured
                  key={a.id}
                  icon={a.icon}
                  title={a.title}
                  desc={a.desc}
                  isDark={true}
                  cardBg={cardBg}
                  borderClass={borderClass}
                  iconBg={iconBg}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AmenitiesSection;
