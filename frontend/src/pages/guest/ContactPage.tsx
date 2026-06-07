import ContactHero from "@/features/contact/components/ContactHero";
import ContactForm from "@/features/contact/components/ContactForm";
import ContactCTA from "@/features/contact/components/ContactCTA";
import PropertyContactSection from "@/features/contact/components/PropertyContactSection";

export default function ContactPage() {
  return (
    <div>
      <ContactHero />
      <ContactForm />
      <ContactCTA />
      <PropertyContactSection />
    </div>
  );
}
