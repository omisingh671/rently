import { Link } from "react-router-dom";
import { FOOTER_NAV, CTA_NAV, LEGAL_NAV } from "@/configs/navConfig";

const logoSrc = "/assets/images/logo-main.png";

export default function Footer() {
  return (
    <footer className="footer footer-border">
      <div className="container py-8 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="h-16 rounded-md overflow-hidden">
              <img
                src={logoSrc}
                alt="Home Away from Home"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <p className="mt-3 text-sm footer-muted sm:max-w-md">
            Comfortable serviced apartments for short and long stays. Friendly
            support, flexible bookings.
          </p>

          <div className="border-t border-white/10 block md:hidden" />
        </div>

        {/* Explore */}
        <div>
          <div className="footer-heading kicker">Explore</div>
          <ul className="mt-3">
            {FOOTER_NAV.map((item) => (
              <li key={item.to} className="md:mb-2">
                <Link
                  to={item.to}
                  className="footer-link text-sm whitespace-nowrap"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact & CTA */}
        <div>
          <div className="footer-heading kicker">Contact</div>

          <div className="mt-3 text-sm">
            <div>
              Email:{" "}
              <a
                className="footer-link"
                href="mailto:laveena@homeawayfromhome.in"
              >
                laveena@homeawayfromhome.in
              </a>
            </div>

            <div className="mt-1">
              Phone:{" "}
              <a className="footer-link" href="tel:+918099480994">
                +91 8099480994
              </a>
            </div>
          </div>

          <div className="flex-nowrap gap-3 mt-4 hidden md:flex">
            {CTA_NAV.map((item) => (
              <Link key={item.to} to={item.to} className="badge-nav">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile CTA */}
      <div className="border-t border-white/10 mb-6 block md:hidden" />
      <div className="flex gap-3 justify-center mb-4 md:hidden">
        {CTA_NAV.map((item) => (
          <Link key={item.to} to={item.to} className="badge-nav">
            {item.label}
          </Link>
        ))}
      </div>

      {/* Bottom */}
      <div className="footer-bottom">
        <div className="container py-4 flex flex-col gap-2 md:flex-row justify-between text-xs">
          <div>
            © {new Date().getFullYear()} Home Away from Home - All rights
            reserved.
          </div>

          <div className="flex items-center gap-3">
            {LEGAL_NAV.map((item) => (
              <Link key={item.to} className="footer-link text-xs" to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
