import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";

export default function AmenitiesCTA() {
  return (
    <section className="section bg-[#464453]">
      <div className="container text-center">
        <h2 className="heading heading-lg text-white">
          Want to See These Amenities in Person?
        </h2>
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-slate-300 mt-4">
            Explore our apartments, check room availability, or get in touch
            with our team for personalized assistance.
          </p>
        </div>

        <div className="mt-10 flex justify-center gap-4 flex-wrap">
          <Button to={ROUTES.APARTMENTS} variant="primary" size="lg">
            View Apartments
          </Button>

          <Button to={ROUTES.ROOMS_TARIFFS} variant="accent" outline size="lg">
            Check Rooms & Tariffs
          </Button>
        </div>
      </div>
    </section>
  );
}
