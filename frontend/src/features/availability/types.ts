import type {
  AvailabilityCriteria,
  AvailabilityResult,
  CalendarAvailabilityResult,
  ComfortOption,
} from "./domain";

export interface CheckAvailabilityPayload {
  checkIn: string;
  checkOut: string;
  guests: number;
  comfortOption: ComfortOption;
  city?: string;
  name?: string;
  email?: string;
  countryCode?: string;
  contactNumber?: string;
  fullContactNumber?: string;
}

export type CheckAvailabilityResponse = AvailabilityResult;

export interface CalendarAvailabilityPayload {
  startDate: string;
  endDate: string;
  guests: number;
  comfortOption: ComfortOption;
  city?: string;
}

export type CalendarAvailabilityResponse = CalendarAvailabilityResult;

export interface AvailabilityNavigationState {
  criteria: AvailabilityCriteria;
  availability: AvailabilityResult;
}
