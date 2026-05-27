export type BillingDocumentType = "INVOICE" | "RECEIPT" | "CREDIT_NOTE";
export type BillingDocumentStatus = "DRAFT" | "ISSUED" | "CANCELLED" | "VOID";

export type BillingDocument = {
  id: string;
  type: BillingDocumentType;
  status: BillingDocumentStatus;
  documentNumber: string;
  bookingId: string;
  paymentId: string | null;
  propertyId: string;
  tenantId: string | null;
  subtotal: string;
  discount: string;
  taxable: string;
  tax: string;
  total: string;
  paid: string;
  balance: string;
  notes: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  createdAt: string;
};
