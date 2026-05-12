import { ROUTES } from "@/configs/routePaths";
import Button from "@/components/ui/Button";

export default function LocationCTA() {
  return (
    <section className="section bg-[#464453]">
      <div className="container text-center s-lg">
        <h2 className="heading heading-lg text-white">
          Experience the Perfect Location
        </h2>

        <p className="text-slate-300 max-w-2xl mx-auto">
          Discover why thousands choose Sucasa Homes for their serviced
          apartment needs. Flexible stays with premium locations.
        </p>

        <div className="flex justify-center gap-4 pt-6">
          <Button to={ROUTES.ROOMS_TARIFFS} variant="primary" size="lg">
            View Rooms & Pricing
          </Button>

          <Button to={ROUTES.AMENITIES} variant="accent" outline size="lg">
            Explore Amenities
          </Button>
        </div>
      </div>
    </section>
  );
}
