import { prisma } from "@/db/prisma.js";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  PaymentStatus,
  Prisma,
  PropertyAssignmentRole,
  UserRole,
} from "@/generated/prisma/client.js";
import type { BillingDocumentListInput } from "./billing.inputs.js";

type BillingDbClient = typeof prisma | Prisma.TransactionClient;

const client = (tx?: Prisma.TransactionClient): BillingDbClient => tx ?? prisma;

export const billingDocumentInclude = {
  booking: true,
  payment: true,
  folioCharge: true,
  property: {
    include: {
      tenant: true,
    },
  },
  tenant: true,
} satisfies Prisma.BillingDocumentInclude;

const billingBookingInclude = {
  property: {
    include: {
      tenant: true,
    },
  },
  user: true,
  items: {
    orderBy: {
      createdAt: "asc",
    },
  },
  payments: {
    orderBy: {
      createdAt: "asc",
    },
  },
  folioCharges: {
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  },
  coupon: true,
} satisfies Prisma.BookingInclude;

const billingPaymentInclude = {
  booking: {
    include: billingBookingInclude,
  },
  property: {
    include: {
      tenant: true,
    },
  },
  user: true,
  receivedBy: true,
} satisfies Prisma.PaymentInclude;

export type BillingDocumentRecord = Prisma.BillingDocumentGetPayload<{
  include: typeof billingDocumentInclude;
}>;
export type BillingBookingRecord = Prisma.BookingGetPayload<{
  include: typeof billingBookingInclude;
}>;
export type BillingPaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof billingPaymentInclude;
}>;
export type BillingSettingRecord = Prisma.BillingSettingGetPayload<Record<string, never>>;
export type BillingSettingAuditRecord = Prisma.BillingSettingAuditGetPayload<{
  include: {
    actor: { select: { id: true; fullName: true; email: true } };
  };
}>;
export type BillingActorRecord = Prisma.UserGetPayload<Record<string, never>>;

export interface BillingSettingUpdateData {
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

export const findUserById = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
  });

export const listAssignedPropertyIds = async (
  userId: string,
  role: PropertyAssignmentRole,
) => {
  const assignments = await prisma.propertyAssignment.findMany({
    where: { userId, role },
    select: { propertyId: true },
  });

  return assignments.map((assignment) => assignment.propertyId);
};

export const findBookingById = (
  bookingId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.findUnique({
    where: { id: bookingId },
    include: billingBookingInclude,
  });

export const findPaymentById = (
  paymentId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.findUnique({
    where: { id: paymentId },
    include: billingPaymentInclude,
  });

export const findDocumentByKey = (
  documentKey: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).billingDocument.findUnique({
    where: { documentKey },
    include: billingDocumentInclude,
  });

export const findDocumentById = (
  documentId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).billingDocument.findUnique({
    where: { id: documentId },
    include: billingDocumentInclude,
  });

export const findDocumentsByBookingId = (
  bookingId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).billingDocument.findMany({
    where: {
      bookingId,
      status: {
        not: BillingDocumentStatus.VOID,
      },
    },
    include: billingDocumentInclude,
    orderBy: [{ issuedAt: "asc" }, { createdAt: "asc" }],
  });

export const findReleasedInventoryLockByBookingToken = (
  bookingId: string,
  lockToken: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.findFirst({
    where: {
      bookingId,
      lockToken,
      releasedAt: {
        not: null,
      },
    },
    select: { id: true },
  });

const buildBillingWhere = (
  filters: BillingDocumentListInput,
  propertyIds?: string[],
): Prisma.BillingDocumentWhereInput => ({
  ...(propertyIds !== undefined && { propertyId: { in: propertyIds } }),
  ...(filters.propertyId !== undefined && { propertyId: filters.propertyId }),
  ...(filters.type !== undefined && { type: filters.type }),
  ...(filters.status !== undefined && { status: filters.status }),
  ...(filters.from !== undefined || filters.to !== undefined
    ? {
        issuedAt: {
          ...(filters.from !== undefined && { gte: filters.from }),
          ...(filters.to !== undefined && { lte: filters.to }),
        },
      }
    : {}),
  ...(filters.bookingRef !== undefined || filters.guest !== undefined
    ? {
        booking: {
          ...(filters.bookingRef !== undefined && {
            bookingRef: { contains: filters.bookingRef },
          }),
          ...(filters.guest !== undefined && {
            OR: [
              { guestNameSnapshot: { contains: filters.guest } },
              { guestEmailSnapshot: { contains: filters.guest } },
            ],
          }),
        },
      }
    : {}),
});

export const listDocumentsPaginated = async (
  filters: BillingDocumentListInput,
  propertyIds?: string[],
) => {
  const where = buildBillingWhere(filters, propertyIds);
  const [items, total] = await Promise.all([
    prisma.billingDocument.findMany({
      where,
      include: billingDocumentInclude,
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.billingDocument.count({ where }),
  ]);

  return { items, total };
};

export const getOrCreateSetting = (
  propertyId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).billingSetting.upsert({
    where: { propertyId },
    update: {},
    create: { propertyId },
  });

const toSettingAuditJson = (
  setting: BillingSettingRecord,
): Prisma.InputJsonValue => ({
  legalName: setting.legalName,
  gstin: setting.gstin,
  pan: setting.pan,
  billingAddress: setting.billingAddress,
  invoicePrefix: setting.invoicePrefix,
  receiptPrefix: setting.receiptPrefix,
  creditNotePrefix: setting.creditNotePrefix,
  debitNotePrefix: setting.debitNotePrefix,
  footerNotes: setting.footerNotes,
});

const hasSettingChanges = (
  current: BillingSettingRecord,
  data: BillingSettingUpdateData,
) =>
  (data.legalName !== undefined && data.legalName !== current.legalName) ||
  (data.gstin !== undefined && data.gstin !== current.gstin) ||
  (data.pan !== undefined && data.pan !== current.pan) ||
  (data.billingAddress !== undefined && data.billingAddress !== current.billingAddress) ||
  (data.invoicePrefix !== undefined && data.invoicePrefix !== current.invoicePrefix) ||
  (data.receiptPrefix !== undefined && data.receiptPrefix !== current.receiptPrefix) ||
  (data.creditNotePrefix !== undefined && data.creditNotePrefix !== current.creditNotePrefix) ||
  (data.debitNotePrefix !== undefined && data.debitNotePrefix !== current.debitNotePrefix) ||
  (data.footerNotes !== undefined && data.footerNotes !== current.footerNotes);

export const listSettingAudits = (
  propertyId: string,
): Promise<BillingSettingAuditRecord[]> =>
  prisma.billingSettingAudit.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { id: true, fullName: true, email: true } },
    },
  });

export const updateSettingWithAudit = (
  propertyId: string,
  actorUserId: string,
  reason: string,
  data: BillingSettingUpdateData,
) =>
  prisma.$transaction(async (tx) => {
    const previous = await tx.billingSetting.upsert({
      where: { propertyId },
      update: {},
      create: { propertyId },
    });

    if (!hasSettingChanges(previous, data)) return null;

    const next = await tx.billingSetting.update({
      where: { propertyId },
      data,
    });

    await tx.billingSettingAudit.create({
      data: {
        billingSettingId: next.id,
        propertyId,
        actorUserId,
        reason,
        previousData: toSettingAuditJson(previous),
        nextData: toSettingAuditJson(next),
      },
    });

    return next;
  });

export const nextDocumentNumber = async (
  propertyId: string,
  type: BillingDocumentType,
  tx: Prisma.TransactionClient,
) => {
  const setting = await tx.billingSetting.upsert({
    where: { propertyId },
    update:
      type === BillingDocumentType.INVOICE
        ? { invoiceSequence: { increment: 1 } }
        : type === BillingDocumentType.RECEIPT
          ? { receiptSequence: { increment: 1 } }
          : type === BillingDocumentType.DEBIT_NOTE
            ? { debitNoteSequence: { increment: 1 } }
            : { creditNoteSequence: { increment: 1 } },
    create:
      type === BillingDocumentType.INVOICE
        ? { propertyId, invoiceSequence: 1 }
        : type === BillingDocumentType.RECEIPT
          ? { propertyId, receiptSequence: 1 }
          : type === BillingDocumentType.DEBIT_NOTE
            ? { propertyId, debitNoteSequence: 1 }
            : { propertyId, creditNoteSequence: 1 },
  });
  const sequence =
    type === BillingDocumentType.INVOICE
      ? setting.invoiceSequence
      : type === BillingDocumentType.RECEIPT
        ? setting.receiptSequence
        : type === BillingDocumentType.DEBIT_NOTE
          ? setting.debitNoteSequence
          : setting.creditNoteSequence;
  const prefix =
    type === BillingDocumentType.INVOICE
      ? setting.invoicePrefix
      : type === BillingDocumentType.RECEIPT
        ? setting.receiptPrefix
        : type === BillingDocumentType.DEBIT_NOTE
          ? setting.debitNotePrefix
          : setting.creditNotePrefix;

  return `${prefix}${String(sequence).padStart(6, "0")}`;
};

export const createDocument = (
  data: Prisma.BillingDocumentCreateInput,
  tx: Prisma.TransactionClient,
) =>
  tx.billingDocument.create({
    data,
    include: billingDocumentInclude,
  });

export const updateDocument = (
  documentId: string,
  data: Prisma.BillingDocumentUpdateInput,
  tx: Prisma.TransactionClient,
) =>
  tx.billingDocument.update({
    where: { id: documentId },
    data,
    include: billingDocumentInclude,
  });

export const claimDocumentRender = (
  documentId: string,
  correlationId: string,
  staleBefore: Date,
) =>
  prisma.billingDocument.updateMany({
    where: {
      id: documentId,
      OR: [
        {
          pdfStatus: { in: ["PENDING", "FAILED"] },
          pdfAttemptCount: { lt: prisma.billingDocument.fields.pdfMaxAttempts },
        },
        {
          pdfStatus: "PROCESSING",
          pdfProcessingStartedAt: { lt: staleBefore },
        },
      ],
    },
    data: {
      pdfStatus: "PROCESSING",
      pdfAttemptCount: { increment: 1 },
      pdfLastError: null,
      pdfCorrelationId: correlationId,
      pdfProcessingStartedAt: new Date(),
    },
  });

export const markDocumentRenderSucceeded = (
  documentId: string,
  pdfUrl: string,
) =>
  prisma.billingDocument.update({
    where: { id: documentId },
    data: {
      pdfUrl,
      pdfStatus: "SUCCEEDED",
      pdfLastError: null,
      pdfProcessingStartedAt: null,
      pdfRenderedAt: new Date(),
    },
    include: billingDocumentInclude,
  });

export const markDocumentRenderFailed = (
  documentId: string,
  errorMessage: string,
) =>
  prisma.billingDocument.update({
    where: { id: documentId },
    data: {
      pdfStatus: "FAILED",
      pdfLastError: errorMessage.slice(0, 4000),
      pdfProcessingStartedAt: null,
    },
    include: billingDocumentInclude,
  });

export const resetDocumentRenderForRetry = (documentId: string) =>
  prisma.billingDocument.updateMany({
    where: { id: documentId, pdfStatus: "FAILED" },
    data: {
      pdfStatus: "PENDING",
      pdfAttemptCount: 0,
      pdfLastError: null,
      pdfProcessingStartedAt: null,
    },
  });

export const sumSucceededPaymentsByBooking = async (
  bookingId: string,
  tx?: Prisma.TransactionClient,
) => {
  const result = await client(tx).payment.aggregate({
    where: { bookingId, status: PaymentStatus.SUCCEEDED },
    _sum: { amount: true },
  });

  return result._sum.amount ?? new Prisma.Decimal(0);
};

export const sumSucceededPaymentsThroughPayment = async (
  payment: BillingPaymentRecord,
  tx?: Prisma.TransactionClient,
) => {
  const result = await client(tx).payment.aggregate({
    where: {
      bookingId: payment.bookingId,
      status: PaymentStatus.SUCCEEDED,
      createdAt: { lte: payment.createdAt },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ?? new Prisma.Decimal(0);
};

export const voidDocument = (
  documentId: string,
  reason: string | undefined,
) =>
  prisma.billingDocument.update({
    where: { id: documentId },
    data: {
      status: BillingDocumentStatus.VOID,
      voidedAt: new Date(),
      ...(reason !== undefined && { voidReason: reason }),
    },
    include: billingDocumentInclude,
  });

export const runBillingTransaction = <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  prisma.$transaction(callback, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 10_000,
  });

export const propertyScopeRoleForUser = (role: UserRole) => {
  const assignmentRoleByUserRole: Partial<
    Record<UserRole, PropertyAssignmentRole>
  > = {
    [UserRole.ADMIN]: PropertyAssignmentRole.ADMIN,
    [UserRole.MANAGER]: PropertyAssignmentRole.MANAGER,
    [UserRole.FRONT_DESK]: PropertyAssignmentRole.FRONT_DESK,
    [UserRole.ACCOUNTANT]: PropertyAssignmentRole.ACCOUNTANT,
  };
  return assignmentRoleByUserRole[role] ?? null;
};
