import LocationHero from "@/features/location/components/LocationHero";
import NearbyConveniences from "@/features/location/components/NearbyConveniences";
import LocationCTA from "@/features/location/components/LocationCTA";

export default function LocationPage() {
  return (
    <div>
      <LocationHero />
      <NearbyConveniences />
      <LocationCTA />
    </div>
  );
}
