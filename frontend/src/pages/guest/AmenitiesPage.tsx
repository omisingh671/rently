import AmenitiesHero from "@/features/amenities/components/AmenitiesHero";
import AmenitiesGrid from "@/features/amenities/components/AmenitiesGrid";
import AmenitiesCTA from "@/features/amenities/components/AmenitiesCTA";

export default function AmenitiesPage() {
  return (
    <div>
      <AmenitiesHero />

      <AmenitiesGrid />

      <AmenitiesCTA />
    </div>
  );
}
