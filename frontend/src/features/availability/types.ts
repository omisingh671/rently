import type { AvailabilityCriteria, AvailabilityResult } from "./domain";

export interface CheckAvailabilityPayload extends AvailabilityCriteria {
  name: string;
  email: string;
  countryCode: string;
  contactNumber: string;
  fullContactNumber: string;
}

export type CheckAvailabilityResponse = AvailabilityResult;

export interface AvailabilityNavigationState {
  criteria: AvailabilityCriteria;
  availability: AvailabilityResult;
}
