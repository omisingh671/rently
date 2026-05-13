export interface Space {
  id: string;
  propertyId: string;
  title: string;
  description?: string;
  pricePerNight: number;
  capacity: number;
  guestCount: number;
  hasAC: boolean;
  comfortOption: "AC" | "NON_AC";
  location?: string;
  targetType: "ROOM" | "UNIT";
  unitId: string | null;
  roomId: string | null;
}
