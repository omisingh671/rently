export type CompanyAccount = {
  id: string;
  propertyId: string;
  legalName: string;
  tradeName: string | null;
  gstin: string | null;
  billingAddress: string | null;
  stateCode: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
  creditLimit: string;
  paymentTermsDays: number;
  isActive: boolean;
};

export type BookingGroupStatus =
  | "PROSPECT"
  | "TENTATIVE"
  | "CONFIRMED"
  | "IN_HOUSE"
  | "COMPLETED"
  | "CANCELLED";

export type BookingGroup = {
  id: string;
  propertyId: string;
  companyId: string | null;
  groupRef: string;
  name: string;
  status: BookingGroupStatus;
  checkIn: string;
  checkOut: string;
  expectedRooms: number;
  expectedGuests: number;
  releaseDate: string | null;
  billingNotes: string | null;
  company: CompanyAccount | null;
  bookings: Array<{
    id: string;
    bookingRef: string;
    guestNameSnapshot: string;
    status: string;
    totalAmount: string;
  }>;
  folioCharges: Array<{
    id: string;
    description: string;
    amount: string;
    status: "ACTIVE" | "VOID";
    note: string | null;
    voidReason: string | null;
  }>;
  inventoryLocks: Array<{
    id: string;
    lockToken: string;
    roomId: string | null;
    checkIn: string;
    checkOut: string;
    expiresAt: string;
    releasedAt: string | null;
    bookingId: string | null;
  }>;
  memberTotal: string;
  groupCharges: string;
  paid: string;
  refunded: string;
  balance: string;
  heldRoomCount: number;
};

export type CreateCompanyPayload = {
  legalName: string;
  gstin?: string;
  billingAddress?: string;
  stateCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactNumber?: string;
  creditLimit: number;
  paymentTermsDays: number;
};

export type CreateGroupPayload = {
  companyId?: string;
  name: string;
  checkIn: string;
  checkOut: string;
  expectedRooms: number;
  expectedGuests: number;
  releaseDate?: string;
  billingNotes?: string;
};
