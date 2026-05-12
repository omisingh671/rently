export type EnquirySource = "PUBLIC_WEBSITE" | "PUBLIC_QUOTE_REQUEST";

export interface Enquiry {
  id?: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source?: EnquirySource;
  createdAt?: string;
}

export interface EnquirySubmitPayload {
  name: string;
  email: string;
  fullContactNumber: string;
  message: string;
}
