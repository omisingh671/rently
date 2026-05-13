export type ComfortOption = "AC" | "NON_AC";
export type ComfortFilter = "ALL" | ComfortOption;

export interface AvailabilityCriteria {
  checkIn: string;
  checkOut: string;
  guests: number;
  comfortOption: ComfortFilter;
}

export interface AvailabilityOption {
  optionId: string;
  title: string;
  guestSplit: string;
  totalCapacity: number;
  comfortOption: ComfortOption;
  nightlyTotal: number;
  stayTotal: number;
  nights: number;
  itemCount: number;
}

export interface AvailabilityResult {
  available: boolean;
  options: AvailabilityOption[];
}
