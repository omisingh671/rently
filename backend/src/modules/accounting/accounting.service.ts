import { HttpError } from "@/common/errors/http-error.js";
import {
  getActor,
  getPropertyScope,
} from "@/common/services/scoping.service.js";
import { prisma } from "@/db/prisma.js";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import type { z } from "zod";
import type { accountingQuerySchema } from "./accounting.schema.js";

type Query = z.infer<typeof accountingQuerySchema>;

const getScope = async (userId: string, propertyId?: string) => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  const propertyIds = scope.isGlobal ? undefined : scope.propertyIds;
  if (
    propertyId &&
    propertyIds !== undefined &&
    !propertyIds.includes(propertyId)
  ) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  return propertyId ? [propertyId] : propertyIds;
};

const whereFor = (
  query: Query,
  propertyIds?: string[],
): Prisma.JournalEntryWhereInput => ({
  ...(propertyIds !== undefined && { propertyId: { in: propertyIds } }),
  businessDate: {
    gte: new Date(`${query.startDate}T00:00:00.000Z`),
    lte: new Date(`${query.endDate}T00:00:00.000Z`),
  },
  ...(query.sourceType !== undefined && { sourceType: query.sourceType }),
});

const mapEntry = (
  entry: Prisma.JournalEntryGetPayload<{
    include: { lines: { include: { ledgerAccount: true } } };
  }>,
) => ({
  id: entry.id,
  propertyId: entry.propertyId,
  businessDate: entry.businessDate.toISOString().slice(0, 10),
  sourceType: entry.sourceType,
  sourceId: entry.sourceId,
  sourceSubId: entry.sourceSubId,
  description: entry.description,
  status: entry.status,
  currency: entry.currency,
  totalDebit: entry.totalDebit.toString(),
  totalCredit: entry.totalCredit.toString(),
  actorUserId: entry.actorUserId,
  correlationId: entry.correlationId,
  reversalOfEntryId: entry.reversalOfEntryId,
  postedAt: entry.postedAt.toISOString(),
  lines: entry.lines.map((line) => ({
    id: line.id,
    accountCode: line.ledgerAccount.code,
    accountName: line.ledgerAccount.name,
    systemKey: line.ledgerAccount.systemKey,
    debit: line.debitAmount.toString(),
    credit: line.creditAmount.toString(),
    bookingId: line.bookingId,
    paymentId: line.paymentId,
    paymentRefundId: line.paymentRefundId,
    billingDocumentId: line.billingDocumentId,
    description: line.description,
  })),
});

export const listJournal = async (userId: string, query: Query) => {
  const propertyIds = await getScope(userId, query.propertyId);
  if (propertyIds?.length === 0)
    return { page: query.page, limit: query.limit, total: 0, items: [] };
  const where = whereFor(query, propertyIds);
  const [total, items] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: { ledgerAccount: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ businessDate: "desc" }, { postedAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    page: query.page,
    limit: query.limit,
    total,
    items: items.map(mapEntry),
  };
};

export const getJournalEntry = async (userId: string, id: string) => {
  const propertyIds = await getScope(userId);
  const entry = await prisma.journalEntry.findFirst({
    where: {
      id,
      ...(propertyIds !== undefined && { propertyId: { in: propertyIds } }),
    },
    include: {
      lines: {
        include: { ledgerAccount: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!entry)
    throw new HttpError(
      404,
      "JOURNAL_ENTRY_NOT_FOUND",
      "Journal entry not found",
    );
  return mapEntry(entry);
};

export const reconcile = async (userId: string, query: Query) => {
  const propertyIds = await getScope(userId, query.propertyId);
  if (propertyIds?.length === 0)
    return {
      balanced: true,
      missing: { payments: 0, refunds: 0, billingDocuments: 0 },
      unbalancedEntries: 0,
    };
  const propertyWhere =
    propertyIds === undefined ? {} : { propertyId: { in: propertyIds } };
  const occurred = {
    gte: new Date(`${query.startDate}T00:00:00.000Z`),
    lte: new Date(`${query.endDate}T23:59:59.999Z`),
  };
  const [
    payments,
    refunds,
    documents,
    paymentEntries,
    refundEntries,
    documentEntries,
    unbalancedEntries,
  ] = await Promise.all([
    prisma.payment.count({
      where: {
        ...propertyWhere,
        status: PaymentStatus.SUCCEEDED,
        paidAt: occurred,
      },
    }),
    prisma.paymentRefund.count({
      where: {
        ...propertyWhere,
        status: PaymentRefundStatus.SUCCEEDED,
        processedAt: occurred,
      },
    }),
    prisma.billingDocument.count({
      where: {
        ...propertyWhere,
        status: {
          in: [BillingDocumentStatus.ISSUED, BillingDocumentStatus.VOID],
        },
        type: {
          in: [
            BillingDocumentType.INVOICE,
            BillingDocumentType.DEBIT_NOTE,
            BillingDocumentType.CREDIT_NOTE,
          ],
        },
        issuedAt: occurred,
      },
    }),
    prisma.journalEntry.count({
      where: { ...whereFor(query, propertyIds), sourceType: "PAYMENT" },
    }),
    prisma.journalEntry.count({
      where: { ...whereFor(query, propertyIds), sourceType: "PAYMENT_REFUND" },
    }),
    prisma.journalEntry.count({
      where: {
        ...whereFor(query, propertyIds),
        sourceType: "BILLING_DOCUMENT",
      },
    }),
    prisma.journalEntry.count({
      where: {
        ...whereFor(query, propertyIds),
        NOT: { totalDebit: { equals: prisma.journalEntry.fields.totalCredit } },
      },
    }),
  ]);
  const missing = {
    payments: Math.max(0, payments - paymentEntries),
    refunds: Math.max(0, refunds - refundEntries),
    billingDocuments: Math.max(0, documents - documentEntries),
  };
  return {
    balanced:
      unbalancedEntries === 0 &&
      Object.values(missing).every((count) => count === 0),
    operational: { payments, refunds, billingDocuments: documents },
    posted: {
      payments: paymentEntries,
      refunds: refundEntries,
      billingDocuments: documentEntries,
    },
    missing,
    unbalancedEntries,
  };
};
