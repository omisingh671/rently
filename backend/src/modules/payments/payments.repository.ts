import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentStatus,
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PaymentWebhookEventStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { isTransientDatabaseError, runWithBoundedRetry } from "@/common/retry/retry-policy.js";

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
      folioCharges: {
        where: {
          status: "ACTIVE",
        },
      },
      payments: {
        include: {
          refunds: true,
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

export const findPaymentById = (
  paymentId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.findUnique({
    where: { id: paymentId },
    include: paymentInclude,
  });

export const findPaymentByProviderOrderId = (
  provider: PaymentProvider,
  providerOrderId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.findUnique({
    where: { provider_providerOrderId: { provider, providerOrderId } },
    include: paymentInclude,
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
      releasedAt: { not: null },
    },
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

export const findClosedBusinessDate = (
  propertyId: string,
  businessDate: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).propertyDailyClose.findUnique({
    where: {
      propertyId_businessDate: { propertyId, businessDate },
    },
    select: { id: true },
  });

export const createManualPaymentRecord = (
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
    status: PaymentStatus;
    failureCode?: string | null;
    failureMessage?: string | null;
    note?: string;
    paidAt?: Date | null;
    metadataSource: string;
    metadata?: Prisma.InputJsonObject;
  },
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.create({
    data: {
      bookingId: data.bookingId,
      propertyId: data.propertyId,
      userId: data.userId,
      provider: PaymentProvider.MANUAL,
      status: data.status,
      purpose: data.purpose,
      method: data.method,
      amount: data.amount,
      currency: data.currency,
      idempotencyKey: data.idempotencyKey,
      ...(data.actorUserId !== undefined && {
        receivedByUserId: data.actorUserId,
      }),
      ...(data.note !== undefined && { note: data.note }),
      paidAt: data.paidAt ?? null,
      failureCode: data.failureCode ?? null,
      failureMessage: data.failureMessage ?? null,
      metadata: {
        source: data.metadataSource,
        ...(data.metadata ?? {}),
      },
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
    metadata?: Prisma.InputJsonObject;
  },
  tx?: Prisma.TransactionClient,
) =>
  createManualPaymentRecord(
    {
      ...data,
      status: PaymentStatus.SUCCEEDED,
    },
    tx,
  );

export const createGatewayPaymentRecord = (
  data: {
    bookingId: string;
    propertyId: string;
    userId: string;
    provider: PaymentProvider;
    amount: Prisma.Decimal | number | string;
    currency: string;
    idempotencyKey: string;
    purpose: PaymentPurpose;
    metadata?: Prisma.InputJsonObject;
  },
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.create({
    data: {
      bookingId: data.bookingId,
      propertyId: data.propertyId,
      userId: data.userId,
      provider: data.provider,
      status: PaymentStatus.PENDING,
      purpose: data.purpose,
      method: PaymentMethod.ONLINE_GATEWAY,
      amount: data.amount,
      currency: data.currency,
      idempotencyKey: data.idempotencyKey,
      metadata: {
        source: "PUBLIC_GATEWAY_PAYMENT",
        ...(data.metadata ?? {}),
      },
    },
    include: paymentInclude,
  });

export const setGatewayOrder = (
  paymentId: string,
  providerOrderId: string,
) =>
  prisma.payment.update({
    where: { id: paymentId },
    data: { providerOrderId },
    include: paymentInclude,
  });

export const markGatewayOrderCreationFailed = (
  paymentId: string,
  failureCode: string,
  failureMessage: string,
) =>
  prisma.payment.updateMany({
    where: { id: paymentId, status: PaymentStatus.PENDING },
    data: {
      status: PaymentStatus.FAILED,
      failureCode,
      failureMessage,
    },
  });

export const markGatewayPaymentSucceeded = (
  paymentId: string,
  data: {
    providerPaymentId: string;
    providerSignature?: string;
    paidAt: Date;
  },
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.SUCCEEDED,
      providerPaymentId: data.providerPaymentId,
      ...(data.providerSignature !== undefined && {
        providerSignature: data.providerSignature,
      }),
      failureCode: null,
      failureMessage: null,
      paidAt: data.paidAt,
    },
    include: paymentInclude,
  });

export const markGatewayPaymentFailed = (
  paymentId: string,
  failureCode: string,
  failureMessage: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).payment.updateMany({
    where: { id: paymentId, status: PaymentStatus.PENDING },
    data: {
      status: PaymentStatus.FAILED,
      failureCode,
      failureMessage,
    },
  });

export const setGatewayCheckoutSignature = (
  paymentId: string,
  providerSignature: string,
) =>
  prisma.payment.update({
    where: { id: paymentId },
    data: { providerSignature },
    include: paymentInclude,
  });

export const findRefundByProviderRefundId = (
  provider: PaymentProvider,
  providerRefundId: string,
) =>
  prisma.paymentRefund.findUnique({
    where: { provider_providerRefundId: { provider, providerRefundId } },
  });

export const updateGatewayRefundStatus = (
  refundId: string,
  data: Prisma.PaymentRefundUpdateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).paymentRefund.update({ where: { id: refundId }, data });

export const updateRefundRequestStatus = (
  refundRequestId: string,
  data: Prisma.BookingRefundRequestUpdateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).bookingRefundRequest.update({
    where: { id: refundRequestId },
    data,
  });

export const createWebhookEventIfMissing = async (data: {
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  payloadHash: string;
}) => {
  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: data.provider,
        providerEventId: data.providerEventId,
      },
    },
  });
  if (existing) return { event: existing, created: false };

  try {
    const event = await prisma.paymentWebhookEvent.create({ data });
    return { event, created: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const event = await prisma.paymentWebhookEvent.findUniqueOrThrow({
        where: {
          provider_providerEventId: {
            provider: data.provider,
            providerEventId: data.providerEventId,
          },
        },
      });
      return { event, created: false };
    }
    throw error;
  }
};

export const markWebhookEventProcessing = (id: string) =>
  prisma.paymentWebhookEvent.update({
    where: { id },
    data: {
      status: PaymentWebhookEventStatus.PROCESSING,
      attemptCount: { increment: 1 },
      lastError: null,
    },
  });

export const markWebhookEventProcessed = (id: string) =>
  prisma.paymentWebhookEvent.update({
    where: { id },
    data: {
      status: PaymentWebhookEventStatus.PROCESSED,
      processedAt: new Date(),
      lastError: null,
    },
  });

export const markWebhookEventFailed = (id: string, lastError: string) =>
  prisma.paymentWebhookEvent.update({
    where: { id },
    data: {
      status: PaymentWebhookEventStatus.FAILED,
      lastError: lastError.slice(0, 2_000),
    },
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
      paymentExpiresAt: null,
    },
  });

export const createBookingStatusHistory = (
  data: Prisma.BookingStatusHistoryCreateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).bookingStatusHistory.create({
    data,
  });

export const releaseInventoryLocksByBooking = (
  bookingId: string,
  releasedAt: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.updateMany({
    where: {
      bookingId,
      releasedAt: null,
    },
    data: {
      releasedAt,
    },
  });

export const runPaymentTransaction = <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  runWithBoundedRetry({
    operation: () =>
      prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      }),
    isRetryable: isTransientDatabaseError,
    maxAttempts: 3,
    mapExhaustedError: () =>
      new HttpError(
        503,
        "PAYMENT_DATABASE_UNAVAILABLE",
        "Payment service is temporarily unavailable. Retry shortly.",
      ),
  });

export type BookingForPaymentRecord = NonNullable<
  Awaited<ReturnType<typeof findBookingForPayment>>
>;
