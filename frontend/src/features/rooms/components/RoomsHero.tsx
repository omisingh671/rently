import {
  RiShieldCheckLine,
  RiPriceTag3Line,
  RiEyeLine,
  RiForbid2Line,
} from "react-icons/ri";

import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";
import ChipFeatured from "@/components/ui/ChipFeatured";

const TRANSPARENCY_POINTS = [
  {
    label: "Simple",
    description: "Straightforward pricing with no unnecessary complexity.",
    icon: RiShieldCheckLine,
  },
  {
    label: "Transparent",
    description: "Clear and upfront rates so you always know what you pay.",
    icon: RiEyeLine,
  },
  {
    label: "No Hidden Charges",
    description: "What you see is what you pay - no surprise fees.",
    icon: RiForbid2Line,
  },
];

export default function RoomsHero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="relative section">
        <div className="container grid gap-12 lg:grid-cols-2 items-center">
          <div className="text-center lg:text-left">
            <span className="badge badge-primary kicker inline-flex items-center gap-2">
              <RiPriceTag3Line className="text-base" />
              Pricing & Availability
            </span>

            <h1 className="my-6 font-heading font-extrabold leading-tight text-slate-800 text-4xl sm:text-5xl lg:text-6xl">
              Rooms and Tariffs
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-slate-600 mx-auto lg:mx-0">
              Choose the perfect accommodation for your stay at Sucasa Homes.
              All rates include Wi-Fi, housekeeping, and access to our premium
              facilities.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="primary" size="lg" to={ROUTES.CONTACT}>
                Talk to Us
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {TRANSPARENCY_POINTS.map((a) => (
              <ChipFeatured
                key={a.label}
                icon={a.icon}
                title={a.label}
                desc={a.description}
                size="md"
                cardBg="bg-indigo-100/50"
                borderClass="border border-indigo-200"
                iconBg="bg-indigo-200 text-indigo-700"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
