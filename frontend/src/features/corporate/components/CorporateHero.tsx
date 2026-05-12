import Button from "@/components/ui/Button";
import {
  RiBuildingLine,
  RiHomeOfficeLine,
  RiTimeLine,
  RiGroupLine,
} from "react-icons/ri";

import { ROUTES } from "@/configs/routePaths";
import ChipFeatured from "@/components/ui/ChipFeatured";

const PERFECT_FOR = [
  {
    id: "employee-relocation",
    icon: RiBuildingLine,
    title: "Employee Relocation",
    desc: "Comfortable, fully furnished homes for employees relocating to Hyderabad.",
  },
  {
    id: "corporate-housing",
    icon: RiHomeOfficeLine,
    title: "Corporate Housing Programs",
    desc: "Reliable long-term accommodation solutions tailored for companies.",
  },
  {
    id: "extended-assignments",
    icon: RiTimeLine,
    title: "Extended Work Assignments",
    desc: "Ideal for professionals on long project-based or contractual stays.",
  },
  {
    id: "team-accommodation",
    icon: RiGroupLine,
    title: "Team Accommodations",
    desc: "Spacious setups to house multiple team members comfortably.",
  },
];

export default function CorporateHero() {
  return (
    <section className="section bg-surface overflow-hidden">
      <div className="container grid gap-12 lg:grid-cols-2 items-center">
        <div className="s-lg">
          <span className="badge badge-primary kicker inline-flex items-center gap-2">
            <RiTimeLine className="text-base" /> Extended Stays
          </span>

          <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-800 text-4xl sm:text-5xl lg:text-6xl">
            Long Stays & <br className="hidden md:block" />
            Corporate <span className="text-amber-400">Tie-ups</span>
          </h1>

          <p className="text-muted max-w-xl">
            Whether you're relocating, on an extended work assignment, or
            booking for a team, our service apartments offer the comfort and
            stability you need.
          </p>

          <div className="flex gap-4 pt-4">
            <Button variant="primary" size="lg">
              Request Corporate Quote
            </Button>
            <Button
              to={ROUTES.ROOMS_TARIFFS}
              variant="accent"
              outline
              size="lg"
            >
              View Pricing
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <p className="text-xs uppercase tracking-wide text-muted font-medium">
            Why companies and long-stay guests choose us
          </p>

          {PERFECT_FOR.map((a) => (
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
