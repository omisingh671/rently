import Button from "@/components/ui/Button";
import { FaWhatsapp } from "react-icons/fa";
import { ROUTES } from "@/configs/routePaths";
import { SUPPORT_PHONE } from "@/configs/appConfig";

export default function ContactCTA() {
  // Convert phone to WhatsApp-safe number
  const waNumber = SUPPORT_PHONE.replace(/\D/g, "");

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
            onClick={() => window.open(`https://wa.me/${waNumber}`, "_blank")}
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
