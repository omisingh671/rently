import { env } from "@/config/env.js";
import { mailer } from "@/common/email/mailer.js";
import {
  NotificationChannel,
  type NotificationEventKey,
} from "@/generated/prisma/enums.js";
import type {
  NotificationPayload,
  NotificationProvider,
  ProviderSendInput,
} from "../notifications.types.js";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const subjects: Record<NotificationEventKey, string> = {
  BOOKING_CREATED: "Your booking is confirmed",
  BOOKING_CANCELLED: "Your booking was cancelled",
  PAYMENT_SUCCEEDED: "Payment received",
  REFUND_SUCCEEDED: "Your refund was completed",
  USER_REGISTERED: "Welcome to Sucasa",
  BOOKING_CHECKED_IN: "Check-in completed",
  BOOKING_CHECKED_OUT: "Check-out completed",
};

const renderEmail = (eventKey: NotificationEventKey, payload: NotificationPayload) => {
  const name = escapeHtml(payload.recipientName ?? "Guest");
  const property = payload.propertyName ? ` at ${escapeHtml(payload.propertyName)}` : "";
  const reference = payload.bookingReference
    ? `<p>Booking reference: <strong>${escapeHtml(payload.bookingReference)}</strong></p>`
    : "";
  const amount = payload.amount
    ? `<p>Amount: <strong>${escapeHtml(payload.currency ?? "INR")} ${escapeHtml(payload.amount)}</strong></p>`
    : "";
  const messages: Record<NotificationEventKey, string> = {
    BOOKING_CREATED: `Your booking${property} has been created successfully.`,
    BOOKING_CANCELLED: `Your booking${property} has been cancelled.`,
    PAYMENT_SUCCEEDED: `We received your payment${property}.`,
    REFUND_SUCCEEDED: `Your refund${property} has been completed.`,
    USER_REGISTERED: "Your account has been created successfully.",
    BOOKING_CHECKED_IN: `Your check-in${property} has been completed.`,
    BOOKING_CHECKED_OUT: `Your check-out${property} has been completed.`,
  };

  return `<p>Hello ${name},</p><p>${messages[eventKey]}</p>${reference}${amount}<p>Thank you.</p>`;
};

export class EmailProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  isAvailable() {
    return true;
  }

  async send(input: ProviderSendInput) {
    if (env.NODE_ENV === "test" || input.recipient.endsWith(".test")) {
      return { providerMessageId: `test-${input.jobId}` };
    }

    const result = await mailer.sendMail({
      from: env.MAIL_FROM,
      to: input.recipient,
      subject: subjects[input.eventKey],
      html: renderEmail(input.eventKey, input.payload),
      messageId: `<notification-${input.jobId}@rently.local>`,
    });
    return { providerMessageId: result.messageId };
  }
}
