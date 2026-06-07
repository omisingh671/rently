export interface PublicEnquiryDTO {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source: string | null;
  createdAt: string;
}
