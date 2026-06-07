import type {
  BookingTargetType,
  LeadStatus,
} from "@/generated/prisma/enums.js";

export interface DashboardEnquiryDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source: string | null;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardQuoteDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  productId: string | null;
  productName: string | null;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  checkIn: Date;
  checkOut: Date;
  status: LeadStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
