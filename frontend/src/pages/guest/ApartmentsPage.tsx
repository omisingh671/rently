import ApartmentsHero from "@/features/apartments/components/ApartmentsHero";
import ApartmentFeatures from "@/features/apartments/components/ApartmentFeatures";
import WhyChooseApartments from "@/features/apartments/components/WhyChooseApartments";

export default function ApartmentsPage() {
  return (
    <div>
      <ApartmentsHero />

      <ApartmentFeatures />

      <WhyChooseApartments />
    </div>
  );
}
