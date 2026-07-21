import type { PaginatedResult } from "@/common/types/pagination";

export type BillingDocumentType =
  | "INVOICE"
  | "RECEIPT"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";
export type BillingDocumentStatus = "DRAFT" | "ISSUED" | "CANCELLED" | "VOID";

export type BillingDocument = {
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
  pdfStatus: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
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
};

export type BillingDocumentListResponse = PaginatedResult<BillingDocument>;

export type BillingDocumentListParams = {
  page: number;
  limit: number;
  propertyId?: string;
  type?: BillingDocumentType;
  status?: BillingDocumentStatus;
  bookingRef?: string;
  guest?: string;
  from?: string;
  to?: string;
};

export type BillingSetting = {
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
};

export type UpdateBillingSettingPayload = {
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
};

export type BillingSettingSnapshot = Omit<
  BillingSetting,
  "id" | "propertyId" | "createdAt" | "updatedAt"
>;

export type BillingSettingAudit = {
  id: string;
  propertyId: string;
  actor: { id: string; fullName: string; email: string };
  reason: string;
  previousData: BillingSettingSnapshot;
  nextData: BillingSettingSnapshot;
  createdAt: string;
};
