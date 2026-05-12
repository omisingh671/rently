export type OccupancyType = "single" | "double" | "unit" | "multi_room";

export interface AvailabilityCriteria {
  checkIn: string;
  checkOut: string;
  guests: number;
  occupancyType: OccupancyType;
}

export interface AvailabilitySpace {
  spaceId: string;
  title: string;
  location?: string;
  capacity: number;
  pricePerNight: number;
  priceTotal: number;
  targetType: "ROOM" | "UNIT";
  unitId: string | null;
  roomId: string | null;
}

export interface AvailabilityResult {
  available: boolean;
  spaces: AvailabilitySpace[];
  groupCandidates: AvailabilitySpace[];
}
