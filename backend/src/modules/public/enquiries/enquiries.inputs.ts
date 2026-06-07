export interface CreatePublicEnquiryInput {
  tenantId?: string;
  propertySlug?: string;
  propertyId?: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source?: "PUBLIC_WEBSITE" | "PUBLIC_QUOTE_REQUEST";
}
