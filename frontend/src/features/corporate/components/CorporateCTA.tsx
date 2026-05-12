import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";

export default function CorporateCTA() {
  return (
    <section className="section text-center s-lg bg-[#464453] text-white">
      <div className="container text-center s-lg">
        <h2 className="heading heading-lg text-white">
          Ready for Your Long Stay?
        </h2>

        <p className="text-slate-300 max-w-xl mx-auto">
          Get in touch with our corporate team to discuss customized solutions
          for your organization.
        </p>

        <div className="flex justify-center gap-4 pt-6">
          <Button variant="primary" size="lg">
            Request Corporate Quote
          </Button>
          <Button to={ROUTES.APARTMENTS} variant="accent" outline size="lg">
            Explore Apartments
          </Button>
        </div>
      </div>
    </section>
  );
}
