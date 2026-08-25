export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  systemKey: string;
  debit: string;
  credit: string;
  bookingId: string | null;
  paymentId: string | null;
  paymentRefundId: string | null;
  billingDocumentId: string | null;
  description: string | null;
}

export interface JournalEntry {
  id: string;
  propertyId: string;
  businessDate: string;
  sourceType: string;
  sourceId: string;
  description: string;
  status: "POSTED" | "REVERSED";
  currency: string;
  totalDebit: string;
  totalCredit: string;
  correlationId: string | null;
  reversalOfEntryId: string | null;
  postedAt: string;
  lines: JournalLine[];
}

export interface AccountingQuery {
  propertyId?: string;
  startDate: string;
  endDate: string;
  sourceType?: string;
  page: number;
  limit: number;
}

export interface JournalResponse {
  page: number;
  limit: number;
  total: number;
  items: JournalEntry[];
}

export interface Reconciliation {
  balanced: boolean;
  operational?: { payments: number; refunds: number; billingDocuments: number };
  posted?: { payments: number; refunds: number; billingDocuments: number };
  missing: { payments: number; refunds: number; billingDocuments: number };
  unbalancedEntries: number;
}
