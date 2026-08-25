import { HttpError } from "@/common/errors/http-error.js";
import { getCorrelationId } from "@/common/observability/request-context.js";
import { getBusinessDateValue } from "@/common/utils/business-date.js";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  JournalEntryStatus,
  LedgerSystemKey,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import {
  systemAccountDefinitions,
  tenderAccountForMethod,
} from "./accounting.accounts.js";

type LineInput = {
  account: LedgerSystemKey;
  debit?: Prisma.Decimal | undefined;
  credit?: Prisma.Decimal | undefined;
  bookingId?: string | undefined;
  paymentId?: string | undefined;
  paymentRefundId?: string | undefined;
  folioChargeId?: string | undefined;
  billingDocumentId?: string | undefined;
  description?: string | undefined;
};

type EntryInput = {
  tenantId: string;
  propertyId: string;
  timeZone: string;
  occurredAt: Date;
  sourceType: string;
  sourceId: string;
  sourceSubId?: string;
  idempotencyKey: string;
  description: string;
  currency: string;
  actorUserId?: string | undefined;
  reversalReason?: string | undefined;
  reversalOfEntryId?: string | undefined;
  lines: LineInput[];
};

const zero = new Prisma.Decimal(0);

const ensureAccounts = async (
  tx: Prisma.TransactionClient,
  tenantId: string,
) => {
  await Promise.all(
    systemAccountDefinitions.map(
      ([systemKey, code, name, accountType, normalBalance]) =>
        tx.ledgerAccount.upsert({
          where: { tenantId_systemKey: { tenantId, systemKey } },
          update: { code, name, accountType, normalBalance, isActive: true },
          create: {
            tenantId,
            systemKey,
            code,
            name,
            accountType,
            normalBalance,
          },
        }),
    ),
  );
  const accounts = await tx.ledgerAccount.findMany({ where: { tenantId } });
  return new Map(accounts.map((account) => [account.systemKey, account.id]));
};

const createEntry = async (tx: Prisma.TransactionClient, input: EntryInput) => {
  const existing = await tx.journalEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { lines: true },
  });
  if (existing) return existing;

  const debit = input.lines.reduce(
    (sum, line) => sum.plus(line.debit ?? zero),
    zero,
  );
  const credit = input.lines.reduce(
    (sum, line) => sum.plus(line.credit ?? zero),
    zero,
  );
  if (!debit.greaterThan(0) || !debit.equals(credit)) {
    throw new HttpError(
      500,
      "UNBALANCED_JOURNAL_ENTRY",
      "Accounting entry is not balanced",
    );
  }
  for (const line of input.lines) {
    const debitAmount = line.debit ?? zero;
    const creditAmount = line.credit ?? zero;
    if (
      debitAmount.isNegative() ||
      creditAmount.isNegative() ||
      debitAmount.greaterThan(0) === creditAmount.greaterThan(0)
    ) {
      throw new HttpError(
        500,
        "INVALID_JOURNAL_LINE",
        "Accounting line must contain one positive side",
      );
    }
  }

  const accountIds = await ensureAccounts(tx, input.tenantId);
  return tx.journalEntry.create({
    data: {
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      businessDate: new Date(
        `${getBusinessDateValue(input.occurredAt, input.timeZone)}T00:00:00.000Z`,
      ),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      ...(input.sourceSubId !== undefined && {
        sourceSubId: input.sourceSubId,
      }),
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      currency: input.currency,
      totalDebit: debit,
      totalCredit: credit,
      ...(input.actorUserId !== undefined && {
        actorUserId: input.actorUserId,
      }),
      correlationId: getCorrelationId(),
      ...(input.reversalReason !== undefined && {
        reversalReason: input.reversalReason,
      }),
      ...(input.reversalOfEntryId !== undefined && {
        reversalOfEntryId: input.reversalOfEntryId,
      }),
      lines: {
        create: input.lines.map((line) => ({
          ledgerAccountId: accountIds.get(line.account)!,
          debitAmount: line.debit ?? zero,
          creditAmount: line.credit ?? zero,
          ...(line.bookingId !== undefined && { bookingId: line.bookingId }),
          ...(line.paymentId !== undefined && { paymentId: line.paymentId }),
          ...(line.paymentRefundId !== undefined && {
            paymentRefundId: line.paymentRefundId,
          }),
          ...(line.folioChargeId !== undefined && {
            folioChargeId: line.folioChargeId,
          }),
          ...(line.billingDocumentId !== undefined && {
            billingDocumentId: line.billingDocumentId,
          }),
          ...(line.description !== undefined && {
            description: line.description,
          }),
        })),
      },
    },
    include: { lines: true },
  });
};

export const postSucceededPayment = async (
  tx: Prisma.TransactionClient,
  paymentId: string,
) => {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: { property: { include: { tenant: true } } },
  });
  if (!payment || payment.status !== PaymentStatus.SUCCEEDED) return null;
  const receivableDocument = await tx.billingDocument.findFirst({
    where: {
      bookingId: payment.bookingId,
      status: BillingDocumentStatus.ISSUED,
      type: {
        in: [BillingDocumentType.INVOICE, BillingDocumentType.DEBIT_NOTE],
      },
      issuedAt: { lte: payment.paidAt ?? payment.createdAt },
    },
  });
  const target = receivableDocument
    ? LedgerSystemKey.GUEST_RECEIVABLE
    : LedgerSystemKey.GUEST_DEPOSIT_LIABILITY;
  return createEntry(tx, {
    tenantId: payment.property.tenantId,
    propertyId: payment.propertyId,
    timeZone: payment.property.tenant.timezone,
    occurredAt: payment.paidAt ?? payment.createdAt,
    sourceType: "PAYMENT",
    sourceId: payment.id,
    idempotencyKey: `PAYMENT:${payment.id}:SUCCEEDED`,
    description: `Payment ${payment.id}`,
    currency: payment.currency,
    actorUserId: payment.receivedByUserId ?? undefined,
    lines: [
      {
        account: tenderAccountForMethod(payment.method),
        debit: payment.amount,
        bookingId: payment.bookingId,
        paymentId: payment.id,
      },
      {
        account: target,
        credit: payment.amount,
        bookingId: payment.bookingId,
        paymentId: payment.id,
      },
    ],
  });
};

const getDepositBalance = async (
  tx: Prisma.TransactionClient,
  tenantId: string,
  bookingId: string,
) => {
  const account = await tx.ledgerAccount.findUnique({
    where: {
      tenantId_systemKey: {
        tenantId,
        systemKey: LedgerSystemKey.GUEST_DEPOSIT_LIABILITY,
      },
    },
  });
  if (!account) return zero;
  const totals = await tx.journalLine.aggregate({
    where: { bookingId, ledgerAccountId: account.id },
    _sum: { debitAmount: true, creditAmount: true },
  });
  return (totals._sum.creditAmount ?? zero).minus(
    totals._sum.debitAmount ?? zero,
  );
};

export const postIssuedBillingDocument = async (
  tx: Prisma.TransactionClient,
  documentId: string,
  includeVoided = false,
) => {
  const document = await tx.billingDocument.findUnique({
    where: { id: documentId },
    include: { property: { include: { tenant: true } } },
  });
  if (
    !document ||
    (document.status !== BillingDocumentStatus.ISSUED &&
      !(includeVoided && document.status === BillingDocumentStatus.VOID)) ||
    document.type === BillingDocumentType.RECEIPT
  )
    return null;
  const revenue =
    document.type === BillingDocumentType.INVOICE
      ? LedgerSystemKey.ROOM_REVENUE
      : LedgerSystemKey.FOLIO_REVENUE;
  const isCredit = document.type === BillingDocumentType.CREDIT_NOTE;
  const net = document.total.minus(document.tax);
  const common = {
    bookingId: document.bookingId,
    billingDocumentId: document.id,
    folioChargeId: document.folioChargeId ?? undefined,
  };
  const lines: LineInput[] = isCredit
    ? [
        ...(net.greaterThan(0)
          ? [{ account: revenue, debit: net, ...common }]
          : []),
        ...(document.tax.greaterThan(0)
          ? [
              {
                account: LedgerSystemKey.GST_OUTPUT,
                debit: document.tax,
                ...common,
              },
            ]
          : []),
        {
          account: LedgerSystemKey.GUEST_RECEIVABLE,
          credit: document.total,
          ...common,
        },
      ]
    : [
        {
          account: LedgerSystemKey.GUEST_RECEIVABLE,
          debit: document.total,
          ...common,
        },
        ...(net.greaterThan(0)
          ? [{ account: revenue, credit: net, ...common }]
          : []),
        ...(document.tax.greaterThan(0)
          ? [
              {
                account: LedgerSystemKey.GST_OUTPUT,
                credit: document.tax,
                ...common,
              },
            ]
          : []),
      ];
  const entry = await createEntry(tx, {
    tenantId: document.property.tenantId,
    propertyId: document.propertyId,
    timeZone: document.property.tenant.timezone,
    occurredAt: document.issuedAt ?? document.createdAt,
    sourceType: "BILLING_DOCUMENT",
    sourceId: document.id,
    idempotencyKey: `BILLING_DOCUMENT:${document.id}:ISSUED`,
    description: `${document.type} ${document.documentNumber}`,
    currency: document.property.tenant.defaultCurrency,
    lines,
  });
  if (isCredit) return entry;
  const deposit = await getDepositBalance(
    tx,
    document.property.tenantId,
    document.bookingId,
  );
  const applied = deposit.greaterThan(document.total)
    ? document.total
    : deposit;
  if (applied.greaterThan(0)) {
    await createEntry(tx, {
      tenantId: document.property.tenantId,
      propertyId: document.propertyId,
      timeZone: document.property.tenant.timezone,
      occurredAt: document.issuedAt ?? document.createdAt,
      sourceType: "DEPOSIT_APPLICATION",
      sourceId: document.id,
      idempotencyKey: `BILLING_DOCUMENT:${document.id}:DEPOSIT_APPLICATION`,
      description: `Apply guest deposit to ${document.documentNumber}`,
      currency: document.property.tenant.defaultCurrency,
      lines: [
        {
          account: LedgerSystemKey.GUEST_DEPOSIT_LIABILITY,
          debit: applied,
          ...common,
        },
        {
          account: LedgerSystemKey.GUEST_RECEIVABLE,
          credit: applied,
          ...common,
        },
      ],
    });
  }
  return entry;
};

export const postSucceededRefund = async (
  tx: Prisma.TransactionClient,
  refundId: string,
) => {
  const refund = await tx.paymentRefund.findUnique({
    where: { id: refundId },
    include: {
      property: { include: { tenant: true } },
      payment: true,
      billingDocuments: true,
    },
  });
  if (!refund || refund.status !== PaymentRefundStatus.SUCCEEDED) return null;
  const issuedInvoice = await tx.billingDocument.findFirst({
    where: {
      bookingId: refund.bookingId,
      type: BillingDocumentType.INVOICE,
      status: {
        in: [BillingDocumentStatus.ISSUED, BillingDocumentStatus.VOID],
      },
    },
    select: { id: true },
  });
  const target =
    refund.billingDocuments.some(
      (document) => document.type === BillingDocumentType.CREDIT_NOTE,
    ) || issuedInvoice
      ? LedgerSystemKey.GUEST_RECEIVABLE
      : LedgerSystemKey.GUEST_DEPOSIT_LIABILITY;
  return createEntry(tx, {
    tenantId: refund.property.tenantId,
    propertyId: refund.propertyId,
    timeZone: refund.property.tenant.timezone,
    occurredAt: refund.processedAt ?? refund.createdAt,
    sourceType: "PAYMENT_REFUND",
    sourceId: refund.id,
    idempotencyKey: `PAYMENT_REFUND:${refund.id}:SUCCEEDED`,
    description: `Refund ${refund.id}`,
    currency: refund.currency,
    actorUserId: refund.userId,
    lines: [
      {
        account: target,
        debit: refund.amount,
        bookingId: refund.bookingId,
        paymentRefundId: refund.id,
        paymentId: refund.paymentId,
      },
      {
        account: tenderAccountForMethod(refund.payment.method),
        credit: refund.amount,
        bookingId: refund.bookingId,
        paymentRefundId: refund.id,
        paymentId: refund.paymentId,
      },
    ],
  });
};

export const reverseBillingDocumentPosting = async (
  tx: Prisma.TransactionClient,
  documentId: string,
  actorUserId: string,
  reason: string,
) => {
  const originals = await tx.journalEntry.findMany({
    where: {
      sourceId: documentId,
      sourceType: { in: ["BILLING_DOCUMENT", "DEPOSIT_APPLICATION"] },
    },
    include: {
      lines: { include: { ledgerAccount: true } },
      property: { include: { tenant: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const reversals = [];
  for (const original of originals) {
    const reversal = await createEntry(tx, {
      tenantId: original.tenantId,
      propertyId: original.propertyId,
      timeZone: original.property.tenant.timezone,
      occurredAt: new Date(),
      sourceType: "BILLING_DOCUMENT_VOID",
      sourceId: documentId,
      sourceSubId: original.id,
      idempotencyKey: `BILLING_DOCUMENT:${documentId}:VOID:${original.sourceType}`,
      description: `Reverse ${original.description}`,
      currency: original.currency,
      actorUserId,
      reversalReason: reason,
      reversalOfEntryId: original.id,
      lines: original.lines.map((line) => ({
        account: line.ledgerAccount.systemKey,
        debit: line.creditAmount.greaterThan(0) ? line.creditAmount : undefined,
        credit: line.debitAmount.greaterThan(0) ? line.debitAmount : undefined,
        bookingId: line.bookingId ?? undefined,
        paymentId: line.paymentId ?? undefined,
        paymentRefundId: line.paymentRefundId ?? undefined,
        folioChargeId: line.folioChargeId ?? undefined,
        billingDocumentId: line.billingDocumentId ?? undefined,
      })),
    });
    await tx.journalEntry.update({
      where: { id: original.id },
      data: { status: JournalEntryStatus.REVERSED },
    });
    reversals.push(reversal);
  }
  return reversals;
};
