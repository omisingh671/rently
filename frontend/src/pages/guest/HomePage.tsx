import HomeHero from "@/features/home/components/HomeHero";
import PropertySnapshot from "@/features/home/components/PropertySnapshot";
import RoomOptions from "@/features/home/components/RoomOptions";
import Inside3BHK from "@/features/home/components/Inside3BHK";

import Gallery from "@/features/home/components/Gallery";
import Amenities from "@/features/home/components/Amenities";
import Location from "@/features/home/components/Location";
import BookingJourney from "@/features/home/components/BookingJourney";
import Reviews from "@/features/home/components/Reviews";
import ReachUs from "@/features/home/components/ReachUs";
import AboutUs from "@/features/home/components/AboutUs";

export default function HomePage() {
  return (
    <div>
      <HomeHero />

      <PropertySnapshot />

      <RoomOptions />

      <Inside3BHK />

      <Amenities variant="dark" />

      <Gallery />

      <Location variant="light" />

      <BookingJourney />

      <Reviews />

      <AboutUs />

      <ReachUs />
    </div>
  );
}
