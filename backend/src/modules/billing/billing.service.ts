import { chromium } from "playwright";
import { HttpError } from "@/common/errors/http-error.js";
import { isTransientDatabaseError, runWithBoundedRetry } from "@/common/retry/retry-policy.js";
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
  BillingSettingDTO,
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
import {
  buildBookingSnapshot,
  buildGuestSnapshot,
  buildLineItems,
  buildPaymentSnapshot,
  buildPriceSnapshot,
  buildPropertySnapshot,
  buildTenantSnapshot,
  getFolioTotal,
} from "./billing.snapshots.js";

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
  issuedAt: document.issuedAt?.toISOString() ?? null,
  voidedAt: document.voidedAt?.toISOString() ?? null,
  voidReason: document.voidReason ?? null,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
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
  createdAt: setting.createdAt.toISOString(),
  updatedAt: setting.updatedAt.toISOString(),
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
    throw new HttpError(404, "BILLING_DOCUMENT_NOT_FOUND", "Billing document not found");
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

    const paid = await repo.sumSucceededPaymentsByBooking(booking.id, client);
    const folioTotal = getFolioTotal(booking);
    const grandTotal = booking.totalAmount.plus(folioTotal);
    const balance = maxDecimal(zeroDecimal, grandTotal.minus(paid));
    if (balance.greaterThan(0)) {
      throw new HttpError(
        409,
        "BOOKING_BALANCE_DUE",
        "Invoice can be generated after full payment",
      );
    }

    const existing = await repo.findDocumentByKey(documentKey, client);
    if (existing) {
      if (existing.balance.greaterThan(0)) {
        return repo.updateDocument(
          existing.id,
          {
            subtotal: booking.subtotalAmount.plus(folioTotal),
            discount: booking.discountAmount,
            taxable: booking.taxableAmount.plus(folioTotal),
            tax: booking.taxAmount,
            total: grandTotal,
            paid,
            balance,
            guestSnapshot: toJson(buildGuestSnapshot(booking)),
            propertySnapshot: toJson(buildPropertySnapshot(booking)),
            tenantSnapshot: toJson(buildTenantSnapshot(booking)),
            bookingSnapshot: toJson(buildBookingSnapshot(booking)),
            priceSnapshot: toJson(buildPriceSnapshot(booking)),
            taxSnapshot: toJson(booking.taxBreakdown ?? []),
            lineItems: toJson(buildLineItems(booking)),
            issuedAt: new Date(),
          },
          client,
        );
      }

      return existing;
    }

    const documentNumber = await repo.nextDocumentNumber(
      booking.propertyId,
      BillingDocumentType.INVOICE,
      client,
    );

    return createDocumentSafely(
      () =>
        repo.createDocument(
          {
            documentKey,
            type: BillingDocumentType.INVOICE,
            status: BillingDocumentStatus.ISSUED,
            documentNumber,
            booking: { connect: { id: booking.id } },
            property: { connect: { id: booking.propertyId } },
            tenant: { connect: { id: booking.property.tenantId } },
            subtotal: booking.subtotalAmount.plus(folioTotal),
            discount: booking.discountAmount,
            taxable: booking.taxableAmount.plus(folioTotal),
            tax: booking.taxAmount,
            total: grandTotal,
            paid,
            balance,
            guestSnapshot: toJson(buildGuestSnapshot(booking)),
            propertySnapshot: toJson(buildPropertySnapshot(booking)),
            tenantSnapshot: toJson(buildTenantSnapshot(booking)),
            bookingSnapshot: toJson(buildBookingSnapshot(booking)),
            priceSnapshot: toJson(buildPriceSnapshot(booking)),
            taxSnapshot: toJson(booking.taxBreakdown ?? []),
            lineItems: toJson(buildLineItems(booking)),
            issuedAt: new Date(),
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
      throw new HttpError(404, "PAYMENT_NOT_FOUND", "Successful payment not found");
    }

    const booking = payment.booking;
    const cumulativePaid = await repo.sumSucceededPaymentsThroughPayment(
      payment,
      client,
    );
    const balance = maxDecimal(
      zeroDecimal,
      booking.totalAmount.plus(getFolioTotal(booking)).minus(cumulativePaid),
    );

    const documentNumber = await repo.nextDocumentNumber(
      payment.propertyId,
      BillingDocumentType.RECEIPT,
      client,
    );

    return createDocumentSafely(
      () =>
        repo.createDocument(
          {
            documentKey,
            type: BillingDocumentType.RECEIPT,
            status: BillingDocumentStatus.ISSUED,
            documentNumber,
            booking: { connect: { id: booking.id } },
            payment: { connect: { id: payment.id } },
            property: { connect: { id: payment.propertyId } },
            tenant: { connect: { id: booking.property.tenantId } },
            subtotal: booking.subtotalAmount,
            discount: booking.discountAmount,
            taxable: booking.taxableAmount,
            tax: booking.taxAmount,
            total: booking.totalAmount,
            paid: payment.amount,
            balance,
            guestSnapshot: toJson(buildGuestSnapshot(booking)),
            propertySnapshot: toJson(buildPropertySnapshot(booking)),
            tenantSnapshot: toJson(buildTenantSnapshot(booking)),
            bookingSnapshot: toJson(buildBookingSnapshot(booking)),
            priceSnapshot: toJson(buildPriceSnapshot(booking)),
            taxSnapshot: toJson(booking.taxBreakdown ?? []),
            paymentSnapshot: toJson(buildPaymentSnapshot(payment)),
            lineItems: toJson(buildLineItems(booking)),
            issuedAt: payment.paidAt ?? new Date(),
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
  const invoice = await repo.findDocumentByKey(documentKeyForInvoice(bookingId), tx);
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
    throw new HttpError(404, "FOLIO_CHARGE_NOT_FOUND", "Folio charge not found");
  }

  const metadata =
    charge.metadata !== null &&
    typeof charge.metadata === "object" &&
    !Array.isArray(charge.metadata)
      ? charge.metadata
      : {};
  const baseDifference = new Prisma.Decimal(
    typeof metadata.baseDifference === "string" ? metadata.baseDifference : charge.amount,
  );
  const taxDifference = new Prisma.Decimal(
    typeof metadata.taxDifference === "string" ? metadata.taxDifference : 0,
  );
  const documentNumber = await repo.nextDocumentNumber(
    booking.propertyId,
    BillingDocumentType.DEBIT_NOTE,
    tx,
  );
  const paid = await repo.sumSucceededPaymentsByBooking(booking.id, tx);
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
          booking: { connect: { id: booking.id } },
          folioCharge: { connect: { id: charge.id } },
          property: { connect: { id: booking.propertyId } },
          tenant: { connect: { id: booking.property.tenantId } },
          subtotal: baseDifference,
          discount: zeroDecimal,
          taxable: baseDifference,
          tax: taxDifference,
          total: charge.amount,
          paid: zeroDecimal,
          balance,
          guestSnapshot: toJson(buildGuestSnapshot(booking)),
          propertySnapshot: toJson(buildPropertySnapshot(booking)),
          tenantSnapshot: toJson(buildTenantSnapshot(booking)),
          bookingSnapshot: toJson(buildBookingSnapshot(booking)),
          priceSnapshot: toJson(metadata),
          taxSnapshot: toJson(metadata.taxBreakdown ?? []),
          lineItems: toJson([
            {
              description: charge.description,
              targetLabel: booking.targetLabel,
              quantity: 1,
              rate: baseDifference.toString(),
              tax: taxDifference.toString(),
              total: charge.amount.toString(),
            },
          ]),
          notes: charge.note,
          issuedAt: new Date(),
        },
        tx,
      ),
    documentKey,
    tx,
  );
  return mapDocument(document);
};

export const createCreditNoteForFolioCredit = async (
  bookingId: string,
  folioChargeId: string,
  tx: Prisma.TransactionClient,
): Promise<BillingDocumentDTO | null> => {
  const invoice = await repo.findDocumentByKey(documentKeyForInvoice(bookingId), tx);
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
    throw new HttpError(404, "FOLIO_CHARGE_NOT_FOUND", "Folio charge not found");
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
  const subtotal = new Prisma.Decimal(
    typeof metadata.baseDifference === "string"
      ? metadata.baseDifference
      : charge.amount,
  ).abs();
  const tax = new Prisma.Decimal(
    typeof metadata.taxDifference === "string" ? metadata.taxDifference : 0,
  ).abs();
  const total = charge.amount.abs();
  const documentNumber = await repo.nextDocumentNumber(
    booking.propertyId,
    BillingDocumentType.CREDIT_NOTE,
    tx,
  );
  const paid = await repo.sumSucceededPaymentsByBooking(booking.id, tx);
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
          tenantSnapshot: toJson(buildTenantSnapshot(booking)),
          bookingSnapshot: toJson(buildBookingSnapshot(booking)),
          priceSnapshot: toJson(metadata),
          taxSnapshot: toJson(metadata.taxBreakdown ?? []),
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
          issuedAt: new Date(),
        },
        tx,
      ),
    documentKey,
    tx,
  );
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
  if (existing && existing.id !== reversedDocument.id) return mapDocument(existing);

  const booking = await repo.findBookingById(bookingId, tx);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  const charge = await tx.bookingFolioCharge.findUnique({
    where: { id: folioChargeId },
  });
  if (!charge) {
    throw new HttpError(404, "FOLIO_CHARGE_NOT_FOUND", "Folio charge not found");
  }

  const documentNumber = await repo.nextDocumentNumber(
    booking.propertyId,
    reversalType,
    tx,
  );
  const paid = await repo.sumSucceededPaymentsByBooking(booking.id, tx);
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
          issuedAt: new Date(),
        },
        tx,
      ),
    documentKey,
    tx,
  );
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

  const { items, total } = await repo.listDocumentsPaginated(filters, scopedIds);
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
    throw new HttpError(404, "BILLING_DOCUMENT_NOT_FOUND", "Billing document not found");
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
  if (!booking) throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  await assertDashboardPropertyScope(actor, booking.propertyId);
  return createInvoiceForBooking(bookingId);
};

export const generateDashboardReceipt = async (
  userId: string,
  paymentId: string,
) => {
  const actor = await ensureActor(userId);
  const payment = await repo.findPaymentById(paymentId);
  if (!payment) throw new HttpError(404, "PAYMENT_NOT_FOUND", "Payment not found");
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
    throw new HttpError(404, "BILLING_DOCUMENT_NOT_FOUND", "Billing document not found");
  }

  await assertDashboardPropertyScope(actor, document.propertyId);
  return mapDocument(await repo.voidDocument(documentId, reason));
};

export const getDashboardSetting = async (
  userId: string,
  propertyId: string,
) => {
  const actor = await ensureActor(userId);
  await assertDashboardPropertyScope(actor, propertyId);
  return mapSetting(await repo.getOrCreateSetting(propertyId));
};

export const updateDashboardSetting = async (
  userId: string,
  propertyId: string,
  input: UpdateBillingSettingInput,
) => {
  const actor = await ensureActor(userId);
  assertSettingWriteRole(actor);
  await assertDashboardPropertyScope(actor, propertyId);

  const setting = await repo.updateSetting(propertyId, {
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
    ...(input.footerNotes !== undefined && { footerNotes: input.footerNotes }),
  });

  return mapSetting(setting);
};

const assertPublicBookingAccess = async (
  bookingId: string,
  userId: string | undefined,
  checkoutToken: string | undefined,
) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
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
    throw new HttpError(404, "BILLING_DOCUMENT_NOT_FOUND", "Billing document not found");
  }

  await assertPublicBookingAccess(document.bookingId, userId, checkoutToken);
  return mapDocument(document);
};

const renderDocumentPdfBuffer = async (document: BillingDocumentDTO) => {
  const setting = mapSetting(await repo.getOrCreateSetting(document.propertyId));
  const html = buildBillingDocumentHtml(document, setting);
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
      await repo.markDocumentRenderFailed(document.id, "Stored PDF is unavailable");
      logError("Stored billing PDF could not be read", error, {
        operation: "billing.pdf.read",
        documentId: document.id,
      });
    }
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
    const pdf = await (dependencies.render ?? renderDocumentPdfBuffer)(document);
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
    const message = error instanceof Error ? error.message : "Unknown PDF failure";
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
