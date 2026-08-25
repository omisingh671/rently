import "dotenv/config";
import { prisma } from "@/db/prisma.js";
import { parseDatabaseUrl } from "@/config/database-url.js";
import {
  BillingDocumentType,
  PaymentRefundStatus,
  PaymentStatus,
} from "@/generated/prisma/client.js";
import {
  postIssuedBillingDocument,
  postSucceededPayment,
  postSucceededRefund,
  reverseBillingDocumentPosting,
} from "@/modules/accounting/accounting.posting.js";

const args = new Set(process.argv.slice(2));
const value = (name: string) =>
  process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const apply = args.has("--apply");
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const database = parseDatabaseUrl(databaseUrl).database;
const propertyId = value("property");
const from = value("from");
const to = value("to");
const confirmDatabase = value("confirm-database");

if (apply && confirmDatabase !== database) {
  throw new Error(
    `Refusing to write. Pass --confirm-database=${database} after reviewing the dry run.`,
  );
}

const occurredAt = {
  ...(from !== undefined && { gte: new Date(`${from}T00:00:00.000Z`) }),
  ...(to !== undefined && { lte: new Date(`${to}T23:59:59.999Z`) }),
};
const propertyFilter = propertyId === undefined ? {} : { propertyId };

const main = async () => {
  const [payments, documents, refunds] = await Promise.all([
    prisma.payment.findMany({
      where: {
        ...propertyFilter,
        status: PaymentStatus.SUCCEEDED,
        ...(Object.keys(occurredAt).length > 0 && { paidAt: occurredAt }),
      },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.billingDocument.findMany({
      where: {
        ...propertyFilter,
        type: {
          in: [
            BillingDocumentType.INVOICE,
            BillingDocumentType.DEBIT_NOTE,
            BillingDocumentType.CREDIT_NOTE,
          ],
        },
        ...(Object.keys(occurredAt).length > 0 && { issuedAt: occurredAt }),
      },
      orderBy: [{ issuedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        status: true,
        voidedByUserId: true,
        voidReason: true,
      },
    }),
    prisma.paymentRefund.findMany({
      where: {
        ...propertyFilter,
        status: PaymentRefundStatus.SUCCEEDED,
        ...(Object.keys(occurredAt).length > 0 && { processedAt: occurredAt }),
      },
      orderBy: [{ processedAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  const summary = {
    database,
    mode: apply ? "apply" : "dry-run",
    propertyId: propertyId ?? null,
    from: from ?? null,
    to: to ?? null,
    payments: payments.length,
    billingDocuments: documents.length,
    refunds: refunds.length,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!apply) return;

  for (const payment of payments) {
    await prisma.$transaction((tx) => postSucceededPayment(tx, payment.id));
  }
  for (const document of documents) {
    await prisma.$transaction(async (tx) => {
      await postIssuedBillingDocument(tx, document.id, true);
      if (document.status === "VOID" && document.voidedByUserId) {
        await reverseBillingDocumentPosting(
          tx,
          document.id,
          document.voidedByUserId,
          document.voidReason ?? "Historical void",
        );
      }
    });
  }
  for (const refund of refunds) {
    await prisma.$transaction(async (tx) => {
      await postSucceededRefund(tx, refund.id);
    });
  }
};

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
