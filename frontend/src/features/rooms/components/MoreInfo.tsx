import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";

export default function MoreInfo() {
  return (
    <section className="section bg-[#464453] text-white">
      <div className="container text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="heading heading-lg text-white">
            Need More Information?
          </h2>

          <p className="text-sm text-slate-300 mt-4">
            Whether you're planning a short visit or a long-term stay, our team
            is here to help you find the perfect arrangement. Contact us for
            personalized quotes, special rates, or any questions about our rooms
            and amenities.
          </p>

          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Button variant="primary" size="lg" to={ROUTES.AMENITIES}>
              View Amenities
            </Button>

            <Button variant="accent" outline size="lg" to={ROUTES.APARTMENTS}>
              See Apartments
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
