export interface Enquiry {
  id?: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  createdAt?: string;
}

export interface EnquirySubmitPayload {
  name: string;
  email: string;
  fullContactNumber: string;
  message: string;
}
