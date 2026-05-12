import { FiCheckCircle, FiClock, FiShield, FiHome } from "react-icons/fi";

import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";
import ChipFeatured from "@/components/ui/ChipFeatured";

const highlights = [
  {
    id: "managed",
    icon: FiHome,
    title: "Fully Managed Living",
    desc: "Housekeeping, utilities, and essentials handled",
  },
  {
    id: "flexible",
    icon: FiClock,
    title: "Flexible Stay Options",
    desc: "Ideal for short stays and long-term living",
  },
  {
    id: "reliable",
    icon: FiCheckCircle,
    title: "Hassle-Free Experience",
    desc: "Move in with zero setup or coordination",
  },
  {
    id: "secure",
    icon: FiShield,
    title: "Safe & Reliable",
    desc: "Professionally maintained apartments",
  },
];

export default function AmenitiesHero() {
  return (
    <section className="section bg-surface overflow-hidden">
      <div className="container grid gap-12 lg:grid-cols-2 items-center">
        <div className="text-center lg:text-left">
          <span className="badge badge-primary kicker inline-flex items-center gap-2">
            <FiCheckCircle className="text-base" /> Living Essentials
          </span>

          <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-700 text-4xl sm:text-5xl lg:text-6xl">
            <span className="text-amber-400">Everything</span>{" "}
            <br className="hidden md:block" /> You Need, Already Here
          </h1>

          <p className="text-sm sm:text-base text-indigo-700 mt-5 leading-relaxed font-bold">
            Just bring your suitcase. The rest is taken care of.
          </p>

          <p className="text-sm sm:text-base text-slate-700 mt-5 leading-relaxed">
            Our serviced apartments are thoughtfully equipped to ensure comfort,
            convenience, and peace of mind — whether you are staying for a few
            days or several months.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button variant="primary" size="lg" to={ROUTES.ROOMS_TARIFFS}>
              Rooms & Tariffs
            </Button>

            <Button variant="dark" outline size="lg" to={ROUTES.CONTACT}>
              Talk to Us
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <p className="text-xs uppercase tracking-wide text-muted font-medium">
            Why guests choose us
          </p>
          {highlights.map((a) => (
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
