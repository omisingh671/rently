import { chromium } from "playwright";
import { HttpError } from "@/common/errors/http-error.js";
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

const zeroDecimal = new Prisma.Decimal(0);

const toJson = (value: unknown): Prisma.InputJsonValue =>
  value as unknown as Prisma.InputJsonValue;

const maxDecimal = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.greaterThan(right) ? left : right;

const documentKeyForInvoice = (bookingId: string) => `INVOICE:${bookingId}`;
const documentKeyForReceipt = (paymentId: string) => `RECEIPT:${paymentId}`;
const maxBillingTransactionAttempts = 3;

const isRetryableBillingError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

const runBillingTransactionWithRetry = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  for (let attempt = 1; attempt <= maxBillingTransactionAttempts; attempt += 1) {
    try {
      return await repo.runBillingTransaction(callback);
    } catch (error) {
      if (attempt < maxBillingTransactionAttempts && isRetryableBillingError(error)) {
        continue;
      }

      throw error;
    }
  }

  return repo.runBillingTransaction(callback);
};

const mapDocument = (
  document: repo.BillingDocumentRecord,
): BillingDocumentDTO => ({
  id: document.id,
  type: document.type,
  status: document.status,
  documentNumber: document.documentNumber,
  bookingId: document.bookingId,
  paymentId: document.paymentId ?? null,
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

const buildGuestSnapshot = (booking: repo.BillingBookingRecord) => ({
  name: booking.guestNameSnapshot,
  email: booking.guestEmailSnapshot,
  contactNumber: booking.guestContactSnapshot ?? null,
  userId: booking.userId,
});

const buildPropertySnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.propertyId,
  name: booking.property.name,
  address: booking.property.address,
  city: booking.property.city,
  state: booking.property.state,
});

const buildTenantSnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.property.tenant.id,
  name: booking.property.tenant.name,
  slug: booking.property.tenant.slug,
  brandName: booking.property.tenant.brandName,
  defaultCurrency: booking.property.tenant.defaultCurrency,
  supportEmail: booking.property.tenant.supportEmail ?? null,
  supportPhone: booking.property.tenant.supportPhone ?? null,
});

const buildBookingSnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.id,
  bookingRef: booking.bookingRef,
  status: booking.status,
  bookingType: booking.bookingType,
  targetLabel: booking.targetLabel,
  productName: booking.productName,
  guestCount: booking.guestCount,
  comfortOption: booking.comfortOption,
  checkIn: booking.checkIn.toISOString(),
  checkOut: booking.checkOut.toISOString(),
  couponCode: booking.coupon?.code ?? null,
});

const buildLineItems = (booking: repo.BillingBookingRecord) =>
  booking.items.map((item) => ({
    id: item.id,
    description: item.productName,
    targetLabel: item.targetLabel,
    quantity: 1,
    rate: item.subtotalAmount.toString(),
    discount: item.discountAmount.toString(),
    taxable: item.taxableAmount.toString(),
    tax: item.taxAmount.toString(),
    total: item.finalAmount.toString(),
    taxBreakdown: item.taxBreakdown,
  }));

const buildPriceSnapshot = (booking: repo.BillingBookingRecord) => ({
  pricePerNight: booking.pricePerNight.toString(),
  subtotalAmount: booking.subtotalAmount.toString(),
  discountAmount: booking.discountAmount.toString(),
  taxableAmount: booking.taxableAmount.toString(),
  taxAmount: booking.taxAmount.toString(),
  totalAmount: booking.totalAmount.toString(),
  upfrontAmount: booking.upfrontAmount.toString(),
});

const buildPaymentSnapshot = (payment: repo.BillingPaymentRecord) => ({
  id: payment.id,
  provider: payment.provider,
  status: payment.status,
  purpose: payment.purpose,
  method: payment.method,
  amount: payment.amount.toString(),
  currency: payment.currency,
  paidAt: payment.paidAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
  receivedByUserId: payment.receivedByUserId ?? null,
});

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
    const balance = maxDecimal(zeroDecimal, booking.totalAmount.minus(paid));
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
            subtotal: booking.subtotalAmount,
            discount: booking.discountAmount,
            taxable: booking.taxableAmount,
            tax: booking.taxAmount,
            total: booking.totalAmount,
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
            subtotal: booking.subtotalAmount,
            discount: booking.discountAmount,
            taxable: booking.taxableAmount,
            tax: booking.taxAmount,
            total: booking.totalAmount,
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
    const balance = maxDecimal(zeroDecimal, booking.totalAmount.minus(cumulativePaid));
    if (balance.equals(zeroDecimal)) {
      await createInvoiceForBooking(payment.bookingId, client);
    }

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
  if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
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

export const renderDocumentPdf = async (document: BillingDocumentDTO) => {
  const setting = mapSetting(await repo.getOrCreateSetting(document.propertyId));
  const html = buildBillingDocumentHtml(document, setting);

  try {
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
  } catch {
    throw new HttpError(
      503,
      "PDF_RENDER_UNAVAILABLE",
      "PDF rendering is unavailable",
    );
  }
};
