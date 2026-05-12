import { prisma } from "@/db/prisma.js";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";

type PaymentsDbClient = typeof prisma | Prisma.TransactionClient;

const client = (tx?: Prisma.TransactionClient): PaymentsDbClient => tx ?? prisma;

export const paymentInclude = {
  booking: true,
} satisfies Prisma.PaymentInclude;

export type PaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

export const findBookingForPayment = (
  bookingId: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
    include: {
      property: {
        include: {
          tenant: true,
        },
      },
    },
  });

export const findPaymentByIdempotencyKey = (
  idempotencyKey: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.findUnique({
    where: { idempotencyKey },
    include: paymentInclude,
  });

export const findSucceededPaymentByBooking = (
  bookingId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.findFirst({
    where: {
      bookingId,
      status: PaymentStatus.SUCCEEDED,
    },
    include: paymentInclude,
  });

export const createManualSucceededPayment = (
  data: {
    bookingId: string;
    propertyId: string;
    userId: string;
    amount: Prisma.Decimal | number | string;
    currency: string;
    idempotencyKey: string;
    paidAt: Date;
  },
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.create({
    data: {
      bookingId: data.bookingId,
      propertyId: data.propertyId,
      userId: data.userId,
      provider: PaymentProvider.MANUAL,
      status: PaymentStatus.SUCCEEDED,
      amount: data.amount,
      currency: data.currency,
      idempotencyKey: data.idempotencyKey,
      paidAt: data.paidAt,
      metadata: {
        source: "PUBLIC_MANUAL_PAYMENT",
      },
    },
    include: paymentInclude,
  });

export const confirmBooking = (
  bookingId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CONFIRMED,
    },
  });

export const createBookingStatusHistory = (
  data: Prisma.BookingStatusHistoryCreateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).bookingStatusHistory.create({
    data,
  });

export const runPaymentTransaction = <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  prisma.$transaction(callback, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 10_000,
  });
