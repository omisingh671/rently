export type RoomType = {
  id: string;
  tag?: string;
  occupancy: "Single" | "Double";
  roomImg: string;
  roomImgMobile?: string;
  title: string;
  price: string;
  description: string;
  highlights?: string[];
  acAvailable?: boolean;
  nonAcAvailable?: boolean;
  ctaTo?: string;
  onCtaClick?: () => void;
};
