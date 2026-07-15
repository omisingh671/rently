import type {
  BillingDocumentStatus,
  BillingDocumentType,
} from "@/generated/prisma/enums.js";
import type { SideEffectJobStatus } from "@/generated/prisma/enums.js";

export interface BillingDocumentDTO {
  id: string;
  type: BillingDocumentType;
  status: BillingDocumentStatus;
  documentNumber: string;
  bookingId: string;
  paymentId: string | null;
  folioChargeId: string | null;
  propertyId: string;
  tenantId: string | null;
  subtotal: string;
  discount: string;
  taxable: string;
  tax: string;
  total: string;
  paid: string;
  balance: string;
  guestSnapshot: unknown;
  propertySnapshot: unknown;
  tenantSnapshot: unknown;
  bookingSnapshot: unknown;
  priceSnapshot: unknown;
  taxSnapshot: unknown;
  paymentSnapshot: unknown;
  lineItems: unknown;
  notes: string | null;
  pdfUrl: string | null;
  pdfStatus: SideEffectJobStatus;
  pdfAttemptCount: number;
  pdfMaxAttempts: number;
  pdfLastError: string | null;
  pdfCorrelationId: string | null;
  pdfRenderedAt: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSettingDTO {
  id: string;
  propertyId: string;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  billingAddress: string | null;
  invoicePrefix: string;
  receiptPrefix: string;
  creditNotePrefix: string;
  debitNotePrefix: string;
  footerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
