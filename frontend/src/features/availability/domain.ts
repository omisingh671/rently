export type OccupancyType = "single" | "double";

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
  priceTotal: number;
}

export interface AvailabilityResult {
  available: boolean;
  spaces: AvailabilitySpace[];
}
