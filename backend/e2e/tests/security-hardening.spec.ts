import type { APIRequestContext } from "playwright/test";
import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  getRoomAvailabilityOption,
  loginDashboard,
  publicHeaders,
} from "../helpers.js";
import { expect, test } from "../test.js";

type GuestCredentials = {
  email: string;
  password: string;
};

const loginFrontend = async (
  request: APIRequestContext,
  credentials: GuestCredentials,
) => {
  const response = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "frontend" },
    data: credentials,
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data: { accessToken: string };
  };
  return body.data.accessToken;
};

type PublicContextHeaders = {
  "x-tenant-slug": string;
  "x-property-slug": string;
};

const frontendHeaders = (
  accessToken: string,
  contextHeaders: PublicContextHeaders = publicHeaders,
) => ({
  ...contextHeaders,
  Authorization: `Bearer ${accessToken}`,
  "x-app-client": "frontend",
});

const getRoomAvailabilityOptionForContext = async (
  request: APIRequestContext,
  contextHeaders: PublicContextHeaders,
  propertyId: string,
  checkIn: string,
  checkOut: string,
) => {
  const response = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: contextHeaders,
      data: {
        checkIn,
        checkOut,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data: {
      options: Array<{
        optionId: string;
        optionType: string;
        propertyId: string;
      }>;
    };
  };
  const option = body.data.options.find(
    (candidate) =>
      candidate.optionType === "ROOM" && candidate.propertyId === propertyId,
  );
  expect(option, "Expected a room option in the requested property").toBeTruthy();
  return option!;
};

const createOwnedBooking = async (
  request: APIRequestContext,
  credentials: GuestCredentials,
  daysFromToday: number,
  contextHeaders: PublicContextHeaders = publicHeaders,
  propertyId: string = e2eFixture.property.id,
) => {
  const accessToken = await loginFrontend(request, credentials);
  const headers = frontendHeaders(accessToken, contextHeaders);
  const from = futureDate(daysFromToday);
  const to = futureDate(daysFromToday + 2);
  const option =
    contextHeaders === publicHeaders
      ? await getRoomAvailabilityOption(request, from, to)
      : await getRoomAvailabilityOptionForContext(
          request,
          contextHeaders,
          propertyId,
          from,
          to,
        );
  const selection = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from,
    to,
    guests: 1,
    comfortOption: "NON_AC",
  };

  const lockResponse = await request.post(
    `${apiPrefix}/public/inventory-locks`,
    { headers, data: selection },
  );
  expect(lockResponse.status()).toBe(201);
  const lock = (await lockResponse.json()) as {
    data: { lockToken: string };
  };

  const bookingResponse = await request.post(`${apiPrefix}/public/bookings`, {
    headers,
    data: {
      ...selection,
      inventoryLockToken: lock.data.lockToken,
    },
  });
  expect(bookingResponse.status()).toBe(201);
  const booking = (await bookingResponse.json()) as {
    data: { id: string; totalPrice: number };
  };

  return {
    accessToken,
    headers,
    booking: booking.data,
    checkoutToken: lock.data.lockToken,
  };
};

test("forged tenant, property, and space identifiers do not cross tenant boundaries", async ({
  request,
}) => {
  const propertySlugForgery = await request.get(
    `${apiPrefix}/public/tenant-config`,
    {
      headers: {
        "x-tenant-slug": e2eFixture.tenant.slug,
        "x-property-slug": e2eFixture.foreignProperty.slug,
      },
    },
  );
  expect(propertySlugForgery.status()).toBe(404);
  await expect(propertySlugForgery.json()).resolves.toMatchObject({
    error: { code: "PROPERTY_NOT_FOUND" },
  });

  const from = futureDate(400);
  const to = futureDate(402);
  const crossTenantSpace = await request.post(
    `${apiPrefix}/public/bookings/quote`,
    {
      headers: { "x-tenant-slug": e2eFixture.tenant.slug },
      data: {
        propertyId: e2eFixture.foreignProperty.id,
        spaceId: e2eFixture.foreignPricingId,
        from,
        to,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(crossTenantSpace.status()).toBe(404);
  await expect(crossTenantSpace.json()).resolves.toMatchObject({
    error: { code: "SPACE_NOT_FOUND" },
  });

  const conflictingPropertyContext = await request.post(
    `${apiPrefix}/public/bookings/quote`,
    {
      headers: publicHeaders,
      data: {
        propertyId: e2eFixture.foreignProperty.id,
        spaceId: e2eFixture.pricingId,
        from,
        to,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(conflictingPropertyContext.status()).toBe(404);
  await expect(conflictingPropertyContext.json()).resolves.toMatchObject({
    error: { code: "PROPERTY_NOT_FOUND" },
  });
});

test("guest identity and checkout tokens cannot access another booking", async ({
  request,
}) => {
  const guestA = await createOwnedBooking(
    request,
    e2eFixture.users.guest,
    403,
  );
  const guestB = await createOwnedBooking(
    request,
    e2eFixture.users.guestTwo,
    406,
  );

  const ownerAccess = await request.get(
    `${apiPrefix}/public/bookings/${guestA.booking.id}`,
    { headers: guestA.headers },
  );
  expect(ownerAccess.status()).toBe(200);

  const otherGuestAccess = await request.get(
    `${apiPrefix}/public/bookings/${guestA.booking.id}`,
    { headers: guestB.headers },
  );
  expect(otherGuestAccess.status()).toBe(403);
  await expect(otherGuestAccess.json()).resolves.toMatchObject({
    error: { code: "BOOKING_ACCESS_FORBIDDEN" },
  });

  const crossBookingToken = await request.get(
    `${apiPrefix}/public/bookings/${guestA.booking.id}`,
    {
      headers: publicHeaders,
      params: { checkoutToken: guestB.checkoutToken },
    },
  );
  expect(crossBookingToken.status()).toBe(403);
  await expect(crossBookingToken.json()).resolves.toMatchObject({
    error: { code: "BOOKING_ACCESS_FORBIDDEN" },
  });
});

test("server-calculated quote and payment values reject client tampering", async ({
  request,
}) => {
  const from = futureDate(409);
  const to = futureDate(411);
  const option = await getRoomAvailabilityOption(request, from, to);
  const selection = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from,
    to,
    guests: 1,
    comfortOption: "NON_AC",
  };
  const baselineResponse = await request.post(
    `${apiPrefix}/public/bookings/quote`,
    { headers: publicHeaders, data: selection },
  );
  expect(baselineResponse.status()).toBe(200);
  const baseline = (await baselineResponse.json()) as {
    data: {
      subtotalAmount: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
    };
  };

  const tamperedResponse = await request.post(
    `${apiPrefix}/public/bookings/quote`,
    {
      headers: publicHeaders,
      data: {
        ...selection,
        price: 1,
        subtotalAmount: 1,
        discountAmount: 999_999,
        taxAmount: 0,
        totalAmount: 1,
      },
    },
  );
  expect(tamperedResponse.status()).toBe(200);
  const tampered = (await tamperedResponse.json()) as typeof baseline;
  expect(tampered.data).toMatchObject(baseline.data);
  expect(tampered.data.totalAmount).toBeGreaterThan(1);

  const ownedBooking = await createOwnedBooking(
    request,
    e2eFixture.users.guest,
    412,
  );
  const amountTampering = await request.post(
    `${apiPrefix}/public/bookings/${ownedBooking.booking.id}/payments/intents`,
    {
      headers: {
        ...ownedBooking.headers,
        "Idempotency-Key": `security-amount-${ownedBooking.booking.id}`,
      },
      data: { amount: 1, purpose: "FULL_PAYMENT" },
    },
  );
  expect(amountTampering.status()).toBe(422);
  await expect(amountTampering.json()).resolves.toMatchObject({
    error: { code: "PAYMENT_AMOUNT_MISMATCH" },
  });
});

test("one guest cannot complete another guest's gateway payment", async ({
  request,
}) => {
  const owner = await createOwnedBooking(
    request,
    e2eFixture.users.guest,
    415,
  );
  const otherGuestToken = await loginFrontend(
    request,
    e2eFixture.users.guestTwo,
  );
  const intentResponse = await request.post(
    `${apiPrefix}/public/bookings/${owner.booking.id}/payments/intents`,
    {
      headers: {
        ...owner.headers,
        "Idempotency-Key": `security-owner-${owner.booking.id}`,
      },
      data: { purpose: "FULL_PAYMENT" },
    },
  );
  expect(intentResponse.status()).toBe(201);
  const intent = (await intentResponse.json()) as {
    data: { payment: { id: string } };
  };

  const forgedCompletion = await request.post(
    `${apiPrefix}/public/payments/${intent.data.payment.id}/mock-complete`,
    {
      headers: frontendHeaders(otherGuestToken),
      data: { outcome: "SUCCEEDED" },
    },
  );
  expect(forgedCompletion.status()).toBe(403);
  await expect(forgedCompletion.json()).resolves.toMatchObject({
    error: { code: "PAYMENT_ACCESS_FORBIDDEN" },
  });
});

test("foreign company and booking-group IDs remain hidden from property-scoped staff", async ({
  request,
}) => {
  const superAdmin = await loginDashboard(
    request,
    e2eFixture.users.superAdmin,
  );
  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const globalHeaders = bearerHeaders(superAdmin.accessToken);
  const scopedHeaders = bearerHeaders(manager.accessToken);

  const companyResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.foreignProperty.id}/companies`,
    {
      headers: globalHeaders,
      data: {
        legalName: "E2E Foreign Security Company",
        creditLimit: 0,
        paymentTermsDays: 0,
      },
    },
  );
  expect(companyResponse.status()).toBe(201);
  const company = (await companyResponse.json()) as { data: { id: string } };

  const groupResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.foreignProperty.id}/booking-groups`,
    {
      headers: globalHeaders,
      data: {
        companyId: company.data.id,
        name: "E2E Foreign Security Group",
        checkIn: futureDate(430),
        checkOut: futureDate(432),
        expectedRooms: 1,
        expectedGuests: 1,
      },
    },
  );
  expect(groupResponse.status()).toBe(201);
  const group = (await groupResponse.json()) as { data: { id: string } };

  const companyProbe = await request.patch(
    `${apiPrefix}/companies/${company.data.id}`,
    {
      headers: scopedHeaders,
      data: {
        contactEmail: "forged@e2e.rently.test",
        reason: "Attempted foreign tenant company update",
      },
    },
  );
  expect(companyProbe.status()).toBe(404);
  await expect(companyProbe.json()).resolves.toMatchObject({
    error: { code: "PROPERTY_NOT_FOUND" },
  });

  const groupProbe = await request.get(
    `${apiPrefix}/booking-groups/${group.data.id}`,
    { headers: scopedHeaders },
  );
  expect(groupProbe.status()).toBe(404);
  await expect(groupProbe.json()).resolves.toMatchObject({
    error: { code: "PROPERTY_NOT_FOUND" },
  });
});

test("foreign billing-document IDs remain hidden from staff and other guests", async ({
  request,
}) => {
  const foreignContext = {
    "x-tenant-slug": e2eFixture.foreignTenant.slug,
    "x-property-slug": e2eFixture.foreignProperty.slug,
  };
  const foreignBooking = await createOwnedBooking(
    request,
    e2eFixture.users.guestTwo,
    433,
    foreignContext,
    e2eFixture.foreignProperty.id,
  );
  const intentResponse = await request.post(
    `${apiPrefix}/public/bookings/${foreignBooking.booking.id}/payments/intents`,
    {
      headers: {
        ...foreignBooking.headers,
        "Idempotency-Key": `security-foreign-${foreignBooking.booking.id}`,
      },
      data: {
        checkoutToken: foreignBooking.checkoutToken,
        amount: foreignBooking.booking.totalPrice,
        purpose: "FULL_PAYMENT",
      },
    },
  );
  expect(intentResponse.status()).toBe(201);
  const intent = (await intentResponse.json()) as {
    data: { payment: { id: string } };
  };

  const completion = await request.post(
    `${apiPrefix}/public/payments/${intent.data.payment.id}/mock-complete`,
    {
      headers: foreignBooking.headers,
      data: {
        checkoutToken: foreignBooking.checkoutToken,
        outcome: "SUCCEEDED",
      },
    },
  );
  expect(completion.status()).toBe(200);

  const document = await prisma.billingDocument.findFirstOrThrow({
    where: {
      bookingId: foreignBooking.booking.id,
      type: "INVOICE",
    },
  });
  const ownerList = await request.get(
    `${apiPrefix}/public/bookings/${foreignBooking.booking.id}/billing-documents`,
    { headers: foreignBooking.headers },
  );
  expect(ownerList.status()).toBe(200);

  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const staffProbe = await request.get(
    `${apiPrefix}/billing-documents/${document.id}`,
    { headers: bearerHeaders(manager.accessToken) },
  );
  expect(staffProbe.status()).toBe(404);
  await expect(staffProbe.json()).resolves.toMatchObject({
    error: { code: "BILLING_DOCUMENT_NOT_FOUND" },
  });

  const primaryBooking = await createOwnedBooking(
    request,
    e2eFixture.users.guest,
    436,
  );
  const guestProbe = await request.get(
    `${apiPrefix}/public/billing-documents/${document.id}/download`,
    {
      headers: primaryBooking.headers,
      params: { checkoutToken: primaryBooking.checkoutToken },
    },
  );
  expect(guestProbe.status()).toBe(403);
  await expect(guestProbe.json()).resolves.toMatchObject({
    error: { code: "FORBIDDEN" },
  });
});

test("client-header forgery and malformed public input fail without privilege or internals", async ({
  request,
}) => {
  const guestToken = await loginFrontend(request, e2eFixture.users.guest);
  const forgedAudience = await request.get(`${apiPrefix}/auth/me`, {
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "x-app-client": "dashboard",
      "x-tenant-slug": e2eFixture.foreignTenant.slug,
      "x-property-slug": e2eFixture.foreignProperty.slug,
    },
  });
  expect(forgedAudience.status()).toBe(401);
  await expect(forgedAudience.json()).resolves.toMatchObject({
    error: { code: "UNAUTHORIZED", message: "Invalid access token audience" },
  });

  const malformed = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: publicHeaders,
      data: {
        checkIn: futureDate(420),
        checkOut: futureDate(419),
        guests: -1,
        comfortOption: "UNKNOWN",
      },
    },
  );
  expect(malformed.status()).toBe(400);
  const body = (await malformed.json()) as {
    error: {
      code: string;
      correlationId: string;
      details?: unknown;
      stack?: unknown;
      query?: unknown;
    };
  };
  expect(body.error.code).toBe("VALIDATION_ERROR");
  expect(body.error.correlationId).toBeTruthy();
  expect(body.error.stack).toBeUndefined();
  expect(body.error.query).toBeUndefined();
});
