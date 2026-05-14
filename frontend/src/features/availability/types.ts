import type {
  AvailabilityCriteria,
  AvailabilityResult,
  ComfortOption,
} from "./domain";

export interface CheckAvailabilityPayload {
  checkIn: string;
  checkOut: string;
  guests: number;
  comfortOption: ComfortOption;
  name?: string;
  email?: string;
  countryCode?: string;
  contactNumber?: string;
  fullContactNumber?: string;
}

export type CheckAvailabilityResponse = AvailabilityResult;

export interface AvailabilityNavigationState {
  criteria: AvailabilityCriteria;
  availability: AvailabilityResult;
}
