export type OccupancyType = "single" | "double" | "unit" | "multi_room";
export type ComfortOption = "AC" | "NON_AC";

export interface AvailabilityCriteria {
  checkIn: string;
  checkOut: string;
  guests: number;
  occupancyType: OccupancyType;
  comfortOption: ComfortOption;
}

export interface AvailabilitySpace {
  spaceId: string;
  title: string;
  location?: string;
  capacity: number;
  comfortOption: ComfortOption;
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
