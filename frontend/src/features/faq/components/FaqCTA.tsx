import Button from "@/components/ui/Button";
import { FaWhatsapp } from "react-icons/fa";

import { ROUTES } from "@/configs/routePaths";
import { SUPPORT_PHONE_WA } from "@/configs/appConfig";

export default function FaqCTA() {
  return (
    <section className="section bg-[#464453] text-white relative">
      <div className="container text-center s-lg">
        <h2 className="heading heading-lg text-white">
          Didn&apos;t find your answer?
        </h2>

        <p className="text-slate-300 max-w-3xl mx-auto">
          Our team is here to help. Get in touch with us for any additional
          questions or concerns.
        </p>

        <div className="flex justify-center gap-4 pt-6">
          <Button
            onClick={() =>
              window.open(`https://wa.me/${SUPPORT_PHONE_WA}`, "_blank")
            }
            variant="success"
            size="lg"
            icon={<FaWhatsapp className="w-5 h-5" />}
          >
            WhatsApp / Call
          </Button>

          <Button to={ROUTES.CONTACT} variant="accent" outline size="lg">
            Write to Us
          </Button>
        </div>
      </div>
    </section>
  );
}
