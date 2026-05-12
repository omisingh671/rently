import FaqHero from "@/features/faq/components/FaqHero";
import FaqList from "@/features/faq/components/FaqList";
import FaqCTA from "@/features/faq/components/FaqCTA";

export default function FaqPage() {
  return (
    <div>
      <FaqHero />
      <FaqList />
      <FaqCTA />
    </div>
  );
}
