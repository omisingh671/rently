import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentStatus,
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
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
  userId?: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.findFirst({
    where: {
      id: bookingId,
      ...(userId !== undefined && { userId }),
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

export const sumSucceededPaymentsByBooking = async (
  bookingId: string,
  tx?: Prisma.TransactionClient,
) => {
  const result = await client(tx).payment.aggregate({
    where: {
      bookingId,
      status: PaymentStatus.SUCCEEDED,
    },
    _sum: {
      amount: true,
    },
  });

  return result._sum.amount ?? new Prisma.Decimal(0);
};

export const findSucceededPaymentByBookingPurpose = (
  bookingId: string,
  purpose: PaymentPurpose,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.findFirst({
    where: {
      bookingId,
      purpose,
      status: PaymentStatus.SUCCEEDED,
    },
    include: paymentInclude,
  });

export const createManualSucceededPayment = (
  data: {
    bookingId: string;
    propertyId: string;
    userId: string;
    actorUserId?: string;
    amount: Prisma.Decimal | number | string;
    currency: string;
    idempotencyKey: string;
    purpose: PaymentPurpose;
    method: PaymentMethod;
    note?: string;
    paidAt: Date;
    metadataSource: string;
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
      purpose: data.purpose,
      method: data.method,
      amount: data.amount,
      currency: data.currency,
      idempotencyKey: data.idempotencyKey,
      ...(data.actorUserId !== undefined && {
        receivedByUserId: data.actorUserId,
      }),
      ...(data.note !== undefined && { note: data.note }),
      paidAt: data.paidAt,
      metadata: {
        source: data.metadataSource,
      },
    },
    include: paymentInclude,
  });

export const updateBookingPaymentState = (
  bookingId: string,
  paymentStatus: BookingPaymentStatus,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus,
    },
  });

export const confirmBooking = (
  bookingId: string,
  paymentStatus: BookingPaymentStatus,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CONFIRMED,
      paymentStatus,
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
