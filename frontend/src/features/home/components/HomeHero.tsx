import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { FiCalendar, FiHome, FiUsers, FiPackage, FiWifi } from "react-icons/fi";
import { MdCleaningServices, MdWavingHand } from "react-icons/md";

import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { ROUTES } from "@/configs/routePaths";

const heroImg = "/assets/images/sucasa-homes/hero.jpg";

export default function HomeHero() {
  const features = [
    {
      label: "3BHK Apartments",
      icon: <FiHome className="h-4 w-4" />,
    },
    {
      label: "Single & Double Occupancy",
      icon: <FiUsers className="h-4 w-4" />,
    },
    {
      label: "Fully Furnished",
      icon: <FiPackage className="h-4 w-4" />,
    },
    {
      label: "Fast Wi-Fi",
      icon: <FiWifi className="h-4 w-4" />,
    },
    {
      label: "Housekeeping",
      icon: <MdCleaningServices className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <section
        className="relative bg-center bg-cover pt-24 pb-0 -mt-24"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        {/* Subtle dark overlay for text contrast */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-black/80 via-black/35 to-black/5"
        ></div>

        <div className="container relative z-10 py-10 lg:py-24">
          <div className="max-w-5xl text-white">
            <span className="badge badge-default kicker text-primary">
              <MdWavingHand className="text-base" /> WELCOME HOME
            </span>

            {/* Two-line responsive heading */}
            <h1 className="mt-6 font-heading font-extrabold leading-tight text-white text-4xl sm:text-5xl lg:text-6xl">
              Your Space. Your Comfort.
              <br />
              Your <span className="text-amber-300">Hyderabad Home.</span>
            </h1>

            {/* Description */}
            <p className="max-w-3xl mt-6 text-white/85 text-base sm:text-lg">
              Modern, fully furnished 3BHK serviced apartments ideal for short
              and long stays. Enjoy hotel-like amenities with the warmth and
              comfort of home.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
              {/* Primary Button */}

              <Button
                className="w-full sm:w-max sm:inline-flex"
                to={ROUTES.SPACES}
                variant="primary"
                size="lg"
                icon={<FiCalendar />}
              >
                Check Availability
              </Button>

              <Button
                className="w-full sm:w-max sm:inline-flex"
                variant="success"
                outline
                onDark
                size="lg"
                icon={<FaWhatsapp className="w-5 h-5" />}
                onClick={() =>
                  window.open("https://wa.me/8099480994", "_blank")
                }
              >
                WhatsApp / Call
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {features.map((f) => (
                <Chip
                  key={f.label}
                  icon={f.icon}
                  variant="dark"
                  size="lg"
                  onDark
                >
                  {f.label}
                </Chip>
              ))}
            </div>

            <div className="mt-6 text-sm text-white/75">
              Need help?{" "}
              <Link to="/contact" className="underline text-white">
                Contact our support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
