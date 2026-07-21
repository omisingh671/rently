import type {
  BillingDocumentStatus,
  BillingDocumentType,
} from "@/generated/prisma/enums.js";

export interface BillingDocumentListInput {
  page: number;
  limit: number;
  propertyId?: string;
  type?: BillingDocumentType;
  status?: BillingDocumentStatus;
  bookingRef?: string;
  guest?: string;
  from?: Date;
  to?: Date;
}

export interface UpdateBillingSettingInput {
  reason: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  billingAddress?: string | null;
  invoicePrefix?: string;
  receiptPrefix?: string;
  creditNotePrefix?: string;
  debitNotePrefix?: string;
  footerNotes?: string | null;
}
