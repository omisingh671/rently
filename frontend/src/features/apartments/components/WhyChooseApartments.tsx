import {
  RiWifiLine,
  RiBrushLine,
  RiHome4Line,
  RiStarSmileLine,
} from "react-icons/ri";

import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";
import IconBadge from "@/components/ui/IconBadge";

export default function WhyChooseApartments() {
  return (
    <section className="section bg-[#464453] text-white relative">
      <div className="container py-20 grid lg:grid-cols-2 gap-14 items-center">
        {/* Left */}
        <div>
          <div className="kicker text-indigo-300">Why Choose Us</div>

          <h2 className="heading heading-lg mt-3 text-white">
            More Than <span className="text-amber-400">Just Apartments</span>
          </h2>

          <p className="text-sm text-indigo-100/80 mt-4 max-w-lg">
            We've created spaces where you can truly feel at home. Every detail
            — from the furniture to the service — is designed with your comfort
            in mind.
          </p>

          <ul className="mt-6 space-y-4 text-sm text-indigo-100">
            <li className="flex gap-4 items-center">
              <IconBadge
                icon={RiHome4Line}
                variant="flat"
                color="text-amber-300"
                bg="bg-amber-300/15"
              />
              Feel at home, not in a hotel
            </li>

            <li className="flex gap-4 items-center">
              <IconBadge
                icon={RiWifiLine}
                variant="flat"
                color="text-indigo-300"
                bg="bg-indigo-300/15"
              />
              High-speed Wi-Fi & utilities included
            </li>

            <li className="flex gap-4 items-center">
              <IconBadge
                icon={RiBrushLine}
                variant="flat"
                color="text-emerald-300"
                bg="bg-emerald-300/15"
              />
              Daily housekeeping & 24/7 support
            </li>
          </ul>

          <div className="mt-8 flex gap-3">
            <Button variant="primary" size="lg" to={ROUTES.ROOMS_TARIFFS}>
              Explore Pricing →
            </Button>

            <Button variant="accent" outline size="lg" to={ROUTES.AMENITIES}>
              See All Amenities
            </Button>
          </div>
        </div>

        {/* Right */}
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatItem
              icon={
                <IconBadge
                  icon={RiHome4Line}
                  variant="flat"
                  color="text-indigo-300"
                  bg="bg-indigo-300/15"
                />
              }
              value="8+"
              label="Premium Apartments"
            />

            <StatItem
              icon={
                <IconBadge
                  icon={RiStarSmileLine}
                  variant="flat"
                  color="text-amber-300"
                  bg="bg-amber-300/15"
                />
              }
              value="4.9"
              label="Guest Rating"
            />
          </div>

          <div className="rounded-xl border border-white/15 bg-white/8 p-6 backdrop-blur-sm">
            <p className="text-sm text-indigo-100 italic">
              “It truly felt like coming home. The apartment was immaculate, and
              the support team was incredibly responsive.”
            </p>
            <div className="mt-3 text-sm font-semibold text-white">
              — Satisfied Guest
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 py-4 px-6 rounded-xl bg-white/8 border border-white/15 backdrop-blur-sm">
      {icon}
      <div>
        <p className="text-2xl font-semibold leading-none text-white">
          {value}
        </p>
        <p className="text-sm text-indigo-200/80 mt-1">{label}</p>
      </div>
    </div>
  );
}
