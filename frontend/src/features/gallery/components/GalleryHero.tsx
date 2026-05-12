import { FiCamera } from "react-icons/fi";

import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";

export default function GaleryHero() {
  return (
    <section className="section bg-surface overflow-hidden">
      <div className="container grid gap-12 lg:grid-cols-2 items-center">
        {/* LEFT */}
        <div className="text-center lg:text-left">
          <span className="badge badge-primary kicker inline-flex items-center gap-2">
            <FiCamera className="text-base" /> Real Apartment Photos
          </span>

          <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-700 text-4xl sm:text-5xl lg:text-6xl">
            See <span className="text-amber-400">Your Space</span>
            <br className="hidden md:block" /> Before You Book
          </h1>

          <p className="text-sm sm:text-base text-slate-700 mt-5 leading-relaxed max-w-xl">
            A glimpse of the bedrooms, common spaces, and the overall apartment
            experience at Sucasa Homes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button variant="primary" size="lg" to={ROUTES.ROOMS_TARIFFS}>
              Rooms & Tariffs
            </Button>

            <Button variant="dark" outline size="lg" to={ROUTES.APARTMENTS}>
              Apartments
            </Button>
          </div>
        </div>

        {/* RIGHT: Artistic Gallery Collage */}
        <div className="relative hidden lg:block h-[520px]">
          {/* Large main image */}
          <img
            src="/assets/images/sucasa-homes/living-area.jpg"
            alt="Living room"
            className="absolute right-0 bottom-0 w-[360px] h-[260px] object-cover rounded-3xl shadow-xl"
          />

          {/* Top image */}
          <img
            src="/assets/images/sucasa-homes/double_occupancy-mobile.jpg"
            alt="Bedroom"
            className="absolute top-0 left-24 w-[220px] h-40 object-cover rounded-2xl shadow-lg"
          />

          {/* Middle image */}
          <img
            src="/assets/images/sucasa-homes/kitchen.jpg"
            alt="Kitchen"
            className="absolute top-32 right-48 w-[250px] h-[180px] object-cover rounded-2xl shadow-lg"
          />

          {/* Small bottom image */}
          <img
            src="/assets/images/sucasa-homes/bathroom.jpg"
            alt="Bathroom"
            className="absolute bottom-0 left-30 w-[180px] h-[195px] object-cover rounded-xl shadow-md"
          />

          {/* Decorative circle */}
          <div className="absolute top-20 right-6 w-24 h-24 rounded-full bg-indigo-100/70" />
        </div>
      </div>
    </section>
  );
}
