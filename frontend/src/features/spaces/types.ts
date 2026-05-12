export interface Space {
  id: string;
  propertyId: string;
  title: string;
  description?: string;
  pricePerNight: number;
  capacity: number;
  hasAC: boolean;
  location?: string;
  targetType: "ROOM" | "UNIT";
  unitId: string | null;
  roomId: string | null;
}
