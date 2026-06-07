import Button from "@/components/ui/Button";
import { FaWhatsapp } from "react-icons/fa";
import { ROUTES } from "@/configs/routePaths";
import { SUPPORT_PHONE_WA } from "@/configs/appConfig";

export default function ContactCTA() {
  return (
    <section className="section bg-[#464453] text-white relative">
      <div className="container text-center s-lg">
        <h2 className="heading heading-lg text-white">
          Prefer a Direct Conversation?
        </h2>

        <p className="text-slate-300 max-w-2xl mx-auto">
          Our support and corporate teams are available to assist you with
          bookings, pricing, and customized stay requirements.
        </p>

        <div className="flex justify-center gap-4 pt-6">
          <Button
            onClick={() =>
              SUPPORT_PHONE_WA &&
              window.open(`https://wa.me/${SUPPORT_PHONE_WA}`, "_blank")
            }
            disabled={!SUPPORT_PHONE_WA}
            variant="success"
            size="lg"
            icon={<FaWhatsapp className="w-5 h-5" />}
          >
            WhatsApp / Call
          </Button>

          <Button to={ROUTES.FAQ} variant="accent" outline size="lg">
            View FAQs
          </Button>
        </div>
      </div>
    </section>
  );
}
