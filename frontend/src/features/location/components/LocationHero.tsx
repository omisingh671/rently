import { Link } from "react-router-dom";
import { MdOutlineLocationOn, MdOutlineDirections } from "react-icons/md";

import { ROUTES } from "@/configs/routePaths";

import Button from "@/components/ui/Button";

export default function LocationHero() {
  const mapEmbedSrc =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.7520087562148!2d78.4552971!3d17.423684899999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb9715676cac57%3A0x9aef7e0e782213ab!2sSUCASA%20HOMES%20(Home%20Away%20From%20Home%20Guests%20Services)!5e0!3m2!1sen!2sin!4v1765882664834!5m2!1sen!2sin";

  const mapDirection =
    "https://www.google.com/maps/dir/?api=1&destination=17.4236849,78.4552971";
  return (
    <section className="section">
      <div className="container grid lg:grid-cols-2 gap-16 items-center">
        <div className="s-lg">
          <span className="badge badge-primary kicker inline-flex items-center gap-2">
            Location
          </span>

          <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-700 text-4xl sm:text-5xl lg:text-6xl">
            Well-Connected.
            <br />
            Calm. <span className="text-amber-400">Convenient.</span>
          </h1>

          <p className="text-slate-700 max-w-xl">
            Located in a peaceful yet well-connected neighbourhood, Sucasa Homes
            gives you easy access to everything you need.
          </p>

          <p className="flex items-center text-sm text-slate-700">
            <MdOutlineLocationOn className="text-base mr-1.5" /> Hyderabad,
            Telangana · Easy access to HITEC City, Airport, and major business
            districts
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button variant="primary" size="lg" to={ROUTES.SPACES}>
              Book Now
            </Button>

            <Button variant="dark" outline size="lg" to={ROUTES.APARTMENTS}>
              Explore Apartments
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div
            className={`w-full aspect-16/10 rounded-2xl overflow-hidden shadow-xl border border-slate-200`}
          >
            <iframe
              src={mapEmbedSrc}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen={true}
              title="Location map"
            />
          </div>

          <div
            className={`md:absolute md:bottom-6 md:left-6 md:z-20 rounded-xl mt-6 md:mt-0 px-3 py-2 md:w-64 shadow-lg backdrop-blur-sm bg-white/80 border border-indigo-500}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700`}
              >
                <MdOutlineLocationOn className="w-4 h-4" />
              </span>

              <div>
                <p className={`text-sm font-semibold text-slate-900`}>
                  Sucasa Homes
                </p>
                <p className={`text-xs text-slate-500`}>Hyderabad, Telangana</p>
              </div>
            </div>

            <Link
              to={mapDirection}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-slate-800 text-white`}
            >
              <MdOutlineDirections className="w-4 h-4 opacity-95" />
              Get Directions
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
