import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./enquiries.repository.js";
import * as tenantRepo from "@/modules/public/tenant/tenant.repository.js";
import type { CreatePublicEnquiryInput } from "./enquiries.inputs.js";
import type { PublicEnquiryDTO } from "./enquiries.dto.js";

const mapEnquiry = (enquiry: {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source: string | null;
  createdAt: Date;
}): PublicEnquiryDTO => ({
  id: enquiry.id,
  propertyId: enquiry.propertyId,
  name: enquiry.name,
  email: enquiry.email,
  contactNumber: enquiry.contactNumber,
  message: enquiry.message,
  source: enquiry.source ?? null,
  createdAt: enquiry.createdAt.toISOString(),
});

export const createEnquiry = async (
  input: CreatePublicEnquiryInput,
): Promise<PublicEnquiryDTO> => {
  const property =
    input.propertySlug !== undefined && input.tenantId !== undefined
      ? await tenantRepo.findActivePropertyBySlug(input.tenantId, input.propertySlug)
      : input.propertyId
        ? await tenantRepo.findActivePropertyById(input.propertyId, input.tenantId)
        : await tenantRepo.findDefaultProperty(input.tenantId);

  if (!property) {
    if (input.propertySlug !== undefined) {
      throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
    }

    throw new HttpError(
      422,
      "PROPERTY_NOT_AVAILABLE",
      "No active property is available for enquiries",
    );
  }

  const enquiry = await repo.createEnquiry({
    property: { connect: { id: property.id } },
    name: input.name,
    email: input.email,
    contactNumber: input.contactNumber,
    message: input.message,
    source: input.source ?? "PUBLIC_WEBSITE",
  });

  return mapEnquiry(enquiry);
};
