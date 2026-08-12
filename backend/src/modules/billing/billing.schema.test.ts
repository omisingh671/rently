import assert from "node:assert/strict";
import test from "node:test";
import { updateBillingSettingSchema } from "./billing.schema.js";
import { buildBillingDocumentHtml } from "./billing.pdf-template.js";
import type {
  BillingDocumentDTO,
  BillingSettingSnapshotDTO,
} from "./billing.dto.js";

test("requires a meaningful reason for billing-setting changes", () => {
  assert.equal(
    updateBillingSettingSchema.safeParse({ invoicePrefix: "NEW-" }).success,
    false,
  );
  assert.equal(
    updateBillingSettingSchema.safeParse({
      reason: "test",
      invoicePrefix: "NEW-",
    }).success,
    false,
  );
  assert.equal(
    updateBillingSettingSchema.safeParse({
      reason: "New financial-year numbering",
      invoicePrefix: "FY27-",
    }).success,
    true,
  );
});

test("billing PDF identity comes from the issued supplier snapshot", () => {
  const document = {
    id: "document-1",
    type: "INVOICE",
    status: "ISSUED",
    documentNumber: "INV-000001",
    fiscalYear: "2026-27",
    recipientGstin: "29ABCDE1234F1Z5",
    placeOfSupplyStateCode: "29",
    supplierStateCode: "29",
    sacCode: "996311",
    bookingId: "booking-1",
    paymentId: null,
    folioChargeId: null,
    propertyId: "property-1",
    tenantId: "tenant-1",
    subtotal: "1000",
    discount: "0",
    taxable: "1000",
    tax: "180",
    total: "1180",
    paid: "1180",
    balance: "0",
    guestSnapshot: { name: "Guest", email: "guest@example.com" },
    propertySnapshot: { name: "Snapshot Property", address: "Old Address" },
    supplierSnapshot: null,
    tenantSnapshot: null,
    bookingSnapshot: {
      bookingRef: "BOOK-1",
      checkIn: "2026-08-12T00:00:00.000Z",
      checkOut: "2026-08-13T00:00:00.000Z",
    },
    priceSnapshot: {},
    taxSnapshot: [],
    paymentSnapshot: null,
    lineItems: [],
    notes: null,
    pdfUrl: null,
    pdfStatus: "PENDING",
    pdfAttemptCount: 0,
    pdfMaxAttempts: 3,
    pdfLastError: null,
    pdfCorrelationId: null,
    pdfRenderedAt: null,
    pdfNextAttemptAt: null,
    pdfDeadLetteredAt: null,
    issuedAt: "2026-08-12T00:00:00.000Z",
    voidedAt: null,
    voidReason: null,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  } satisfies BillingDocumentDTO;
  const issuedSupplier = {
    legalName: "Issued Legal Entity Private Limited",
    gstin: "29ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    billingAddress: "Issued Billing Address",
    stateCode: "29",
    sacCode: "996311",
    invoicePrefix: "INV-",
    receiptPrefix: "RCT-",
    creditNotePrefix: "CN-",
    debitNotePrefix: "DN-",
    footerNotes: "Issued footer",
  } satisfies BillingSettingSnapshotDTO;

  const html = buildBillingDocumentHtml(document, issuedSupplier);
  assert.match(html, /Issued Legal Entity Private Limited/);
  assert.match(html, /GSTIN: 29ABCDE1234F1Z5/);
  assert.match(html, /Issued Billing Address/);
});
