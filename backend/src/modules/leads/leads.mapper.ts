import type { DashboardEnquiryDTO, DashboardQuoteDTO } from "./leads.dto.js";
import type * as repo from "./leads.repository.js";

export const mapEnquiry = (
  enquiry: repo.DashboardEnquiryRecord,
): DashboardEnquiryDTO => ({
  id: enquiry.id,
  propertyId: enquiry.propertyId,
  propertyName: enquiry.property.name,
  name: enquiry.name,
  email: enquiry.email,
  contactNumber: enquiry.contactNumber,
  message: enquiry.message,
  source: enquiry.source ?? null,
  status: enquiry.status,
  createdAt: enquiry.createdAt,
  updatedAt: enquiry.updatedAt,
});

export const mapQuote = (
  quote: repo.DashboardQuoteRecord,
): DashboardQuoteDTO => ({
  id: quote.id,
  propertyId: quote.propertyId,
  propertyName: quote.property.name,
  userId: quote.userId ?? null,
  guestName: quote.user?.fullName ?? null,
  guestEmail: quote.user?.email ?? null,
  productId: quote.productId ?? null,
  productName: quote.product?.name ?? null,
  targetType: quote.targetType,
  unitId: quote.unitId ?? null,
  roomId: quote.roomId ?? null,
  checkIn: quote.checkIn,
  checkOut: quote.checkOut,
  status: quote.status,
  notes: quote.notes ?? null,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});
