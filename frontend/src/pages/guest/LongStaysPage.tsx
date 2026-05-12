import CorporateHero from "@/features/corporate/components/CorporateHero";
import CorporateHighlights from "@/features/corporate/components/CorporateHighlights";
import CorporateFeatures from "@/features/corporate/components/CorporateFeatures";
import CorporateCTA from "@/features/corporate/components/CorporateCTA";

export default function LongStaysPage() {
  return (
    <div>
      <CorporateHero />

      <CorporateFeatures />

      <CorporateHighlights />

      <CorporateCTA />
    </div>
  );
}
