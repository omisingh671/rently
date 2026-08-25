import { chromium } from "playwright";
import { HttpError } from "@/common/errors/http-error.js";
import {
  isTransientDatabaseError,
  runWithBoundedRetry,
} from "@/common/retry/retry-policy.js";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  PaymentStatus,
  Prisma,
  UserRole,
} from "@/generated/prisma/client.js";
import type { PaginatedResult } from "@/common/types/pagination.js";
import type {
  BillingDocumentDTO,
  BillingSettingAuditDTO,
  BillingSettingDTO,
  BillingSettingSnapshotDTO,
} from "./billing.dto.js";
import type {
  BillingDocumentListInput,
  UpdateBillingSettingInput,
} from "./billing.inputs.js";
import * as repo from "./billing.repository.js";
import { buildBillingDocumentHtml } from "./billing.pdf-template.js";
import { storageProvider } from "@/common/services/storage.js";
import { getCorrelationId } from "@/common/observability/request-context.js";
import { logError } from "@/common/observability/logger.js";
import { SIDE_EFFECT_RETRY_POLICY } from "@/common/constants/application.constants.js";
import {
  buildBookingSnapshot,
  buildGuestSnapshot,
  buildLineItems,
  buildPaymentSnapshot,
  buildPriceSnapshot,
  buildPropertySnapshot,
  buildSupplierSnapshot,
  buildTaxSnapshot,
  buildTenantSnapshot,
  getFolioTotal,
  getFolioTotals,
} from "./billing.snapshots.js";
import { getFolioChargeFinancialBreakdown } from "./billing.financials.js";
import {
  postIssuedBillingDocument,
  reverseBillingDocumentPosting,
} from "@/modules/accounting/accounting.posting.js";

const zeroDecimal = new Prisma.Decimal(0);

const toJson = (value: unknown): Prisma.InputJsonValue =>
  value as unknown as Prisma.InputJsonValue;

const maxDecimal = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.greaterThan(right) ? left : right;

const documentKeyForInvoice = (bookingId: string) => `INVOICE:${bookingId}`;
const documentKeyForReceipt = (paymentId: string) => `RECEIPT:${paymentId}`;
const documentKeyForDebitNote = (folioChargeId: string) =>
  `DEBIT_NOTE:${folioChargeId}`;
const documentKeyForCreditNote = (folioChargeId: string) =>
  `CREDIT_NOTE:${folioChargeId}`;
const documentKeyForRefundCreditNote = (refundId: string) =>
  `REFUND_CREDIT_NOTE:${refundId}`;
const maxBillingTransactionAttempts = 3;

const runBillingTransactionWithRetry = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  runWithBoundedRetry({
    operation: () => repo.runBillingTransaction(callback),
    isRetryable: isTransientDatabaseError,
    maxAttempts: maxBillingTransactionAttempts,
    mapExhaustedError: () =>
      new HttpError(
        503,
        "BILLING_DATABASE_UNAVAILABLE",
        "Billing service is temporarily unavailable. Retry shortly.",
      ),
  });

const mapDocument = (
  document: repo.BillingDocumentRecord,
): BillingDocumentDTO => ({
  id: document.id,
  type: document.type,
  status: document.status,
  documentNumber: document.documentNumber,
  bookingId: document.bookingId,
  paymentId: document.paymentId ?? null,
  folioChargeId: document.folioChargeId ?? null,
  propertyId: document.propertyId,
  tenantId: document.tenantId ?? null,
  subtotal: document.subtotal.toString(),
  discount: document.discount.toString(),
  taxable: document.taxable.toString(),
  tax: document.tax.toString(),
  total: document.total.toString(),
  paid: document.paid.toString(),
  balance: document.balance.toString(),
  guestSnapshot: document.guestSnapshot,
  propertySnapshot: document.propertySnapshot,
  supplierSnapshot: document.supplierSnapshot ?? null,
  tenantSnapshot: document.tenantSnapshot ?? null,
  bookingSnapshot: document.bookingSnapshot,
  priceSnapshot: document.priceSnapshot,
  taxSnapshot: document.taxSnapshot ?? null,
  paymentSnapshot: document.paymentSnapshot ?? null,
  lineItems: document.lineItems,
  notes: document.notes ?? null,
  pdfUrl: document.pdfUrl ?? null,
  pdfStatus: document.pdfStatus,
  pdfAttemptCount: document.pdfAttemptCount,
  pdfMaxAttempts: document.pdfMaxAttempts,
  pdfLastError: document.pdfLastError ?? null,
  pdfCorrelationId: document.pdfCorrelationId ?? null,
  pdfRenderedAt: document.pdfRenderedAt?.toISOString() ?? null,
  pdfNextAttemptAt: document.pdfNextAttemptAt?.toISOString() ?? null,
  pdfDeadLetteredAt: document.pdfDeadLetteredAt?.toISOString() ?? null,
  issuedAt: document.issuedAt?.toISOString() ?? null,
  voidedAt: document.voidedAt?.toISOString() ?? null,
  voidReason: document.voidReason ?? null,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
  fiscalYear: document.fiscalYear ?? null,
  recipientGstin: document.recipientGstin ?? null,
  placeOfSupplyStateCode: document.placeOfSupplyStateCode ?? null,
  supplierStateCode: document.supplierStateCode ?? null,
  sacCode: document.sacCode ?? null,
});

const mapSetting = (setting: repo.BillingSettingRecord): BillingSettingDTO => ({
  id: setting.id,
  propertyId: setting.propertyId,
  legalName: setting.legalName ?? null,
  gstin: setting.gstin ?? null,
  pan: setting.pan ?? null,
  billingAddress: setting.billingAddress ?? null,
  invoicePrefix: setting.invoicePrefix,
  receiptPrefix: setting.receiptPrefix,
  creditNotePrefix: setting.creditNotePrefix,
  debitNotePrefix: setting.debitNotePrefix,
  footerNotes: setting.footerNotes ?? null,
  stateCode: setting.stateCode ?? null,
  sacCode: setting.sacCode,
  createdAt: setting.createdAt.toISOString(),
  updatedAt: setting.updatedAt.toISOString(),
});

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const mapSettingSnapshot = (
  value: Prisma.JsonValue,
): BillingSettingSnapshotDTO => {
  const snapshot =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    legalName: asNullableString(snapshot.legalName),
    gstin: asNullableString(snapshot.gstin),
    pan: asNullableString(snapshot.pan),
    billingAddress: asNullableString(snapshot.billingAddress),
    invoicePrefix: asString(snapshot.invoicePrefix),
    receiptPrefix: asString(snapshot.receiptPrefix),
    creditNotePrefix: asString(snapshot.creditNotePrefix),
    debitNotePrefix: asString(snapshot.debitNotePrefix),
    footerNotes: asNullableString(snapshot.footerNotes),
    stateCode: asNullableString(snapshot.stateCode),
    sacCode: asString(snapshot.sacCode) || "996311",
  };
};

const getSupplierSnapshot = async (
  propertyId: string,
  tx: Prisma.TransactionClient,
) =>
  toJson(buildSupplierSnapshot(await repo.getOrCreateSetting(propertyId, tx)));

const getDocumentTaxIdentity = async (
  booking: repo.BillingBookingRecord,
  tx: Prisma.TransactionClient,
) => {
  const setting = await repo.getOrCreateSetting(booking.propertyId, tx);
  return {
    ...(booking.recipientGstin !== null && {
      recipientGstin: booking.recipientGstin,
    }),
    ...(booking.placeOfSupplyStateCode !== null || setting.stateCode !== null
      ? {
          placeOfSupplyStateCode:
            booking.placeOfSupplyStateCode ?? setting.stateCode,
        }
      : {}),
    ...(setting.stateCode !== null && { supplierStateCode: setting.stateCode }),
    sacCode: setting.sacCode,
  };
};

const mapSettingAudit = (
  audit: repo.BillingSettingAuditRecord,
): BillingSettingAuditDTO => ({
  id: audit.id,
  propertyId: audit.propertyId,
  actor: audit.actor,
  reason: audit.reason,
  previousData: mapSettingSnapshot(audit.previousData),
  nextData: mapSettingSnapshot(audit.nextData),
  createdAt: audit.createdAt.toISOString(),
});

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
): PaginatedResult<T> => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

const ensureActor = async (userId: string) => {
  const actor = await repo.findUserById(userId);
  if (!actor || !actor.isActive) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  return actor;
};

const getScopedPropertyIds = async (actor: repo.BillingActorRecord) => {
  if (actor.role === UserRole.SUPER_ADMIN) return undefined;
  const assignmentRole = repo.propertyScopeRoleForUser(actor.role);
  if (!assignmentRole) return [];
  return repo.listAssignedPropertyIds(actor.id, assignmentRole);
};

const assertDashboardPropertyScope = async (
  actor: repo.BillingActorRecord,
  propertyId: string,
) => {
  const scopedIds = await getScopedPropertyIds(actor);
  if (scopedIds === undefined) return;
  if (!scopedIds.includes(propertyId)) {
    throw new HttpError(
      404,
      "BILLING_DOCUMENT_NOT_FOUND",
      "Billing document not found",
    );
  }
};

const assertSettingWriteRole = (actor: repo.BillingActorRecord) => {
  if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

const createDocumentSafely = async (
  create: () => Promise<repo.BillingDocumentRecord>,
  documentKey: string,
  tx?: Prisma.TransactionClient,
) => {
  try {
    return await create();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await repo.findDocumentByKey(documentKey, tx);
      if (existing) return existing;
    }

    throw error;
  }
};

export const createInvoiceForBooking = async (
  bookingId: string,
  tx?: Prisma.TransactionClient,
): Promise<BillingDocumentDTO> => {
  const documentKey = documentKeyForInvoice(bookingId);
  const createInTransaction = async (client: Prisma.TransactionClient) => {
    const booking = await repo.findBookingById(bookingId, client);
    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    const existing = await repo.findDocumentByKey(documentKey, client);
    if (existing) return existing;

    const paid = await repo.sumNetSucceededPaymentsByBooking(
      booking.id,
      client,
    );
    const supplierSnapshot = await getSupplierSnapshot(
      booking.propertyId,
      client,
    );
    const folio = getFolioTotals(booking);
    const grandTotal = booking.totalAmount.plus(folio.totalAmount);
    const balance = maxDecimal(zeroDecimal, grandTotal.minus(paid));
    if (balance.greaterThan(0)) {
      throw new HttpError(
        409,
        "BOOKING_BALANCE_DUE",
        "Invoice can be generated after full payment",
      );
    }

    const issuedAt = new Date();
    const { documentNumber, fiscalYear } = await repo.nextDocumentNumber(
      booking.propertyId,
      BillingDocumentType.INVOICE,
      issuedAt,
      client,
    );
    const taxIdentity = await getDocumentTaxIdentity(booking, client);

    const document = await createDocumentSafely(
      () =>
        repo.createDocument(
          {
            documentKey,
            type: BillingDocumentType.INVOICE,
            status: BillingDocumentStatus.ISSUED,
            documentNumber,
            fiscalYear,
            ...taxIdentity,
            booking: { connect: { id: booking.id } },
            property: { connect: { id: booking.propertyId } },
            tenant: { connect: { id: booking.property.tenantId } },
            subtotal: booking.subtotalAmount.plus(folio.baseAmount),
            discount: booking.discountAmount,
            taxable: booking.taxableAmount.plus(folio.baseAmount),
            tax: booking.taxAmount.plus(folio.taxAmount),
            total: grandTotal,
            paid,
            balance,
            guestSnapshot: toJson(buildGuestSnapshot(booking)),
            propertySnapshot: toJson(buildPropertySnapshot(booking)),
            supplierSnapshot,
            tenantSnapshot: toJson(buildTenantSnapshot(booking)),
            bookingSnapshot: toJson(buildBookingSnapshot(booking)),
            priceSnapshot: toJson(buildPriceSnapshot(booking)),
            taxSnapshot: toJson(buildTaxSnapshot(booking)),
            lineItems: toJson(buildLineItems(booking)),
            issuedAt,
          },
          client,
        ),
      documentKey,
      client,
    );
    await postIssuedBillingDocument(client, document.id);
    return document;
  };

  const document = tx
    ? await createInTransaction(tx)
    : await runBillingTransactionWithRetry(createInTransaction);

  return mapDocument(document);
};

export const createReceiptForPayment = async (
  paymentId: string,
  tx?: Prisma.TransactionClient,
): Promise<BillingDocumentDTO> => {
  const documentKey = documentKeyForReceipt(paymentId);
  const createInTransaction = async (client: Prisma.TransactionClient) => {
    const existing = await repo.findDocumentByKey(documentKey, client);
    if (existing) return existing;

    const payment = await repo.findPaymentById(paymentId, client);
    if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
      throw new HttpError(
        404,
        "PAYMENT_NOT_FOUND",
        "Successful payment not found",
      );
    }

    const booking = payment.booking;
    const supplierSnapshot = await getSupplierSnapshot(
      payment.propertyId,
      client,
    );
    const cumulativePaid = await repo.sumSucceededPaymentsThroughPayment(
      payment,
      client,
    );
    const balance = maxDecimal(
      zeroDecimal,
      booking.totalAmount.plus(getFolioTotal(booking)).minus(cumulativePaid),
    );

    const issuedAt = payment.paidAt ?? new Date();
    const { documentNumber, fiscalYear } = await repo.nextDocumentNumber(
      payment.propertyId,
      BillingDocumentType.RECEIPT,
      issuedAt,
      client,
    );
    const taxIdentity = await getDocumentTaxIdentity(booking, client);

    return createDocumentSafely(
      () =>
        repo.createDocument(
          {
            documentKey,
            type: BillingDocumentType.RECEIPT,
            status: BillingDocumentStatus.ISSUED,
            documentNumber,
            fiscalYear,
            ...taxIdentity,
            booking: { connect: { id: booking.id } },
            payment: { connect: { id: payment.id } },
            property: { connect: { id: payment.propertyId } },
            tenant: { connect: { id: booking.property.tenantId } },
            subtotal: payment.amount,
            discount: zeroDecimal,
            taxable: payment.amount,
            tax: zeroDecimal,
            total: payment.amount,
            paid: payment.amount,
            balance,
            guestSnapshot: toJson(buildGuestSnapshot(booking)),
            propertySnapshot: toJson(buildPropertySnapshot(booking)),
            supplierSnapshot,
            tenantSnapshot: toJson(buildTenantSnapshot(booking)),
            bookingSnapshot: toJson(buildBookingSnapshot(booking)),
            priceSnapshot: toJson(buildPriceSnapshot(booking)),
            taxSnapshot: toJson([]),
            paymentSnapshot: toJson(buildPaymentSnapshot(payment)),
            lineItems: toJson([
              {
                description: `Payment received for ${booking.bookingRef}`,
                targetLabel: booking.targetLabel,
                quantity: 1,
                rate: payment.amount.toString(),
                discount: "0",
                taxable: payment.amount.toString(),
                tax: "0",
                total: payment.amount.toString(),
              },
            ]),
            issuedAt,
          },
          client,
        ),
      documentKey,
      client,
    );
  };

  const document = tx
    ? await createInTransaction(tx)
    : await runBillingTransactionWithRetry(createInTransaction);

  return mapDocument(document);
};

export const createDebitNoteForFolioCharge = async (
  bookingId: string,
  folioChargeId: string,
  tx: Prisma.TransactionClient,
): Promise<BillingDocumentDTO | null> => {
  const invoice = await repo.findDocumentByKey(
    documentKeyForInvoice(bookingId),
    tx,
  );
  if (!invoice) return null;

  const documentKey = documentKeyForDebitNote(folioChargeId);
  const existing = await repo.findDocumentByKey(documentKey, tx);
  if (existing) return mapDocument(existing);

  const booking = await repo.findBookingById(bookingId, tx);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  const charge = await tx.bookingFolioCharge.findUnique({
    where: { id: folioChargeId },
  });
  if (!charge) {
    throw new HttpError(
      404,
      "FOLIO_CHARGE_NOT_FOUND",
      "Folio charge not found",
    );
  }

  const metadata =
    charge.metadata !== null &&
    typeof charge.metadata === "object" &&
    !Array.isArray(charge.metadata)
      ? charge.metadata
      : {};
  const breakdown = getFolioChargeFinancialBreakdown(charge);
  const issuedAt = new Date();
  const { documentNumber, fiscalYear } = await repo.nextDocumentNumber(
    booking.propertyId,
    BillingDocumentType.DEBIT_NOTE,
    issuedAt,
    tx,
  );
  const taxIdentity = await getDocumentTaxIdentity(booking, tx);
  const supplierSnapshot = await getSupplierSnapshot(booking.propertyId, tx);
  const paid = await repo.sumNetSucceededPaymentsByBooking(booking.id, tx);
  const balance = maxDecimal(
    zeroDecimal,
    booking.totalAmount.plus(getFolioTotal(booking)).minus(paid),
  );
  const document = await createDocumentSafely(
    () =>
      repo.createDocument(
        {
          documentKey,
          type: BillingDocumentType.DEBIT_NOTE,
          status: BillingDocumentStatus.ISSUED,
          documentNumber,
          fiscalYear,
          ...taxIdentity,
          booking: { connect: { id: booking.id } },
          folioCharge: { connect: { id: charge.id } },
          property: { connect: { id: booking.propertyId } },
          tenant: { connect: { id: booking.property.tenantId } },
          subtotal: breakdown.baseAmount,
          discount: zeroDecimal,
          taxable: breakdown.baseAmount,
          tax: breakdown.taxAmount,
          total: breakdown.totalAmount,
          paid: zeroDecimal,
          balance,
          guestSnapshot: toJson(buildGuestSnapshot(booking)),
          propertySnapshot: toJson(buildPropertySnapshot(booking)),
          supplierSnapshot,
          tenantSnapshot: toJson(buildTenantSnapshot(booking)),
          bookingSnapshot: toJson(buildBookingSnapshot(booking)),
          priceSnapshot: toJson(metadata),
          taxSnapshot: toJson(breakdown.taxBreakdown),
          lineItems: toJson([
            {
              description: charge.description,
              targetLabel: booking.targetLabel,
              quantity: 1,
              rate: breakdown.baseAmount.toString(),
              tax: breakdown.taxAmount.toString(),
              total: breakdown.totalAmount.toString(),
            },
          ]),
          notes: charge.note,
          issuedAt,
        },
        tx,
      ),
    documentKey,
    tx,
  );
  await postIssuedBillingDocument(tx, document.id);
  return mapDocument(document);
};

export const createCreditNoteForFolioCredit = async (
  bookingId: string,
  folioChargeId: string,
  tx: Prisma.TransactionClient,
): Promise<BillingDocumentDTO | null> => {
  const invoice = await repo.findDocumentByKey(
    documentKeyForInvoice(bookingId),
    tx,
  );
  if (!invoice) return null;

  const documentKey = documentKeyForCreditNote(folioChargeId);
  const existing = await repo.findDocumentByKey(documentKey, tx);
  if (existing) return mapDocument(existing);

  const booking = await repo.findBookingById(bookingId, tx);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  const charge = await tx.bookingFolioCharge.findUnique({
    where: { id: folioChargeId },
  });
  if (!charge) {
    throw new HttpError(
      404,
      "FOLIO_CHARGE_NOT_FOUND",
      "Folio charge not found",
    );
  }
  if (!charge.amount.lessThan(0)) {
    throw new HttpError(
      422,
      "FOLIO_CREDIT_AMOUNT_INVALID",
      "Credit-note folio adjustment must be negative",
    );
  }

  const metadata =
    charge.metadata !== null &&
    typeof charge.metadata === "object" &&
    !Array.isArray(charge.metadata)
      ? charge.metadata
      : {};
  const breakdown = getFolioChargeFinancialBreakdown(charge);
  const subtotal = breakdown.baseAmount.abs();
  const tax = breakdown.taxAmount.abs();
  const total = breakdown.totalAmount.abs();
  const issuedAt = new Date();
  const { documentNumber, fiscalYear } = await repo.nextDocumentNumber(
    booking.propertyId,
    BillingDocumentType.CREDIT_NOTE,
    issuedAt,
    tx,
  );
  const taxIdentity = await getDocumentTaxIdentity(booking, tx);
  const supplierSnapshot = await getSupplierSnapshot(booking.propertyId, tx);
  const paid = await repo.sumNetSucceededPaymentsByBooking(booking.id, tx);
  const balance = maxDecimal(
    zeroDecimal,
    booking.totalAmount.plus(getFolioTotal(booking)).minus(paid),
  );
  const document = await createDocumentSafely(
    () =>
      repo.createDocument(
        {
          documentKey,
          type: BillingDocumentType.CREDIT_NOTE,
          status: BillingDocumentStatus.ISSUED,
          documentNumber,
          fiscalYear,
          ...taxIdentity,
          booking: { connect: { id: booking.id } },
          folioCharge: { connect: { id: charge.id } },
          property: { connect: { id: booking.propertyId } },
          tenant: { connect: { id: booking.property.tenantId } },
          subtotal,
          discount: zeroDecimal,
          taxable: subtotal,
          tax,
          total,
          paid: zeroDecimal,
          balance,
          guestSnapshot: toJson(buildGuestSnapshot(booking)),
          propertySnapshot: toJson(buildPropertySnapshot(booking)),
          supplierSnapshot,
          tenantSnapshot: toJson(buildTenantSnapshot(booking)),
          bookingSnapshot: toJson(buildBookingSnapshot(booking)),
          priceSnapshot: toJson(metadata),
          taxSnapshot: toJson(breakdown.taxBreakdown),
          lineItems: toJson([
            {
              description: charge.description,
              targetLabel: booking.targetLabel,
              quantity: 1,
              rate: subtotal.toString(),
              tax: tax.toString(),
              total: total.toString(),
            },
          ]),
          notes: charge.note,
          issuedAt,
        },
        tx,
      ),
    documentKey,
    tx,
  );
  await postIssuedBillingDocument(tx, document.id);
  return mapDocument(document);
};

export const createCreditNoteForRefund = async (
  refundId: string,
  tx: Prisma.TransactionClient,
): Promise<BillingDocumentDTO | null> => {
  const refund = await tx.paymentRefund.findUnique({
    where: { id: refundId },
    include: {
      booking: { include: { property: { include: { tenant: true } } } },
    },
  });
  if (!refund || refund.status !== "SUCCEEDED") return null;
  const invoice = await repo.findDocumentByKey(
    documentKeyForInvoice(refund.bookingId),
    tx,
  );
  if (!invoice || invoice.status !== BillingDocumentStatus.ISSUED) return null;

  const documentKey = documentKeyForRefundCreditNote(refund.id);
  const existing = await repo.findDocumentByKey(documentKey, tx);
  if (existing) {
    await postIssuedBillingDocument(tx, existing.id);
    return mapDocument(existing);
  }
  const issuedAt = refund.processedAt ?? new Date();
  const { documentNumber, fiscalYear } = await repo.nextDocumentNumber(
    refund.propertyId,
    BillingDocumentType.CREDIT_NOTE,
    issuedAt,
    tx,
  );
  const tax = invoice.total.greaterThan(0)
    ? refund.amount
        .times(invoice.tax)
        .dividedBy(invoice.total)
        .toDecimalPlaces(2)
    : zeroDecimal;
  const subtotal = refund.amount.minus(tax);
  const document = await createDocumentSafely(
    () =>
      repo.createDocument(
        {
          documentKey,
          type: BillingDocumentType.CREDIT_NOTE,
          status: BillingDocumentStatus.ISSUED,
          documentNumber,
          fiscalYear,
          recipientGstin: invoice.recipientGstin,
          placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
          supplierStateCode: invoice.supplierStateCode,
          sacCode: invoice.sacCode,
          booking: { connect: { id: refund.bookingId } },
          payment: { connect: { id: refund.paymentId } },
          paymentRefund: { connect: { id: refund.id } },
          property: { connect: { id: refund.propertyId } },
          tenant: { connect: { id: refund.booking.property.tenantId } },
          subtotal,
          discount: zeroDecimal,
          taxable: subtotal,
          tax,
          total: refund.amount,
          paid: zeroDecimal,
          balance: zeroDecimal,
          guestSnapshot: toJson(invoice.guestSnapshot),
          propertySnapshot: toJson(invoice.propertySnapshot),
          ...(invoice.supplierSnapshot !== null && {
            supplierSnapshot: toJson(invoice.supplierSnapshot),
          }),
          ...(invoice.tenantSnapshot !== null && {
            tenantSnapshot: toJson(invoice.tenantSnapshot),
          }),
          bookingSnapshot: toJson(invoice.bookingSnapshot),
          priceSnapshot: toJson({
            refundId: refund.id,
            paymentId: refund.paymentId,
            originalInvoiceId: invoice.id,
          }),
          taxSnapshot: toJson(invoice.taxSnapshot ?? []),
          lineItems: toJson([
            {
              description: `Refund against ${invoice.documentNumber}`,
              quantity: 1,
              rate: subtotal.toString(),
              tax: tax.toString(),
              total: refund.amount.toString(),
            },
          ]),
          notes: refund.reason,
          issuedAt,
        },
        tx,
      ),
    documentKey,
    tx,
  );
  await postIssuedBillingDocument(tx, document.id);
  return mapDocument(document);
};

export const createReversalNoteForVoidedFolioCharge = async (
  bookingId: string,
  folioChargeId: string,
  reason: string,
  tx: Prisma.TransactionClient,
): Promise<BillingDocumentDTO | null> => {
  const [debitNote, creditNote] = await Promise.all([
    repo.findDocumentByKey(documentKeyForDebitNote(folioChargeId), tx),
    repo.findDocumentByKey(documentKeyForCreditNote(folioChargeId), tx),
  ]);
  const reversedDocument =
    debitNote?.status === BillingDocumentStatus.ISSUED
      ? debitNote
      : creditNote?.status === BillingDocumentStatus.ISSUED
        ? creditNote
        : null;
  if (!reversedDocument) return null;

  const reversalType =
    reversedDocument.type === BillingDocumentType.DEBIT_NOTE
      ? BillingDocumentType.CREDIT_NOTE
      : BillingDocumentType.DEBIT_NOTE;
  const documentKey =
    reversalType === BillingDocumentType.CREDIT_NOTE
      ? documentKeyForCreditNote(folioChargeId)
      : documentKeyForDebitNote(folioChargeId);
  const existing = await repo.findDocumentByKey(documentKey, tx);
  if (existing && existing.id !== reversedDocument.id)
    return mapDocument(existing);

  const booking = await repo.findBookingById(bookingId, tx);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  const charge = await tx.bookingFolioCharge.findUnique({
    where: { id: folioChargeId },
  });
  if (!charge) {
    throw new HttpError(
      404,
      "FOLIO_CHARGE_NOT_FOUND",
      "Folio charge not found",
    );
  }

  const issuedAt = new Date();
  const { documentNumber, fiscalYear } = await repo.nextDocumentNumber(
    booking.propertyId,
    reversalType,
    issuedAt,
    tx,
  );
  const taxIdentity = await getDocumentTaxIdentity(booking, tx);
  const supplierSnapshot =
    reversedDocument.supplierSnapshot === null
      ? await getSupplierSnapshot(booking.propertyId, tx)
      : toJson(reversedDocument.supplierSnapshot);
  const paid = await repo.sumNetSucceededPaymentsByBooking(booking.id, tx);
  const balance = maxDecimal(
    zeroDecimal,
    booking.totalAmount.plus(getFolioTotal(booking)).minus(paid),
  );
  const document = await createDocumentSafely(
    () =>
      repo.createDocument(
        {
          documentKey,
          type: reversalType,
          status: BillingDocumentStatus.ISSUED,
          documentNumber,
          fiscalYear,
          ...taxIdentity,
          booking: { connect: { id: booking.id } },
          folioCharge: { connect: { id: charge.id } },
          property: { connect: { id: booking.propertyId } },
          tenant: { connect: { id: booking.property.tenantId } },
          subtotal: reversedDocument.subtotal,
          discount: reversedDocument.discount,
          taxable: reversedDocument.taxable,
          tax: reversedDocument.tax,
          total: reversedDocument.total,
          paid: zeroDecimal,
          balance,
          guestSnapshot: toJson(reversedDocument.guestSnapshot),
          propertySnapshot: toJson(reversedDocument.propertySnapshot),
          supplierSnapshot,
          tenantSnapshot: toJson(reversedDocument.tenantSnapshot),
          bookingSnapshot: toJson(reversedDocument.bookingSnapshot),
          priceSnapshot: toJson({
            reversedDocumentId: reversedDocument.id,
            reversedDocumentNumber: reversedDocument.documentNumber,
            reason,
          }),
          taxSnapshot: toJson(reversedDocument.taxSnapshot ?? []),
          lineItems: toJson([
            {
              description: `Reversal of ${reversedDocument.documentNumber}: ${charge.description}`,
              quantity: 1,
              rate: reversedDocument.subtotal.toString(),
              tax: reversedDocument.tax.toString(),
              total: reversedDocument.total.toString(),
            },
          ]),
          notes: reason,
          issuedAt,
        },
        tx,
      ),
    documentKey,
    tx,
  );
  await postIssuedBillingDocument(tx, document.id);
  return mapDocument(document);
};

export const listDashboardDocuments = async (
  userId: string,
  filters: BillingDocumentListInput,
) => {
  const actor = await ensureActor(userId);
  const scopedIds = await getScopedPropertyIds(actor);

  if (filters.propertyId !== undefined) {
    await assertDashboardPropertyScope(actor, filters.propertyId);
  }

  if (scopedIds !== undefined && scopedIds.length === 0) {
    return normalizePaginationResult(filters.page, filters.limit, 0, []);
  }

  const { items, total } = await repo.listDocumentsPaginated(
    filters,
    scopedIds,
  );
  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapDocument),
  );
};

export const getDashboardDocument = async (
  userId: string,
  documentId: string,
) => {
  const actor = await ensureActor(userId);
  const document = await repo.findDocumentById(documentId);
  if (!document) {
    throw new HttpError(
      404,
      "BILLING_DOCUMENT_NOT_FOUND",
      "Billing document not found",
    );
  }

  await assertDashboardPropertyScope(actor, document.propertyId);
  return mapDocument(document);
};

export const generateDashboardInvoice = async (
  userId: string,
  bookingId: string,
) => {
  const actor = await ensureActor(userId);
  const booking = await repo.findBookingById(bookingId);
  if (!booking)
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  await assertDashboardPropertyScope(actor, booking.propertyId);
  return createInvoiceForBooking(bookingId);
};

export const generateDashboardReceipt = async (
  userId: string,
  paymentId: string,
) => {
  const actor = await ensureActor(userId);
  const payment = await repo.findPaymentById(paymentId);
  if (!payment)
    throw new HttpError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  await assertDashboardPropertyScope(actor, payment.propertyId);
  return createReceiptForPayment(paymentId);
};

export const voidDashboardDocument = async (
  userId: string,
  documentId: string,
  reason: string | undefined,
) => {
  const actor = await ensureActor(userId);
  if (
    actor.role !== UserRole.SUPER_ADMIN &&
    actor.role !== UserRole.ADMIN &&
    actor.role !== UserRole.ACCOUNTANT
  ) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  const document = await repo.findDocumentById(documentId);
  if (!document) {
    throw new HttpError(
      404,
      "BILLING_DOCUMENT_NOT_FOUND",
      "Billing document not found",
    );
  }

  await assertDashboardPropertyScope(actor, document.propertyId);
  return runBillingTransactionWithRetry(async (tx) => {
    const current = await repo.findDocumentById(documentId, tx);
    if (!current) {
      throw new HttpError(
        404,
        "BILLING_DOCUMENT_NOT_FOUND",
        "Billing document not found",
      );
    }
    if (current.status === BillingDocumentStatus.VOID)
      return mapDocument(current);
    const voidReason = reason?.trim() || "Voided by accounting user";
    const voided = await repo.voidDocument(
      documentId,
      voidReason,
      actor.id,
      tx,
    );
    await reverseBillingDocumentPosting(tx, documentId, actor.id, voidReason);
    return mapDocument(voided);
  });
};

export const getDashboardSetting = async (
  userId: string,
  propertyId: string,
) => {
  const actor = await ensureActor(userId);
  await assertDashboardPropertyScope(actor, propertyId);
  return mapSetting(await repo.getOrCreateSetting(propertyId));
};

export const listDashboardSettingAudits = async (
  userId: string,
  propertyId: string,
): Promise<BillingSettingAuditDTO[]> => {
  const actor = await ensureActor(userId);
  assertSettingWriteRole(actor);
  await assertDashboardPropertyScope(actor, propertyId);
  const audits = await repo.listSettingAudits(propertyId);
  return audits.map(mapSettingAudit);
};

export const updateDashboardSetting = async (
  userId: string,
  propertyId: string,
  input: UpdateBillingSettingInput,
) => {
  const actor = await ensureActor(userId);
  assertSettingWriteRole(actor);
  await assertDashboardPropertyScope(actor, propertyId);

  const setting = await repo.updateSettingWithAudit(
    propertyId,
    userId,
    input.reason,
    {
      ...(input.legalName !== undefined && { legalName: input.legalName }),
      ...(input.gstin !== undefined && { gstin: input.gstin }),
      ...(input.pan !== undefined && { pan: input.pan }),
      ...(input.billingAddress !== undefined && {
        billingAddress: input.billingAddress,
      }),
      ...(input.invoicePrefix !== undefined && {
        invoicePrefix: input.invoicePrefix,
      }),
      ...(input.receiptPrefix !== undefined && {
        receiptPrefix: input.receiptPrefix,
      }),
      ...(input.creditNotePrefix !== undefined && {
        creditNotePrefix: input.creditNotePrefix,
      }),
      ...(input.debitNotePrefix !== undefined && {
        debitNotePrefix: input.debitNotePrefix,
      }),
      ...(input.footerNotes !== undefined && {
        footerNotes: input.footerNotes,
      }),
      ...(input.stateCode !== undefined && { stateCode: input.stateCode }),
      ...(input.sacCode !== undefined && { sacCode: input.sacCode }),
    },
  );

  if (!setting) {
    throw new HttpError(
      400,
      "NO_BILLING_SETTING_CHANGES",
      "Change at least one billing setting before saving",
    );
  }

  return mapSetting(setting);
};

const assertPublicBookingAccess = async (
  bookingId: string,
  userId: string | undefined,
  checkoutToken: string | undefined,
) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking)
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  if (userId !== undefined && booking.userId === userId) return booking;
  if (checkoutToken !== undefined) {
    const lock = await repo.findReleasedInventoryLockByBookingToken(
      bookingId,
      checkoutToken,
    );
    if (lock) return booking;
  }

  throw new HttpError(403, "FORBIDDEN", "Access denied");
};

export const listPublicBookingDocuments = async (
  bookingId: string,
  userId: string | undefined,
  checkoutToken: string | undefined,
) => {
  await assertPublicBookingAccess(bookingId, userId, checkoutToken);
  const documents = await repo.findDocumentsByBookingId(bookingId);
  return documents.map(mapDocument);
};

export const getPublicDocument = async (
  documentId: string,
  userId: string | undefined,
  checkoutToken: string | undefined,
) => {
  const document = await repo.findDocumentById(documentId);
  if (!document) {
    throw new HttpError(
      404,
      "BILLING_DOCUMENT_NOT_FOUND",
      "Billing document not found",
    );
  }

  await assertPublicBookingAccess(document.bookingId, userId, checkoutToken);
  return mapDocument(document);
};

const renderDocumentPdfBuffer = async (document: BillingDocumentDTO) => {
  if (document.supplierSnapshot === null) {
    throw new HttpError(
      409,
      "BILLING_SUPPLIER_SNAPSHOT_MISSING",
      "This legacy document cannot be regenerated safely because its issued supplier identity was not snapshotted",
    );
  }
  const supplierSnapshot = mapSettingSnapshot(
    document.supplierSnapshot as Prisma.JsonValue,
  );
  const html = buildBillingDocumentHtml(document, supplierSnapshot);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
};

export const renderDocumentPdf = async (
  document: BillingDocumentDTO,
  dependencies: {
    render?: (document: BillingDocumentDTO) => Promise<Buffer>;
    upload?: (buffer: Buffer, document: BillingDocumentDTO) => Promise<string>;
  } = {},
) => {
  if (document.pdfStatus === "SUCCEEDED" && document.pdfUrl) {
    try {
      return await storageProvider.downloadFile(document.pdfUrl);
    } catch (error) {
      await repo.markDocumentRenderFailed(
        document.id,
        "Stored PDF is unavailable",
      );
      logError("Stored billing PDF could not be read", error, {
        operation: "billing.pdf.read",
        documentId: document.id,
      });
    }
  }

  if (document.supplierSnapshot === null) {
    throw new HttpError(
      409,
      "BILLING_SUPPLIER_SNAPSHOT_MISSING",
      "This legacy document cannot be regenerated safely because its issued supplier identity was not snapshotted",
    );
  }

  const correlationId = getCorrelationId();
  const claimed = await repo.claimDocumentRender(
    document.id,
    correlationId,
    new Date(Date.now() - 5 * 60 * 1000),
  );
  if (claimed.count !== 1) {
    const current = await repo.findDocumentById(document.id);
    if (current?.pdfStatus === "SUCCEEDED" && current.pdfUrl) {
      return storageProvider.downloadFile(current.pdfUrl);
    }
    throw new HttpError(
      current?.pdfStatus === "PROCESSING" ? 409 : 503,
      current?.pdfStatus === "PROCESSING"
        ? "PDF_RENDER_IN_PROGRESS"
        : "PDF_RENDER_RETRY_REQUIRED",
      current?.pdfStatus === "PROCESSING"
        ? "PDF generation is already in progress"
        : "PDF generation failed and requires an operator retry",
      { correlationId: current?.pdfCorrelationId ?? correlationId },
    );
  }

  try {
    const pdf = await (dependencies.render ?? renderDocumentPdfBuffer)(
      document,
    );
    const pdfUrl = await (
      dependencies.upload ??
      ((buffer, item) =>
        storageProvider.uploadBuffer(
          buffer,
          `${item.documentNumber}.pdf`,
          "application/pdf",
          "billing-documents",
        ))
    )(pdf, document);
    await repo.markDocumentRenderSucceeded(document.id, pdfUrl);
    return pdf;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF failure";
    await repo.markDocumentRenderFailed(document.id, message);
    logError("Billing PDF render failed", error, {
      operation: "billing.pdf.render",
      documentId: document.id,
      documentNumber: document.documentNumber,
      correlationId,
    });
    throw new HttpError(
      503,
      "PDF_RENDER_UNAVAILABLE",
      "PDF rendering is unavailable",
      { correlationId },
    );
  }
};

export const retryDashboardDocumentPdf = async (
  userId: string,
  documentId: string,
  dependencies: Parameters<typeof renderDocumentPdf>[1] = {},
) => {
  const document = await getDashboardDocument(userId, documentId);
  await repo.resetDocumentRenderForRetry(document.id);
  await renderDocumentPdf(document, dependencies);
  return getDashboardDocument(userId, documentId);
};

export const processPendingDocumentPdfs = async () => {
  const documents = await repo.listPendingDocumentRenders(
    SIDE_EFFECT_RETRY_POLICY.batchSize,
  );
  await Promise.allSettled(
    documents
      .filter((document) => document.supplierSnapshot !== null)
      .map((document) => renderDocumentPdf(mapDocument(document))),
  );
};

export const startBillingPdfProcessor = () => {
  void processPendingDocumentPdfs().catch((error) =>
    logError("Billing PDF processor failed", error),
  );
  const timer = setInterval(() => {
    void processPendingDocumentPdfs().catch((error) =>
      logError("Billing PDF processor failed", error),
    );
  }, SIDE_EFFECT_RETRY_POLICY.processorIntervalMs);
  timer.unref();
  return () => clearInterval(timer);
};
