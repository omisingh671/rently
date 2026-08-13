import assert from "node:assert/strict";
import test from "node:test";
import {
  BookingStatus,
  NotificationEventKey,
} from "@/generated/prisma/client.js";

Object.assign(process.env, {
  NODE_ENV: "test",
  JWT_ACCESS_SECRET: "unit-test-access-secret",
  JWT_REFRESH_SECRET: "unit-test-refresh-secret",
  MAIL_USER: "notifications-unit@rently.test",
  MAIL_APP_PASS: "unit-test-mail-password",
  FRONTEND_URL: "http://localhost:5173",
  DASHBOARD_URL: "http://localhost:5174",
});

const { getEmailSubject, renderEmail } = await import("./email.provider.js");

test("pending booking email does not claim the booking is confirmed", () => {
  const payload = {
    bookingStatus: BookingStatus.PENDING,
    propertyName: "Ratan Planet",
  };

  assert.equal(
    getEmailSubject(NotificationEventKey.BOOKING_CREATED, payload),
    "Your booking request was received",
  );
  assert.match(
    renderEmail(NotificationEventKey.BOOKING_CREATED, payload),
    /Complete any required payment to confirm it\./,
  );
});

test("confirmed booking email explicitly confirms the booking", () => {
  const payload = {
    bookingStatus: BookingStatus.CONFIRMED,
    propertyName: "Ratan Planet",
  };

  assert.equal(
    getEmailSubject(NotificationEventKey.BOOKING_CREATED, payload),
    "Your booking is confirmed",
  );
  assert.match(
    renderEmail(NotificationEventKey.BOOKING_CREATED, payload),
    /Your booking at Ratan Planet is confirmed\./,
  );
});
