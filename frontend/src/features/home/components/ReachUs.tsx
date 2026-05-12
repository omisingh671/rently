"use client";

import React, { useCallback } from "react";
import { RiPhoneLine, RiWhatsappLine, RiMailLine } from "react-icons/ri";

import EnquiryForm from "@/forms/enquiry/Form";
import { useCreateEnquiry } from "@/features/enquire/hooks";
import type { Enquiry, EnquirySubmitPayload } from "@/features/enquire/types";

type ContactVariant = "phone" | "whatsapp" | "email";

function ContactCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  variant: ContactVariant;
}) {
  const variantStyles: Record<
    ContactVariant,
    {
      iconWrap: string;
      icon: string;
      label: string;
    }
  > = {
    phone: {
      iconWrap: "bg-indigo-500",
      icon: "text-white",
      label: "text-indigo-300",
    },
    whatsapp: {
      iconWrap: "bg-green-500",
      icon: "text-white",
      label: "text-green-300",
    },
    email: {
      iconWrap: "bg-rose-500",
      icon: "text-white",
      label: "text-rose-300",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-4 transition hover:bg-white/10">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${styles.iconWrap}`}
      >
        <Icon size={22} className={styles.icon} />
      </div>

      <div>
        <p className={`text-xs font-semibold tracking-wide ${styles.label}`}>
          {label}
        </p>
        <p className="text-base font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

export default function ReachUs() {
  const createEnquiry = useCreateEnquiry();

  const handleEnquiry = useCallback(
    async (data: EnquirySubmitPayload) => {
      const payload: Enquiry = {
        name: data.name,
        email: data.email,
        contactNumber: data.fullContactNumber,
        message: data.message,
      };

      await createEnquiry.mutateAsync(payload);
    },
    [createEnquiry]
  );

  return (
    <section className="section bg-[#464453]">
      <div className="container mx-auto grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* LEFT */}
        <div>
          <span className="kicker text-amber-400">CONTACT</span>

          <h2 className="heading heading-lg text-slate-100">Reach Us</h2>

          <p className="mt-4 max-w-md text-slate-300">
            Have questions? Ready to book? Our team is here to help you 24/7.
          </p>

          <div className="mt-10 space-y-5">
            <ContactCard
              variant="phone"
              icon={RiPhoneLine}
              label="CALL US"
              value="+91-8099480994"
            />

            <ContactCard
              variant="whatsapp"
              icon={RiWhatsappLine}
              label="WHATSAPP"
              value="Chat Now"
            />

            <ContactCard
              variant="email"
              icon={RiMailLine}
              label="EMAIL"
              value="laveena@homeawayfromhome.in"
            />
          </div>

          <div className="mt-8">
            <p className="font-semibold text-slate-200">Address:</p>
            <p className="text-slate-400">Sucasa Homes, Hyderabad</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-xl border border-white/10 bg-white/10 p-4">
          <EnquiryForm
            variant="dark"
            className="bg-transparent"
            title="Send an Enquiry"
            description="Our team usually responds within a few hours."
            onSubmit={handleEnquiry}
            disabled={createEnquiry.isPending}
            resetOnSuccess={createEnquiry.isSuccess}
          />

          {createEnquiry.isSuccess && (
            <p className="mt-4 text-sm font-medium text-green-400">
              Enquiry sent successfully. We will contact you shortly.
            </p>
          )}

          {createEnquiry.isError && (
            <p className="mt-4 text-sm font-medium text-red-400">
              Failed to send enquiry. Please try again later.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
