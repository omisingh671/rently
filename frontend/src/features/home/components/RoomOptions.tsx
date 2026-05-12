import Card, { Skeleton } from "@/components/ui/AccommodationCard/Card";
import type { RoomType } from "@/components/ui/AccommodationCard/types";
import { ROUTES } from "@/configs/routePaths";
const rooms: RoomType[] = [
  {
    id: "private",
    tag: "PRIVATE BEDROOM",
    occupancy: "Single",
    title: "Private Sanctuary",
    price: "₹1,500",
    description:
      "A private bedroom inside a 3BHK apartment. Enjoy personal space with shared access to living room, dining area, and kitchen.",
    highlights: [
      "Professionals & Solo Travellers",
      "Wi-Fi & Housekeeping included",
      "AC & Non-AC options",
    ],
    acAvailable: true,
    nonAcAvailable: true,
    roomImg: "/assets/images/sucasa-homes/single-occupancy-desktop.jpg",
    roomImgMobile: "/assets/images/sucasa-homes/single-occupancy-mobile.jpg",

    ctaTo: ROUTES.ROOMS_TARIFFS,
  },
  {
    id: "shared",
    tag: "BEST VALUE",
    occupancy: "Double",
    title: "Shared Comfort",
    price: "₹2,000",
    description:
      "Stay with a friend, colleague, or partner in a comfortable shared room. Keep your stay affordable while enjoying all amenities.",
    highlights: [
      "Friends, Couples, Budget Travellers",
      "Shared Room + Full Apt Access",
      "AC & Non-AC options",
    ],
    acAvailable: true,
    nonAcAvailable: true,
    roomImg: "/assets/images/sucasa-homes/double_occupancy-desktop.jpg",
    roomImgMobile: "/assets/images/sucasa-homes/double_occupancy-mobile.jpg",

    ctaTo: ROUTES.ROOMS_TARIFFS,
  },
];

type RoomOptionsProps = {
  isLoading?: boolean;
  items?: RoomType[];
};

export default function RoomOptions({
  isLoading = false,
  items = rooms,
}: RoomOptionsProps) {
  const skeletonCount = 2;

  return (
    <section className="section bg-surface-3">
      <div className="container">
        <div className="text-center mb-12">
          <div className="kicker text-indigo-500 mb-3">ROOM OPTIONS</div>
          <h2 className="heading heading-xl">Choose How You Want to Stay</h2>
          <p className="text-muted text-lg mt-4">
            Whether you need privacy or are travelling with a companion, we have
            the perfect setup for you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {isLoading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <Skeleton key={i} />
              ))
            : items.map((room) => <Card key={room.id} {...room} />)}
        </div>
      </div>
    </section>
  );
}
