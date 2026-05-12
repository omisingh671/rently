"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { RiPhoneLine, RiMailLine, RiWhatsappLine } from "react-icons/ri";

import FeatureCard from "@/components/ui/FeatureCard/FeatureCard";
import EnquiryForm from "@/forms/enquiry/Form";
import { useCreateEnquiry } from "@/features/enquire/hooks";
import type { Enquiry, EnquirySubmitPayload } from "@/features/enquire/types";

import { SUPPORT_PHONE, SUPPORT_EMAIL } from "@/configs/appConfig";

const OPTIONS = [
  {
    icon: RiPhoneLine,
    title: "Call Us",
    desc: SUPPORT_PHONE || "+91 8099480994",
    action: SUPPORT_PHONE ? `tel:${SUPPORT_PHONE.replace(/\s/g, "")}` : "#",
    type: "link",
  },
  {
    icon: RiWhatsappLine,
    title: "WhatsApp",
    desc: "Chat with us instantly",
    type: "whatsapp",
  },
  {
    icon: RiMailLine,
    title: "Email",
    desc: SUPPORT_EMAIL || "support@sucasahomes.com",
    action: SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : "#",
    type: "link",
  },
];

export default function ContactForm() {
  const [searchParams] = useSearchParams();
  const whatsappNumber = SUPPORT_PHONE?.replace(/\D/g, "");
  const createEnquiry = useCreateEnquiry();
  const isQuoteIntent = searchParams.get("intent") === "quote";

  const handleEnquiry = useCallback(
    async (data: EnquirySubmitPayload) => {
      const payload: Enquiry = {
        name: data.name,
        email: data.email,
        contactNumber: data.fullContactNumber,
        message: data.message,
        source: isQuoteIntent ? "PUBLIC_QUOTE_REQUEST" : "PUBLIC_WEBSITE",
      };

      await createEnquiry.mutateAsync(payload);
    },
    [createEnquiry, isQuoteIntent],
  );

  /**
   * Clear ONLY error state on input change
   */
  const clearServerError = useCallback(() => {
    if (createEnquiry.isError) {
      createEnquiry.reset();
    }
  }, [createEnquiry]);

  /**
   * Clear success AFTER showing it
   */
  useEffect(() => {
    if (!createEnquiry.isSuccess) return;

    const timer = setTimeout(() => {
      createEnquiry.reset();
    }, 3000);

    return () => clearTimeout(timer);
  }, [createEnquiry]);

  return (
    <section className="section bg-white">
      <div className="container">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {OPTIONS.map((item) => {
              const Card = (
                <FeatureCard
                  iconPosition="top"
                  contentAlign="center"
                  icon={item.icon}
                  title={item.title}
                  description={item.desc}
                  iconBg="bg-indigo-200"
                  iconColor="text-indigo-800"
                  cardBg="bg-indigo-50/60"
                  borderClass="border border-indigo-200/60"
                />
              );

              if (item.type === "whatsapp") {
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      if (!whatsappNumber) return;
                      window.open(`https://wa.me/${whatsappNumber}`, "_blank");
                    }}
                    className="block w-full text-left hover:no-underline"
                  >
                    {Card}
                  </button>
                );
              }

              return (
                <a
                  key={item.title}
                  href={item.action}
                  className="block hover:no-underline"
                >
                  {Card}
                </a>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <EnquiryForm
              variant="light"
              className="bg-transparent"
              title={isQuoteIntent ? "Request a Quote" : "Send an Enquiry"}
              description={
                isQuoteIntent
                  ? "Share your long-stay or corporate requirement and our team will respond with a custom quote."
                  : "Our team usually responds within a few hours."
              }
              onSubmit={handleEnquiry}
              disabled={createEnquiry.isPending}
              resetOnSuccess={createEnquiry.isSuccess}
              onInputChange={clearServerError}
            />

            {createEnquiry.isSuccess && (
              <p className="sm:px-6 px-4 mb-4 text-sm font-medium text-green-600">
                Enquiry sent successfully. We will contact you shortly.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
