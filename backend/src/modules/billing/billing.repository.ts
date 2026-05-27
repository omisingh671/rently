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
export type BillingActorRecord = Prisma.UserGetPayload<Record<string, never>>;

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

export const updateSetting = (
  propertyId: string,
  data: {
    legalName?: string | null;
    gstin?: string | null;
    pan?: string | null;
    billingAddress?: string | null;
    invoicePrefix?: string;
    receiptPrefix?: string;
    creditNotePrefix?: string;
    footerNotes?: string | null;
  },
) =>
  prisma.billingSetting.upsert({
    where: { propertyId },
    update: data,
    create: {
      property: { connect: { id: propertyId } },
      ...data,
    },
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
          : { creditNoteSequence: { increment: 1 } },
    create:
      type === BillingDocumentType.INVOICE
        ? { propertyId, invoiceSequence: 1 }
        : type === BillingDocumentType.RECEIPT
          ? { propertyId, receiptSequence: 1 }
          : { propertyId, creditNoteSequence: 1 },
  });
  const sequence =
    type === BillingDocumentType.INVOICE
      ? setting.invoiceSequence
      : type === BillingDocumentType.RECEIPT
        ? setting.receiptSequence
        : setting.creditNoteSequence;
  const prefix =
    type === BillingDocumentType.INVOICE
      ? setting.invoicePrefix
      : type === BillingDocumentType.RECEIPT
        ? setting.receiptPrefix
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

export const propertyScopeRoleForUser = (role: UserRole) =>
  role === UserRole.ADMIN
    ? PropertyAssignmentRole.ADMIN
    : role === UserRole.MANAGER
      ? PropertyAssignmentRole.MANAGER
      : null;
