import { MdHome } from "react-icons/md";
import { FiWifi, FiZap, FiArrowUp, FiTruck } from "react-icons/fi";

import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";
import ChipFeatured from "@/components/ui/ChipFeatured";

const apartmentFeatures = [
  {
    id: "wifi",
    icon: FiWifi,
    title: "High-speed Wi-Fi",
    desc: "Seamless connectivity for work & streaming",
  },
  {
    id: "power",
    icon: FiZap,
    title: "Power backup",
    desc: "Uninterrupted power for your comfort",
  },
  {
    id: "lift",
    icon: FiArrowUp,
    title: "Lift access",
    desc: "Easy access to all floors",
  },
  {
    id: "parking",
    icon: FiTruck,
    title: "Parking",
    desc: "Subject to availability",
  },
];

export default function ApartmentsHero() {
  return (
    <section className="section bg-surface overflow-hidden">
      <div className="container grid gap-12 lg:grid-cols-2 items-center">
        {/* LEFT: Content */}
        <div className="text-center lg:text-left">
          <span className="badge badge-primary kicker inline-flex items-center gap-2">
            <MdHome className="text-base" /> Accommodation
          </span>

          <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-700 text-4xl sm:text-5xl lg:text-6xl">
            Our <span className="text-amber-400">3BHK</span>{" "}
            <br className="hidden md:block" />
            Service Apartments
          </h1>

          <p className="text-sm sm:text-base text-muted mt-5 leading-relaxed">
            All eight apartments at Sucasa Homes follow a standard layout with
            airy rooms, modern fittings, and warm interiors. Whether you're
            booking a single room or double occupancy, you share access to
            spacious common areas that make your stay feel like home.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button variant="primary" size="lg" to={ROUTES.SPACES}>
              Book a Room
            </Button>

            <Button variant="dark" outline size="lg" to={ROUTES.CONTACT}>
              Talk to Us
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          {apartmentFeatures.map((a) => (
            <ChipFeatured
              key={a.id}
              id={a.id}
              icon={a.icon}
              title={a.title}
              desc={a.desc}
              size="md"
              isDark={false}
              cardBg="bg-indigo-100/50"
              borderClass="border border-indigo-200"
              iconBg="bg-indigo-200 text-indigo-700"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
