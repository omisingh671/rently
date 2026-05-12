import ContactHero from "@/features/contact/components/ContactHero";
import ContactForm from "@/features/contact/components/ContactForm";
import ContactCTA from "@/features/contact/components/ContactCTA";

export default function ContactPage() {
  return (
    <div>
      <ContactHero />
      <ContactForm />
      <ContactCTA />
    </div>
  );
}
