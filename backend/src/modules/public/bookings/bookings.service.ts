import {
  AdvancePaymentType,
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingStatus,
  BookingTargetType,
  BookingType,
  ComfortOption,
  Prisma,
  PaymentRefundStatus,
  PaymentPurpose,
  PaymentStatus,
  TaxCalculationMode,
  TaxCategory,
  TaxScope,
  TaxTargetType,
  TaxType,
  UserRole,
} from "@/generated/prisma/client.js";
import type { Tax } from "@/generated/prisma/client.js";
import { randomUUID } from "node:crypto";
import { HttpError } from "@/common/errors/http-error.js";
import { hashPassword } from "@/common/utils/password.js";
import {
  buildPolicySnapshot,
  calculatePolicyAdvanceAmount,
  getPaymentPolicyForAdvanceType,
  parsePolicySnapshot,
} from "@/modules/booking-policy/booking-policy.policy.js";
import * as repo from "./bookings.repository.js";
import * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import * as tenantService from "@/modules/public/tenant/tenant.service.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import * as availabilityService from "@/modules/public/availability/availability.service.js";
import type { PublicInventoryItem } from "@/modules/public/availability/availability.service.js";
import type {
  CreatePublicBookingInput,
  PublicBookingQuoteInput,
  PublicBookingGuestDetailsInput,
  PublicBookingCheckoutQuoteInput,
  UpdatePublicBookingCheckoutInput,
} from "./bookings.inputs.js";
import type {
  PublicBookingDTO,
  PublicBookingQuoteDTO,
  PublicBookingQuoteItemDTO,
  PublicTaxBreakdownDTO,
} from "./bookings.dto.js";
import type { TenantResolutionInput } from "@/modules/public/tenant/tenant.inputs.js";
import { prisma } from "@/db/prisma.js";
import type { PublicBookingPolicyDTO } from "@/modules/public/spaces/spaces.dto.js";
import * as availabilityRepo from "@/modules/public/availability/availability.repository.js";

const now = () => new Date();
const maxBookingTransactionAttempts = 3;
const multiRoomTitle = "Multi-room stay";

const getNights = (checkIn: Date, checkOut: Date) => {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(1, nights);
};

const isRetryableBookingTransactionError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2034" || error.code === "P2002");

const getOptionPropertyScope = (
  baseScope: spacesRepo.PublicPropertyScope,
  requestedPropertyId?: string,
): spacesRepo.PublicPropertyScope => {
  const propertyId = baseScope.propertyId ?? requestedPropertyId;
  return propertyId === undefined ? baseScope : { ...baseScope, propertyId };
};

const getRequiredPropertyId = (
  baseScope: spacesRepo.PublicPropertyScope,
  requestedPropertyId?: string,
) => baseScope.propertyId ?? requestedPropertyId;

interface CreateBookingOptions {
  actorUserId?: string;
  requiredPropertyId?: string;
  paymentPolicy?: BookingPaymentPolicy;
  upfrontAmount?: number;
  initialStatus?: BookingStatus;
  statusHistoryNote?: string;
  internalNotes?: string | null;
}

interface BookingGuestSnapshot {
  userId: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
}

interface QuoteCalculationInput {
  propertyId: string;
  bookingType: BookingType;
  checkIn: Date;
  nights: number;
  guestCount: number;
  comfortOption: ComfortOption;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: number;
  currency: string;
  policy: PublicBookingPolicyDTO;
  couponCode: string | undefined;
  items: PublicBookingQuoteItemDTO[];
  userId?: string | undefined;
  currentCouponId?: string | undefined;
  excludeBookingId?: string | undefined;
}

interface QuoteCalculationResult extends PublicBookingQuoteDTO {
  couponId: string | undefined;
}

const money = (value: number) => Math.round(value * 100) / 100;

const isTaxBreakdown = (value: unknown): value is PublicTaxBreakdownDTO[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "taxId" in item &&
      "name" in item &&
      "taxAmount" in item,
  );

const getBookingTaxBreakdown = (
  value: Prisma.JsonValue | null,
): PublicTaxBreakdownDTO[] => (isTaxBreakdown(value) ? value : []);

const toTaxBreakdownJson = (
  breakdown: PublicTaxBreakdownDTO[],
): Prisma.InputJsonValue => breakdown as unknown as Prisma.InputJsonValue;

const getNonRefundableTokenAmount = (
  booking: repo.PublicBookingRecord,
  policy: PublicBookingPolicyDTO,
) =>
  policy.tokenRefundable
    ? 0
    : booking.payments
        .filter(
          (payment) =>
            payment.status === PaymentStatus.SUCCEEDED &&
            payment.purpose === PaymentPurpose.TOKEN,
        )
        .reduce((total, payment) => total + Number(payment.amount), 0);

const getTokenPaidAmount = (booking: repo.PublicBookingRecord) =>
  booking.payments
    .filter(
      (payment) =>
        payment.status === PaymentStatus.SUCCEEDED &&
        payment.purpose === PaymentPurpose.TOKEN,
    )
    .reduce((total, payment) => total + Number(payment.amount), 0);

const getTokenPaymentStatus = (
  booking: repo.PublicBookingRecord,
  tokenPaidAmount: number,
) => {
  if (
    booking.paymentPolicy !== BookingPaymentPolicy.TOKEN_AT_BOOKING ||
    Number(booking.upfrontAmount) <= 0
  ) {
    return "NOT_REQUIRED" as const;
  }

  return tokenPaidAmount > 0 ? "PAID" as const : "UNPAID" as const;
};

const getPaidAmount = (booking: repo.PublicBookingRecord) =>
  booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce((total, payment) => total + Number(payment.amount), 0);

const activeRefundRequestStatuses: readonly BookingRefundRequestStatus[] = [
  BookingRefundRequestStatus.REQUESTED,
  BookingRefundRequestStatus.IN_REVIEW,
];

const getRefundedAmount = (booking: repo.PublicBookingRecord) =>
  booking.payments.reduce(
    (total, payment) =>
      total +
      payment.refunds
        .filter(
          (refund) =>
            refund.status === PaymentRefundStatus.PENDING ||
            refund.status === PaymentRefundStatus.SUCCEEDED,
        )
        .reduce((refundTotal, refund) => refundTotal + Number(refund.amount), 0),
    0,
  );

const getRefundableAmount = async (booking: repo.PublicBookingRecord) => {
  const policy = await getBookingPolicyDto(booking);
  return Math.max(
    0,
    getPaidAmount(booking) -
      getRefundedAmount(booking) -
      getNonRefundableTokenAmount(booking, policy),
  );
};

const getMappedRefundableAmount = async (booking: repo.PublicBookingRecord) => {
  const taxBreakdown = getBookingTaxBreakdown(booking.taxBreakdown);
  const nonRefundableAmount = taxBreakdown
    .filter((tax) => tax.isRefundable === false)
    .reduce((sum, tax) => sum + Number(tax.taxAmount), 0);
  const policy = await getBookingPolicyDto(booking);

  return Math.max(
    0,
    getPaidAmount(booking) -
      getRefundedAmount(booking) -
      nonRefundableAmount -
      getNonRefundableTokenAmount(booking, policy),
  );
};

const syncFulfilledRefundRequest = async (
  booking: repo.PublicBookingRecord,
) => {
  const refundRequest =
    booking.refundRequests.find((request) =>
      activeRefundRequestStatuses.includes(request.status),
    ) ?? null;

  if (
    refundRequest === null ||
    getRefundedAmount(booking) <= 0 ||
    (await getMappedRefundableAmount(booking)) > 0
  ) {
    return booking;
  }

  const now = new Date();
  await repo.updateRefundRequestById(refundRequest.id, {
    status: BookingRefundRequestStatus.FULFILLED,
    reviewedAt: refundRequest.reviewedAt ?? now,
    fulfilledAt: refundRequest.fulfilledAt ?? now,
  });

  const updatedBooking = await repo.findBookingById(booking.id);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return updatedBooking;
};

export interface PublicBookingPolicyPreviewDTO {
  bookingId: string;
  status: BookingStatus;
  paidAmount: number;
  refundedAmount: number;
  refundableAmount: number;
  nonRefundableAmount: number;
  tokenRefundable: boolean;
  guestPolicyText: string;
}

const buildBookingPolicyPreview = async (
  booking: repo.PublicBookingRecord,
): Promise<PublicBookingPolicyPreviewDTO> => {
  const policy = await getBookingPolicyDto(booking);
  const paidAmount = getPaidAmount(booking);
  const refundedAmount = getRefundedAmount(booking);
  const nonRefundableAmount = getNonRefundableTokenAmount(booking, policy);
  const refundableAmount = Math.max(
    0,
    paidAmount - refundedAmount - nonRefundableAmount,
  );

  return {
    bookingId: booking.id,
    status: booking.status,
    paidAmount,
    refundedAmount,
    refundableAmount,
    nonRefundableAmount,
    tokenRefundable: policy.tokenRefundable,
    guestPolicyText: policy.guestPolicyText,
  };
};

const mapBooking = async (
  booking: repo.PublicBookingRecord,
): Promise<PublicBookingDTO> => {
  const items = booking.items.map((item) => ({
    id: item.id,
    targetType: item.targetType,
    unitId: item.unitId ?? null,
    roomId: item.roomId ?? null,
    productId: item.productId ?? null,
    targetLabel: item.targetLabel,
    productName: item.productName,
    capacity: item.capacity,
    guestCount: item.guestCount,
    comfortOption: item.comfortOption,
    pricePerNight: Number(item.pricePerNight),
    pricingId: item.pricingId ?? null,
    subtotalAmount: Number(item.subtotalAmount),
    discountAmount: Number(item.discountAmount),
    taxableAmount: Number(item.taxableAmount),
    taxAmount: Number(item.taxAmount),
    taxBreakdown: getBookingTaxBreakdown(item.taxBreakdown),
    totalAmount: Number(item.totalAmount),
    finalAmount: Number(item.finalAmount),
  }));
  const title =
    booking.bookingType === BookingType.MULTI_ROOM
      ? `${multiRoomTitle} (${items.length} rooms)`
      : `${booking.productName} - ${booking.targetLabel}`;
  const paidAmount = booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const refundedAmount = booking.payments.reduce(
    (total, payment) =>
      total +
      payment.refunds
        .filter(
          (refund) =>
            refund.status === PaymentRefundStatus.PENDING ||
            refund.status === PaymentRefundStatus.SUCCEEDED,
        )
        .reduce((refundTotal, refund) => refundTotal + Number(refund.amount), 0),
    0,
  );
  const taxBreakdown = getBookingTaxBreakdown(booking.taxBreakdown);
  const nonRefundableAmount = taxBreakdown
    .filter((tax) => tax.isRefundable === false)
    .reduce((sum, tax) => sum + Number(tax.taxAmount), 0);
  const policy = await getBookingPolicyDto(booking);
  const nonRefundableTokenAmount = getNonRefundableTokenAmount(booking, policy);
  const tokenPaidAmount = getTokenPaidAmount(booking);
  
  const netPaidAmount = Math.max(0, paidAmount - refundedAmount);
  const refundableAmount = Math.max(
    0,
    paidAmount - refundedAmount - nonRefundableAmount - nonRefundableTokenAmount,
  );
  const balanceAmount =
    booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW
      ? 0
      : Math.max(0, Number(booking.totalAmount) - netPaidAmount);
  const taxableAmount = Number(booking.taxableAmount);
  const activeRefundRequestStatuses: readonly BookingRefundRequestStatus[] = [
    BookingRefundRequestStatus.REQUESTED,
    BookingRefundRequestStatus.IN_REVIEW,
  ];
  const refundRequest =
    booking.refundRequests.find((request) =>
      activeRefundRequestStatuses.includes(request.status),
    ) ??
    booking.refundRequests[0] ??
    null;
  const paymentStatus =
    paidAmount <= 0
      ? BookingPaymentStatus.PENDING
      : refundedAmount >= paidAmount
        ? BookingPaymentStatus.REFUNDED
        : paidAmount < Number(booking.totalAmount)
        ? BookingPaymentStatus.PARTIALLY_PAID
        : BookingPaymentStatus.PAID;

  return {
    id: booking.id,
    bookingRef: booking.bookingRef,
    userId: booking.userId,
    spaceId: booking.roomId ?? booking.unitId ?? booking.productId ?? booking.id,
    propertyId: booking.propertyId,
    bookingType: booking.bookingType,
    guestCount: booking.guestCount,
    comfortOption: booking.comfortOption,
    title,
    spaceName: booking.targetLabel,
    status: booking.status,
    paymentPolicy: booking.paymentPolicy,
    paymentStatus,
    upfrontAmount: Number(booking.upfrontAmount),
    tokenPaidAmount,
    tokenPaymentStatus: getTokenPaymentStatus(booking, tokenPaidAmount),
    guestName: booking.guestNameSnapshot,
    guestEmail: booking.guestEmailSnapshot,
    guestContactNumber: booking.guestContactSnapshot ?? null,
    from: booking.checkIn.toISOString(),
    to: booking.checkOut.toISOString(),
    pricePerNight: Number(booking.pricePerNight),
    subtotalAmount: Number(booking.subtotalAmount),
    totalPrice: Number(booking.totalAmount),
    discountAmount: Number(booking.discountAmount),
    taxableAmount,
    taxAmount: Number(booking.taxAmount),
    taxBreakdown,
    paidAmount,
    refundedAmount,
    netPaidAmount,
    refundableAmount,
    balanceAmount,
    remainingPayAtCheckIn: balanceAmount,
    policy,
    items,
    internalNotes: booking.internalNotes ?? null,
    cancellationReason: booking.cancellationReason ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    couponCode: booking.coupon?.code ?? null,
    refundRequest:
      refundRequest === null
        ? null
        : {
            id: refundRequest.id,
            status: refundRequest.status,
            reason: refundRequest.reason,
            adminNote: refundRequest.adminNote ?? null,
            reviewedAt: refundRequest.reviewedAt?.toISOString() ?? null,
            fulfilledAt: refundRequest.fulfilledAt?.toISOString() ?? null,
            createdAt: refundRequest.createdAt.toISOString(),
          },
    createdAt: booking.createdAt.toISOString(),
  };
};

const getBookingPolicyDto = async (
  booking: Pick<repo.PublicBookingRecord, "propertyId" | "policySnapshot">,
  tx?: Prisma.TransactionClient,
) => {
  const snapshot = parsePolicySnapshot(booking.policySnapshot);
  if (snapshot !== null) {
    const currentPolicy = await spacesService.ensureBookingPolicy(booking.propertyId, tx);
    return {
      ...mapSnapshotPolicy(booking.propertyId, snapshot as unknown as Record<string, unknown>),
      checkInTime: currentPolicy.checkInTime,
      checkOutTime: currentPolicy.checkOutTime,
    };
  }

  return spacesService.mapPolicy(await spacesService.ensureBookingPolicy(booking.propertyId, tx));
};

const mapSnapshotPolicy = (
  propertyId: string,
  snapshot: Record<string, unknown>,
) => ({
  propertyId,
  advancePaymentType: snapshot.advancePaymentType as AdvancePaymentType,
  advancePaymentValue: Number(snapshot.advancePaymentValue),
  tokenRefundable: Boolean(snapshot.tokenRefundable),
  checkInTime: "12:00",
  checkOutTime: "11:00",
  cancellationRules: snapshot.cancellationRules as Record<string, unknown>,
  refundRules: snapshot.refundRules as Record<string, unknown>,
  earlyCheckoutRules: snapshot.earlyCheckoutRules as Record<string, unknown>,
  noShowRules: snapshot.noShowRules as Record<string, unknown>,
  guestPolicyText: String(snapshot.guestPolicyText),
});

const getBookingYearRange = (date: Date) => {
  const year = date.getUTCFullYear();
  return {
    year,
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
};

const generateBookingRef = async (
  createdAt: Date,
  tx: Prisma.TransactionClient,
) => {
  const { year, start, end } = getBookingYearRange(createdAt);
  const count = await repo.countBookingsCreatedInYear(start, end, tx);
  return `SCH-${year}-${String(count + 1).padStart(6, "0")}`;
};

const getTargetKey = (target: spacesRepo.PublicSpaceTarget) =>
  target.targetType === BookingTargetType.ROOM
    ? `ROOM:${target.roomId ?? ""}`
    : `UNIT:${target.unitId ?? ""}`;

const assertInventoryLockCoversTargets = async (
  lockToken: string | undefined,
  targets: spacesRepo.PublicSpaceTarget[],
  checkIn: Date,
  checkOut: Date,
  _tx: Prisma.TransactionClient,
) => {
  if (lockToken === undefined) {
    return;
  }

  const locks = await prisma.inventoryLock.findMany({
    where: {
      lockToken,
      releasedAt: null,
      expiresAt: { gt: now() },
    },
    orderBy: { createdAt: "asc" },
  });
  const expectedKeys = new Set(targets.map(getTargetKey));
  const matchingKeys = new Set(
    locks
      .filter(
        (lock) =>
          lock.checkIn.getTime() === checkIn.getTime() &&
          lock.checkOut.getTime() === checkOut.getTime(),
      )
      .map((lock) =>
        getTargetKey({
          targetType: lock.targetType,
          unitId: lock.unitId,
          roomId: lock.roomId,
        }),
      ),
  );

  if (
    expectedKeys.size !== targets.length ||
    expectedKeys.size !== matchingKeys.size ||
    [...expectedKeys].some((key) => !matchingKeys.has(key))
  ) {
    throw new HttpError(
      409,
      "INVENTORY_LOCK_INVALID",
      "Checkout hold is expired or does not match the selected spaces",
    );
  }
};

const releaseBookingLock = async (
  lockToken: string | undefined,
  bookingId: string,
  tx: Prisma.TransactionClient,
) => {
  if (lockToken === undefined) {
    return;
  }

  await tx.inventoryLock.updateMany({
    where: {
      lockToken,
      releasedAt: null,
    },
    data: {
      releasedAt: now(),
      bookingId,
    },
  });
};

const allocateGuestsAcrossRooms = (
  spaces: spacesRepo.PublicSpaceRecord[],
  totalGuests: number,
) => {
  if (spaces.length > totalGuests) {
    throw new HttpError(
      422,
      "TOO_MANY_ROOMS_FOR_GUESTS",
      "Each selected room must have at least one guest",
    );
  }

  const allocations = spaces.map((space) => ({
    space,
    guestCount: 1,
    remainingCapacity: Math.max(0, spacesService.getSpaceCapacity(space) - 1),
  }));
  let remainingGuests = totalGuests - allocations.length;

  for (const allocation of allocations) {
    if (remainingGuests === 0) {
      break;
    }

    const additionalGuests = Math.min(
      allocation.remainingCapacity,
      remainingGuests,
    );
    allocation.guestCount += additionalGuests;
    remainingGuests -= additionalGuests;
  }

  if (remainingGuests > 0) {
    throw new HttpError(
      422,
      "INSUFFICIENT_CAPACITY",
      "Selected spaces do not cover the requested guest count",
    );
  }

  return allocations.map(({ space, guestCount }) => ({
    space,
    guestCount,
  }));
};

const assertComfortAvailableForSpace = (
  space: spacesRepo.PublicSpaceRecord,
  comfortOption: ComfortOption,
) => {
  if (
    comfortOption === ComfortOption.AC &&
    space.roomId !== null &&
    space.room?.hasAC !== true
  ) {
    throw new HttpError(
      422,
      "COMFORT_OPTION_NOT_AVAILABLE",
      "Selected room does not support AC bookings",
    );
  }
};

const resolvePricedSpace = async (
  space: spacesRepo.PublicSpaceRecord,
  target: spacesRepo.PublicSpaceTarget,
  guestCount: number,
  comfortOption: ComfortOption,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
  nights: number,
  tx: Prisma.TransactionClient,
  propertyScope: spacesRepo.PublicPropertyScope = {},
) => {
  const capacity = spacesService.getSpaceCapacity(space);

  if (guestCount > capacity) {
    throw new HttpError(
      422,
      "INSUFFICIENT_CAPACITY",
      "Selected room does not cover the assigned guest count",
    );
  }

  assertComfortAvailableForSpace(space, comfortOption);

  const pricedSpace = await spacesRepo.findActivePricingForTarget(
    target,
    now(),
    tenantId,
    {
      guestCount,
      comfortOption,
    },
    {
      checkIn,
      checkOut,
      nights,
    },
    tx,
    propertyScope,
  );

  if (!pricedSpace) {
    throw new HttpError(
      422,
      "PRICE_NOT_CONFIGURED",
      `No active ${comfortOption === ComfortOption.AC ? "AC" : "Non-AC"} price is configured for ${guestCount} guest${guestCount === 1 ? "" : "s"} in the selected room`,
    );
  }

  return pricedSpace;
};

const getArrayItem = <T>(items: T[], index: number, message: string): T => {
  const item = items[index];
  if (item === undefined) {
    throw new HttpError(500, "BOOKING_INVARIANT_FAILED", message);
  }

  return item;
};

const resolveBookingGuestSnapshot = async (
  userId: string | undefined,
  guestDetails: PublicBookingGuestDetailsInput | undefined,
  tx: Prisma.TransactionClient,
): Promise<BookingGuestSnapshot> => {
  if (userId !== undefined) {
    if (guestDetails !== undefined) {
      return {
        userId,
        fullName: guestDetails.name,
        email: guestDetails.email,
        contactNumber: guestDetails.contactNumber,
      };
    }

    const user = await repo.findUserSnapshotById(userId, tx);
    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found");
    }

    return {
      userId,
      fullName: user.fullName,
      email: user.email,
      contactNumber: user.contactNumber,
    };
  }

  if (guestDetails === undefined) {
    throw new HttpError(
      422,
      "GUEST_DETAILS_REQUIRED",
      "Guest name, email, and mobile number are required",
    );
  }

  const email = guestDetails.email.trim().toLowerCase();
  const existingUser = await repo.findUserByEmail(email, tx);

  if (existingUser) {
    if (existingUser.role !== UserRole.GUEST) {
      throw new HttpError(
        409,
        "GUEST_EMAIL_REQUIRES_LOGIN",
        "This email is already registered. Please log in to continue.",
      );
    }

    const user = await repo.updateUserById(
      existingUser.id,
      {
        fullName: guestDetails.name,
        contactNumber: guestDetails.contactNumber,
      },
      tx,
    );

    return {
      userId: user.id,
      fullName: guestDetails.name,
      email: user.email,
      contactNumber: guestDetails.contactNumber,
    };
  }

  const passwordHash = await hashPassword(randomUUID());
  const user = await repo.createUser(
    {
      fullName: guestDetails.name,
      email,
      passwordHash,
      role: UserRole.GUEST,
      contactNumber: guestDetails.contactNumber,
    },
    tx,
  );

  return {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    contactNumber: user.contactNumber,
  };
};

const validateAndApplyCoupon = async (
  propertyId: string,
  code: string | undefined,
  nights: number,
  totalBeforeDiscount: number,
  tx: Prisma.TransactionClient,
  options: {
    userId?: string | undefined;
    currentCouponId?: string | undefined;
    excludeBookingId?: string | undefined;
  } = {},
) => {
  if (!code) return { couponId: undefined, discountAmount: 0 };

  const coupon = await repo.findActiveCouponByCode(propertyId, code, now(), tx);

  if (!coupon) {
    throw new HttpError(422, "INVALID_COUPON", "Invalid or expired coupon code");
  }

  if (
    coupon.id !== options.currentCouponId &&
    coupon.maxUses !== null &&
    coupon.usedCount >= coupon.maxUses
  ) {
    throw new HttpError(422, "COUPON_EXHAUSTED", "Coupon usage limit reached");
  }

  if (coupon.oncePerUser && options.userId) {
    const previousBookingCount = await repo.countUserCouponBookings(
      options.userId,
      coupon.id,
      options.excludeBookingId,
      tx,
    );
    if (previousBookingCount > 0) {
      throw new HttpError(
        422,
        "COUPON_ALREADY_USED",
        "Coupon has already been used by this user",
      );
    }
  }

  if (coupon.minNights !== null && nights < coupon.minNights) {
    throw new HttpError(
      422,
      "COUPON_MIN_NIGHTS",
      `Coupon requires a minimum of ${coupon.minNights} nights`,
    );
  }

  if (
    coupon.minAmount !== null &&
    totalBeforeDiscount < Number(coupon.minAmount)
  ) {
    throw new HttpError(
      422,
      "COUPON_MIN_AMOUNT",
      `Coupon requires a minimum booking amount of ${Number(coupon.minAmount)}`,
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (totalBeforeDiscount * Number(coupon.discountValue)) / 100;
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  discountAmount = Math.min(discountAmount, totalBeforeDiscount);

  return {
    couponId: coupon.id,
    discountAmount: money(discountAmount),
  };
};

const taxNameLooksLikeGst = (tax: Tax) =>
  /\b(?:gst|cgst|sgst|igst)\b/i.test(tax.name);

const getLegacyTaxTargets = (tax: Tax) =>
  new Set(["ALL", "BOOKING", "STAY", tax.appliesTo.trim().toUpperCase()]);

const taxMatchesTarget = (
  tax: Tax,
  targetType: BookingTargetType,
) => {
  if (
    tax.targetType === TaxTargetType.ALL ||
    String(tax.targetType) === String(targetType)
  ) {
    return true;
  }

  return getLegacyTaxTargets(tax).has(targetType);
};

const taxIsValidForStay = (tax: Tax, checkIn: Date) =>
  (tax.validFrom === null || tax.validFrom <= checkIn) &&
  (tax.validTo === null || tax.validTo >= checkIn);

const isAccommodationGstSlab = (tax: Tax) =>
  tax.category === TaxCategory.GST &&
  tax.scope === TaxScope.ACCOMMODATION &&
  tax.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF;

const tariffMatchesTaxSlab = (
  tariff: number,
  tax: Tax,
) => {
  const minTariff = tax.minTariff === null ? 0 : Number(tax.minTariff);
  const maxTariff = tax.maxTariff === null ? null : Number(tax.maxTariff);

  return tariff >= minTariff && (maxTariff === null || tariff < maxTariff);
};

const getApplicableTaxes = (
  taxes: Tax[],
  item: PublicBookingQuoteItemDTO,
  checkIn: Date,
) => {
  const targetTaxes = taxes.filter(
    (tax) =>
      taxIsValidForStay(tax, checkIn) && taxMatchesTarget(tax, item.targetType),
  );
  const gstSlabs = targetTaxes
    .filter(isAccommodationGstSlab)
    .filter((tax) => tariffMatchesTaxSlab(item.pricePerNight, tax))
    .sort((left, right) => {
      const priorityDiff = right.priority - left.priority;
      if (priorityDiff !== 0) return priorityDiff;

      const leftMin = left.minTariff === null ? 0 : Number(left.minTariff);
      const rightMin = right.minTariff === null ? 0 : Number(right.minTariff);
      return rightMin - leftMin;
    });
  const selectedGstSlab = gstSlabs[0];
  const genericTaxes = targetTaxes.filter(
    (tax) =>
      tax.category === TaxCategory.GENERIC &&
      tax.calculationMode === TaxCalculationMode.FLAT,
  );

  if (!selectedGstSlab) {
    return genericTaxes;
  }

  return [
    selectedGstSlab,
    ...genericTaxes.filter((tax) => !taxNameLooksLikeGst(tax)),
  ];
};

const calculateLineTax = (
  taxableAmount: number,
  tax: Tax,
  included: boolean,
) => {
  const rate = Number(tax.rate);
  if (tax.taxType === TaxType.PERCENTAGE) {
    return included
      ? money((taxableAmount * rate) / (100 + rate))
      : money((taxableAmount * rate) / 100);
  }

  return money(Math.min(rate, taxableAmount));
};

const calculateQuoteTotals = async (
  input: QuoteCalculationInput,
  tx: Prisma.TransactionClient,
): Promise<QuoteCalculationResult> => {
  const subtotalAmount = money(
    input.items.reduce((total, item) => total + item.totalAmount, 0),
  );
  const { couponId, discountAmount } = await validateAndApplyCoupon(
    input.propertyId,
    input.couponCode,
    input.nights,
    subtotalAmount,
    tx,
    {
      userId: input.userId,
      currentCouponId: input.currentCouponId,
      excludeBookingId: input.excludeBookingId,
    },
  );
  const discountedSubtotal = money(subtotalAmount - discountAmount);
  const taxes = await repo.listActiveTaxes(input.propertyId, tx);
  const exclusiveBreakdown = new Map<string, PublicTaxBreakdownDTO>();
  const inclusiveBreakdown = new Map<string, PublicTaxBreakdownDTO>();
  const calculatedItems: PublicBookingQuoteItemDTO[] = [];
  let allocatedDiscountAmount = 0;

  for (const [index, item] of input.items.entries()) {
    const itemRatio = subtotalAmount > 0 ? item.totalAmount / subtotalAmount : 0;
    const lineDiscountAmount =
      index === input.items.length - 1
        ? money(discountAmount - allocatedDiscountAmount)
        : money(discountAmount * itemRatio);
    allocatedDiscountAmount = money(allocatedDiscountAmount + lineDiscountAmount);
    const lineSubtotalAmount = money(item.totalAmount);
    const lineTaxableAmount = money(lineSubtotalAmount - lineDiscountAmount);
    const itemTaxes = getApplicableTaxes(taxes, item, input.checkIn);
    const itemBreakdown: PublicTaxBreakdownDTO[] = [];
    let lineTaxAmount = 0;
    let lineExclusiveTaxAmount = 0;

    for (const tax of itemTaxes) {
      const taxAmount = calculateLineTax(
        lineTaxableAmount,
        tax,
        item.taxInclusive,
      );
      const key = `${tax.id}:${item.taxInclusive ? "included" : "exclusive"}`;
      const targetMap = item.taxInclusive ? inclusiveBreakdown : exclusiveBreakdown;
      const existing = targetMap.get(key);
      const next: PublicTaxBreakdownDTO = {
        taxId: tax.id,
        name: tax.name,
        taxType: tax.taxType,
        rate: Number(tax.rate),
        appliesTo: tax.targetType,
        taxableAmount: money((existing?.taxableAmount ?? 0) + lineTaxableAmount),
        taxAmount: money((existing?.taxAmount ?? 0) + taxAmount),
        included: item.taxInclusive,
        isRefundable: (tax as unknown as { isRefundable?: boolean }).isRefundable ?? true,
      };

      targetMap.set(key, next);
      itemBreakdown.push({
        ...next,
        taxableAmount: lineTaxableAmount,
        taxAmount,
      });
      lineTaxAmount = money(lineTaxAmount + taxAmount);
      if (!item.taxInclusive) {
        lineExclusiveTaxAmount = money(lineExclusiveTaxAmount + taxAmount);
      }
    }

    calculatedItems.push({
      ...item,
      subtotalAmount: lineSubtotalAmount,
      discountAmount: lineDiscountAmount,
      taxableAmount: lineTaxableAmount,
      taxAmount: lineTaxAmount,
      taxBreakdown: itemBreakdown,
      totalAmount: lineSubtotalAmount,
      finalAmount: money(lineTaxableAmount + lineExclusiveTaxAmount),
    });
  }

  const taxBreakdown = [
    ...inclusiveBreakdown.values(),
    ...exclusiveBreakdown.values(),
  ];
  const taxAmount = money(
    taxBreakdown.reduce((total, tax) => total + tax.taxAmount, 0),
  );
  const exclusiveTaxAmount = money(
    [...exclusiveBreakdown.values()].reduce(
      (total, tax) => total + tax.taxAmount,
      0,
    ),
  );
  const totalAmount = money(discountedSubtotal + exclusiveTaxAmount);
  const upfrontAmount =
    input.paymentPolicy === BookingPaymentPolicy.NO_UPFRONT_PAYMENT
      ? 0
      : money(Number(calculatePolicyAdvanceAmount(input.policy, totalAmount)));

  return {
    propertyId: input.propertyId,
    bookingType: input.bookingType,
    nights: input.nights,
    guestCount: input.guestCount,
    comfortOption: input.comfortOption,
    currency: input.currency,
    subtotalAmount,
    discountAmount,
    taxableAmount: discountedSubtotal,
    taxAmount,
    totalAmount,
    paymentPolicy: input.paymentPolicy,
    upfrontAmount,
    remainingPayAtCheckIn: money(Math.max(0, totalAmount - upfrontAmount)),
    policy: input.policy,
    couponCode: input.couponCode?.trim().toUpperCase() ?? null,
    taxBreakdown,
    items: calculatedItems,
    couponId,
  };
};

const buildBookingItemCreateInput = (
  space: spacesRepo.PublicSpaceRecord,
  target: spacesRepo.PublicSpaceTarget,
  nights: number,
  guestCount: number,
): Prisma.BookingItemCreateWithoutBookingInput => {
  const pricePerNight = Number(space.price);

  return {
    productId: space.productId,
    targetType: target.targetType,
    unitId: target.unitId,
    roomId: target.roomId,
    guestCount,
    comfortOption: spacesService.getSpaceComfortOption(space),
    targetLabel: target.roomId
      ? `${space.room?.name ?? "Room"} ${space.room?.number ?? ""}`.trim()
      : `Unit ${space.unit?.unitNumber ?? ""}`.trim(),
    productName: space.product.name,
    capacity: spacesService.getSpaceCapacity(space),
    pricePerNight,
    pricingId: space.id,
    subtotalAmount: pricePerNight * nights,
    discountAmount: 0,
    taxableAmount: pricePerNight * nights,
    taxAmount: 0,
    totalAmount: pricePerNight * nights,
    finalAmount: pricePerNight * nights,
  };
};

const buildQuoteItemFromBookingInput = (
  item: Prisma.BookingItemCreateWithoutBookingInput,
  taxInclusive: boolean,
): PublicBookingQuoteItemDTO => ({
  targetType: item.targetType,
  unitId: typeof item.unitId === "string" ? item.unitId : null,
  roomId: typeof item.roomId === "string" ? item.roomId : null,
  productId: typeof item.productId === "string" ? item.productId : null,
  targetLabel: item.targetLabel,
  productName: item.productName,
  capacity: item.capacity,
  guestCount: item.guestCount ?? 1,
  comfortOption: item.comfortOption,
  pricePerNight: Number(item.pricePerNight),
  pricingId: typeof item.pricingId === "string" ? item.pricingId : null,
  subtotalAmount: Number(item.subtotalAmount ?? item.totalAmount),
  discountAmount: Number(item.discountAmount ?? 0),
  taxableAmount: Number(item.taxableAmount ?? item.totalAmount),
  taxAmount: Number(item.taxAmount ?? 0),
  taxBreakdown: getBookingTaxBreakdown(
    (item.taxBreakdown ?? null) as Prisma.JsonValue | null,
  ),
  totalAmount: Number(item.totalAmount),
  finalAmount: Number(item.finalAmount ?? item.totalAmount),
  taxInclusive,
});

const buildOptionBookingItemCreateInput = (
  item: PublicInventoryItem,
  nights: number,
  comfortOption: ComfortOption,
): Prisma.BookingItemCreateWithoutBookingInput => ({
  productId: item.productId,
  targetType: item.target.targetType,
  unitId: item.target.unitId,
  roomId: item.target.roomId,
  guestCount: item.guestCount,
  comfortOption,
  targetLabel: item.publicLabel,
  productName:
    item.target.targetType === BookingTargetType.UNIT
      ? "Whole unit"
      : item.guestCount === 1
        ? "Single room"
        : "Double room",
  capacity: item.capacity,
  pricePerNight: item.pricePerNight,
  pricingId: item.pricingId,
  subtotalAmount: item.pricePerNight * nights,
  discountAmount: 0,
  taxableAmount: item.pricePerNight * nights,
  taxAmount: 0,
  totalAmount: item.pricePerNight * nights,
  finalAmount: item.pricePerNight * nights,
});

const buildQuoteItemFromOptionItem = (
  item: PublicInventoryItem,
  nights: number,
  comfortOption: ComfortOption,
): PublicBookingQuoteItemDTO =>
  buildQuoteItemFromBookingInput(
    buildOptionBookingItemCreateInput(item, nights, comfortOption),
    item.taxInclusive,
  );

const buildBookingItemCreateInputFromQuoteItem = (
  item: PublicBookingQuoteItemDTO,
): Prisma.BookingItemCreateWithoutBookingInput => ({
  productId: item.productId,
  targetType: item.targetType,
  unitId: item.unitId,
  roomId: item.roomId,
  guestCount: item.guestCount,
  comfortOption: item.comfortOption,
  targetLabel: item.targetLabel,
  productName: item.productName,
  capacity: item.capacity,
  pricePerNight: item.pricePerNight,
  pricingId: item.pricingId,
  subtotalAmount: item.subtotalAmount,
  discountAmount: item.discountAmount,
  taxableAmount: item.taxableAmount,
  taxAmount: item.taxAmount,
  ...(item.taxBreakdown.length > 0 && {
    taxBreakdown: toTaxBreakdownJson(item.taxBreakdown),
  }),
  totalAmount: item.totalAmount,
  finalAmount: item.finalAmount,
});

const assertBookingCheckoutEditable = async (
  booking: repo.PublicBookingRecord,
  userId: string | undefined,
  editToken: string | undefined,
  tx: Prisma.TransactionClient,
) => {
  if (booking.paymentStatus !== BookingPaymentStatus.PENDING || getPaidAmount(booking) > 0) {
    throw new HttpError(
      409,
      "BOOKING_PAYMENT_STARTED",
      "Booking details cannot be edited after payment starts",
    );
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new HttpError(
      409,
      "BOOKING_CHECKOUT_LOCKED",
      "Only pending bookings can be edited before payment",
    );
  }

  if (userId !== undefined && userId === booking.userId) {
    return;
  }

  if (editToken !== undefined) {
    const lock = await availabilityRepo.findReleasedInventoryLockByBookingToken(
      booking.id,
      editToken,
      tx,
    );
    if (lock) {
      return;
    }
  }

  throw new HttpError(
    403,
    "BOOKING_EDIT_FORBIDDEN",
    "You cannot edit this booking checkout",
  );
};

const buildQuoteItemsFromBooking = (
  booking: repo.PublicBookingRecord,
): PublicBookingQuoteItemDTO[] =>
  booking.items.map((item) => {
    const taxBreakdown = getBookingTaxBreakdown(item.taxBreakdown);

    return {
      targetType: item.targetType,
      unitId: item.unitId ?? null,
      roomId: item.roomId ?? null,
      productId: item.productId ?? null,
      targetLabel: item.targetLabel,
      productName: item.productName,
      capacity: item.capacity,
      guestCount: item.guestCount,
      comfortOption: item.comfortOption,
      pricePerNight: Number(item.pricePerNight),
      pricingId: item.pricingId ?? null,
      subtotalAmount: Number(item.subtotalAmount),
      discountAmount: 0,
      taxableAmount: Number(item.totalAmount),
      taxAmount: 0,
      taxBreakdown: [],
      totalAmount: Number(item.totalAmount),
      finalAmount: Number(item.totalAmount),
      taxInclusive: taxBreakdown.some((tax) => tax.included),
    };
  });

const calculateExistingBookingCheckoutQuote = async (
  booking: repo.PublicBookingRecord,
  couponCode: string | null | undefined,
  tx: Prisma.TransactionClient,
) => {
  const propertyCurrency = await repo.findPropertyCurrencyById(
    booking.propertyId,
    tx,
  );
  const policy = await getBookingPolicyDto(booking, tx);

  return calculateQuoteTotals(
    {
      propertyId: booking.propertyId,
      bookingType: booking.bookingType,
      checkIn: booking.checkIn,
      nights: getNights(booking.checkIn, booking.checkOut),
      guestCount: booking.guestCount,
      comfortOption: booking.comfortOption,
      paymentPolicy: booking.paymentPolicy,
      upfrontAmount: Number(booking.upfrontAmount),
      currency: propertyCurrency?.tenant.defaultCurrency ?? "INR",
      policy,
      couponCode: normalizeCouponCode(couponCode),
      items: buildQuoteItemsFromBooking(booking),
      userId: booking.userId,
      currentCouponId: booking.couponId ?? undefined,
      excludeBookingId: booking.id,
    },
    tx,
  );
};

const normalizeCouponCode = (couponCode: string | null | undefined) => {
  const trimmed = couponCode?.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
};

export const createBookingForUser = async (
  userId: string | undefined,
  input: CreatePublicBookingInput,
  tenantInput: TenantResolutionInput = {},
  options: CreateBookingOptions = {},
): Promise<PublicBookingDTO> => {
  const scope = await tenantService.resolvePublicScope(tenantInput);
  const requiredPropertyId =
    options.requiredPropertyId ??
    getRequiredPropertyId(scope.propertyScope, input.propertyId);
  const nights = getNights(input.from, input.to);

  for (let attempt = 1; attempt <= maxBookingTransactionAttempts; attempt += 1) {
    try {
      const booking = await repo.runSerializableTransaction(async (tx) => {
        const createdAt = now();
        const bookingRef = await generateBookingRef(createdAt, tx);
        const guestSnapshot = await resolveBookingGuestSnapshot(
          userId,
          input.guestDetails,
          tx,
        );

        if (input.bookingOptionId !== undefined) {
          const optionPropertyScope = getOptionPropertyScope(
            scope.propertyScope,
            input.propertyId,
          );
          const option = await availabilityService.findAvailabilityOptionById(
            input.bookingOptionId,
            {
              checkIn: input.from,
              checkOut: input.to,
              guests: input.guests,
              comfortOption: input.comfortOption,
            },
            scope.tenant.id,
            nights,
            optionPropertyScope,
            tx,
            input.inventoryLockToken,
          );

          if (!option) {
            throw new HttpError(
              409,
              "BOOKING_OPTION_UNAVAILABLE",
              "Selected booking option is no longer available",
            );
          }

          if (
            requiredPropertyId !== undefined &&
            option.propertyId !== requiredPropertyId
          ) {
            throw new HttpError(
              422,
              "BOOKING_PROPERTY_MISMATCH",
              "Selected option does not belong to the selected property",
            );
          }

          const quoteItems = option.items.map((item) =>
            buildQuoteItemFromOptionItem(item, nights, input.comfortOption),
          );
          const optionTargets = option.items.map((item) => item.target);
          const policy = await spacesService.ensureBookingPolicy(option.propertyId, tx);
          const paymentPolicy =
            options.paymentPolicy ??
            getPaymentPolicyForAdvanceType(policy.advancePaymentType);
          const initialStatus =
            options.initialStatus ??
            (paymentPolicy === BookingPaymentPolicy.NO_UPFRONT_PAYMENT
              ? BookingStatus.CONFIRMED
              : BookingStatus.PENDING);
          const policySnapshot = buildPolicySnapshot(policy, createdAt);

          await assertInventoryLockCoversTargets(
            input.inventoryLockToken,
            optionTargets,
            input.from,
            input.to,
            tx,
          );

          const quote = await calculateQuoteTotals(
            {
              propertyId: option.propertyId,
              bookingType:
                option.items.length > 1
                  ? BookingType.MULTI_ROOM
                  : BookingType.SINGLE_TARGET,
              checkIn: input.from,
              nights,
              guestCount: input.guests,
              comfortOption: input.comfortOption,
              paymentPolicy,
              upfrontAmount: options.upfrontAmount ?? 0,
              currency: scope.tenant.defaultCurrency,
              policy: spacesService.mapPolicy(policy),
              couponCode: input.couponCode,
              items: quoteItems,
              userId: guestSnapshot.userId,
            },
            tx,
          );
          const firstItem = getArrayItem(
            option.items,
            0,
            "Missing booking option item",
          );
          const isMultiItem = option.items.length > 1;

          const booking = await repo.createBooking(
            {
              bookingRef,
              property: { connect: { id: option.propertyId } },
              user: { connect: { id: guestSnapshot.userId } },
              ...(isMultiItem ? {} : { productId: firstItem.productId }),
              bookingType: isMultiItem
                ? BookingType.MULTI_ROOM
                : BookingType.SINGLE_TARGET,
              targetType: firstItem.target.targetType,
              unitId: isMultiItem ? null : firstItem.target.unitId,
              roomId: isMultiItem ? null : firstItem.target.roomId,
              guestCount: input.guests,
              comfortOption: input.comfortOption,
              guestNameSnapshot: guestSnapshot.fullName,
              guestEmailSnapshot: guestSnapshot.email,
              ...(guestSnapshot.contactNumber !== null && {
                guestContactSnapshot: guestSnapshot.contactNumber,
              }),
              targetLabel: option.title,
              productName: "Booking option",
              pricePerNight: option.nightlyTotal,
              checkIn: input.from,
              checkOut: input.to,
              status: initialStatus,
              subtotalAmount: quote.subtotalAmount,
              taxableAmount: quote.taxableAmount,
              taxAmount: quote.taxAmount,
              taxBreakdown: toTaxBreakdownJson(quote.taxBreakdown),
              totalAmount: quote.totalAmount,
              discountAmount: quote.discountAmount,
              ...(quote.couponId && { coupon: { connect: { id: quote.couponId } } }),
              paymentPolicy,
              upfrontAmount: quote.upfrontAmount,
              policySnapshot: policySnapshot as unknown as Prisma.InputJsonValue,
              ...(options.internalNotes !== undefined && {
                internalNotes: options.internalNotes,
              }),
              createdAt,
              items: {
                create: quote.items.map(buildBookingItemCreateInputFromQuoteItem),
              },
            },
            tx,
          );

          if (quote.couponId) {
            await repo.incrementCouponUsage(quote.couponId, tx);
          }

          await repo.createBookingStatusHistory(
            {
              booking: {
                connect: {
                  id: booking.id,
                },
              },
              toStatus: initialStatus,
              actor: {
                connect: {
                  id: options.actorUserId ?? guestSnapshot.userId,
                },
              },
              note:
                options.statusHistoryNote ??
                (paymentPolicy === BookingPaymentPolicy.TOKEN_AT_BOOKING
                  ? "Booking created by guest"
                  : "Booking created without upfront payment"),
            },
            tx,
          );

          await releaseBookingLock(input.inventoryLockToken, booking.id, tx);

          return booking;
        }

        const selectedSpaces =
          input.bookingType === "MULTI_ROOM"
            ? await Promise.all(
                (input.spaceIds ?? []).map((spaceId) =>
                  spacesRepo.findActiveSpaceById(
                    spaceId,
                    now(),
                    scope.tenant.id,
                    tx,
                    {
                      checkIn: input.from,
                      checkOut: input.to,
                      nights,
                    },
                    scope.propertyScope,
                  ),
                ),
              )
            : [
                await spacesRepo.findActiveSpaceById(
                  input.spaceId ?? "",
                  now(),
                  scope.tenant.id,
                  tx,
                  {
                    checkIn: input.from,
                    checkOut: input.to,
                    nights,
                  },
                  scope.propertyScope,
                ),
              ];

        if (selectedSpaces.some((space) => !space)) {
          throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
        }

        const resolvedSelectedSpaces = selectedSpaces.filter(
          (space): space is spacesRepo.PublicSpaceRecord => space !== null,
        );

        const selectedTargets = await Promise.all(
          resolvedSelectedSpaces.map((space) =>
            availabilityService.ensureSpaceAvailable(
              space,
              input.from,
              input.to,
              tx,
              input.inventoryLockToken,
            ),
          ),
        );
        await assertInventoryLockCoversTargets(
          input.inventoryLockToken,
          selectedTargets,
          input.from,
          input.to,
          tx,
        );
        const uniqueTargetKeys = new Set(selectedTargets.map(getTargetKey));

        if (uniqueTargetKeys.size !== resolvedSelectedSpaces.length) {
          throw new HttpError(
            422,
            "DUPLICATE_BOOKING_SPACE",
            "Each selected space can only be booked once",
          );
        }

        const propertyIds = new Set(
          resolvedSelectedSpaces.map((space) => space.propertyId),
        );

        if (propertyIds.size !== 1) {
          throw new HttpError(
            422,
            "MULTI_ROOM_PROPERTY_MISMATCH",
            "Multi-room bookings must stay within one property",
          );
        }

        const propertyId = getArrayItem(
          Array.from(propertyIds),
          0,
          "Missing booking property",
        );

        if (
          requiredPropertyId !== undefined &&
          propertyId !== requiredPropertyId
        ) {
          throw new HttpError(
            422,
            "BOOKING_PROPERTY_MISMATCH",
            "Selected spaces do not belong to the selected property",
          );
        }

        if (
          input.bookingType === "MULTI_ROOM" &&
          selectedTargets.some(
            (target) => target.targetType !== BookingTargetType.ROOM,
          )
        ) {
          throw new HttpError(
            422,
            "MULTI_ROOM_REQUIRES_ROOMS",
            "Multi-room bookings can only combine rooms",
          );
        }

        const selectedCapacity = resolvedSelectedSpaces.reduce(
          (total, space) => total + spacesService.getSpaceCapacity(space),
          0,
        );

        if (input.guests > selectedCapacity) {
          throw new HttpError(
            422,
            "INSUFFICIENT_CAPACITY",
            "Selected spaces do not cover the requested guest count",
          );
        }

        const guestAllocations =
          input.bookingType === "MULTI_ROOM"
            ? allocateGuestsAcrossRooms(resolvedSelectedSpaces, input.guests)
            : [
                {
                  space: getArrayItem(
                    resolvedSelectedSpaces,
                    0,
                    "Missing booking space",
                  ),
                  guestCount: input.guests,
                },
              ];

        const pricedSpaces = await Promise.all(
          guestAllocations.map((allocation, index) =>
            resolvePricedSpace(
              allocation.space,
              getArrayItem(selectedTargets, index, "Missing booking target"),
              allocation.guestCount,
              input.comfortOption,
              scope.tenant.id,
              input.from,
              input.to,
              nights,
              tx,
              scope.propertyScope,
            ),
          ),
        );

        const itemInputs = pricedSpaces.map((space, index) =>
          buildBookingItemCreateInput(
            space,
            getArrayItem(selectedTargets, index, "Missing booking target"),
            nights,
            getArrayItem(guestAllocations, index, "Missing guest allocation")
              .guestCount,
          ),
        );
        const quoteItems = itemInputs.map((item, index) =>
          buildQuoteItemFromBookingInput(
            item,
            getArrayItem(pricedSpaces, index, "Missing priced space")
              .taxInclusive,
          ),
        );
        const pricePerNight = itemInputs.reduce(
          (total, item) => total + Number(item.pricePerNight),
          0,
        );

        const firstSpaceRec = getArrayItem(
          pricedSpaces,
          0,
          "Missing booking space",
        );
        const firstTarget = getArrayItem(
          selectedTargets,
          0,
          "Missing booking target",
        );
        const firstItemInput = getArrayItem(
          itemInputs,
          0,
          "Missing booking item",
        );

        const isMultiRoom = input.bookingType === "MULTI_ROOM";
        const policy = await spacesService.ensureBookingPolicy(firstSpaceRec.propertyId, tx);
        const paymentPolicy =
          options.paymentPolicy ??
          getPaymentPolicyForAdvanceType(policy.advancePaymentType);
        const initialStatus =
          options.initialStatus ??
          (paymentPolicy === BookingPaymentPolicy.NO_UPFRONT_PAYMENT
            ? BookingStatus.CONFIRMED
            : BookingStatus.PENDING);
        const policySnapshot = buildPolicySnapshot(policy, createdAt);
        const quote = await calculateQuoteTotals(
          {
            propertyId: firstSpaceRec.propertyId,
            bookingType: isMultiRoom
              ? BookingType.MULTI_ROOM
              : BookingType.SINGLE_TARGET,
            checkIn: input.from,
            nights,
            guestCount: input.guests,
            comfortOption: input.comfortOption,
            paymentPolicy,
            upfrontAmount: options.upfrontAmount ?? 0,
            currency: scope.tenant.defaultCurrency,
            policy: spacesService.mapPolicy(policy),
            couponCode: input.couponCode,
            items: quoteItems,
            userId: guestSnapshot.userId,
          },
          tx,
        );

        const booking = await repo.createBooking(
          {
            bookingRef,
            property: { connect: { id: firstSpaceRec.propertyId } },
            user: { connect: { id: guestSnapshot.userId } },
            ...(isMultiRoom ? {} : { productId: firstSpaceRec.productId }),
            bookingType: isMultiRoom
              ? BookingType.MULTI_ROOM
              : BookingType.SINGLE_TARGET,
            targetType: isMultiRoom
              ? BookingTargetType.ROOM
              : firstTarget.targetType,
            unitId: isMultiRoom ? null : firstTarget.unitId,
            roomId: isMultiRoom ? null : firstTarget.roomId,
            guestCount: input.guests,
            comfortOption: input.comfortOption,
            guestNameSnapshot: guestSnapshot.fullName,
            guestEmailSnapshot: guestSnapshot.email,
            ...(guestSnapshot.contactNumber !== null && {
              guestContactSnapshot: guestSnapshot.contactNumber,
            }),
            targetLabel: isMultiRoom
              ? `${multiRoomTitle} (${pricedSpaces.length} rooms)`
              : firstItemInput.targetLabel,
            productName: isMultiRoom ? multiRoomTitle : firstSpaceRec.product.name,
            pricePerNight,
            checkIn: input.from,
            checkOut: input.to,
            status: initialStatus,
            subtotalAmount: quote.subtotalAmount,
            taxableAmount: quote.taxableAmount,
            taxAmount: quote.taxAmount,
            taxBreakdown: toTaxBreakdownJson(quote.taxBreakdown),
            totalAmount: quote.totalAmount,
            discountAmount: quote.discountAmount,
            ...(quote.couponId && { coupon: { connect: { id: quote.couponId } } }),
            paymentPolicy,
            upfrontAmount: quote.upfrontAmount,
            policySnapshot: policySnapshot as unknown as Prisma.InputJsonValue,
            ...(options.internalNotes !== undefined && {
              internalNotes: options.internalNotes,
            }),
            createdAt,
            items: {
              create: quote.items.map(buildBookingItemCreateInputFromQuoteItem),
            },
          },
          tx,
        );

        if (quote.couponId) {
          await repo.incrementCouponUsage(quote.couponId, tx);
        }

        await repo.createBookingStatusHistory(
          {
            booking: {
              connect: {
                id: booking.id,
              },
            },
            toStatus: initialStatus,
            actor: {
              connect: {
                id: options.actorUserId ?? guestSnapshot.userId,
              },
            },
            note:
              options.statusHistoryNote ??
              (paymentPolicy === BookingPaymentPolicy.TOKEN_AT_BOOKING
                ? "Booking created by guest"
                : "Booking created without upfront payment"),
          },
          tx,
        );

        await releaseBookingLock(input.inventoryLockToken, booking.id, tx);

        return booking;
      });

      return mapBooking(booking);
    } catch (error) {
      if (
        attempt < maxBookingTransactionAttempts &&
        isRetryableBookingTransactionError(error)
      ) {
        continue;
      }

      if (isRetryableBookingTransactionError(error)) {
        throw new HttpError(
          409,
          "BOOKING_CONFLICT",
          "Selected space is no longer available for these dates",
        );
      }

      throw error;
    }
  }

  throw new HttpError(
    409,
    "BOOKING_CONFLICT",
    "Selected space is no longer available for these dates",
  );
};

export const getBookingQuote = async (
  userId: string | undefined,
  input: PublicBookingQuoteInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicBookingQuoteDTO> => {
  const scope = await tenantService.resolvePublicScope(tenantInput);
  const nights = getNights(input.from, input.to);

  return repo.runSerializableTransaction(async (tx) => {
    if (input.bookingOptionId !== undefined) {
      const optionPropertyScope = getOptionPropertyScope(
        scope.propertyScope,
        input.propertyId,
      );
      const requiredPropertyId = getRequiredPropertyId(
        scope.propertyScope,
        input.propertyId,
      );
      const option = await availabilityService.findAvailabilityOptionById(
        input.bookingOptionId,
        {
          checkIn: input.from,
          checkOut: input.to,
          guests: input.guests,
          comfortOption: input.comfortOption,
        },
        scope.tenant.id,
        nights,
        optionPropertyScope,
        tx,
        input.inventoryLockToken,
      );

      if (!option) {
        throw new HttpError(
          409,
          "BOOKING_OPTION_UNAVAILABLE",
          "Selected booking option is no longer available",
        );
      }

      if (
        requiredPropertyId !== undefined &&
        option.propertyId !== requiredPropertyId
      ) {
        throw new HttpError(
          422,
          "BOOKING_PROPERTY_MISMATCH",
          "Selected option does not belong to the selected property",
        );
      }

      await assertInventoryLockCoversTargets(
        input.inventoryLockToken,
        option.items.map((item) => item.target),
        input.from,
        input.to,
        tx,
      );
      const policy = await spacesService.ensureBookingPolicy(option.propertyId, tx);
      const paymentPolicy = getPaymentPolicyForAdvanceType(
        policy.advancePaymentType,
      );

      return calculateQuoteTotals(
        {
          propertyId: option.propertyId,
          bookingType:
            option.items.length > 1
              ? BookingType.MULTI_ROOM
              : BookingType.SINGLE_TARGET,
          checkIn: input.from,
          nights,
          guestCount: input.guests,
          comfortOption: input.comfortOption,
          paymentPolicy,
          upfrontAmount: 0,
          currency: scope.tenant.defaultCurrency,
          policy: spacesService.mapPolicy(policy),
          couponCode: input.couponCode,
          items: option.items.map((item) =>
            buildQuoteItemFromOptionItem(item, nights, input.comfortOption),
          ),
          userId,
        },
        tx,
      );
    }

    const selectedSpaces =
      input.bookingType === "MULTI_ROOM"
        ? await Promise.all(
            (input.spaceIds ?? []).map((spaceId) =>
              spacesRepo.findActiveSpaceById(
                spaceId,
                now(),
                scope.tenant.id,
                tx,
                {
                  checkIn: input.from,
                  checkOut: input.to,
                  nights,
                },
                scope.propertyScope,
              ),
            ),
          )
        : [
            await spacesRepo.findActiveSpaceById(
              input.spaceId ?? "",
              now(),
              scope.tenant.id,
              tx,
              {
                checkIn: input.from,
                checkOut: input.to,
                nights,
              },
              scope.propertyScope,
            ),
          ];

    if (selectedSpaces.some((space) => !space)) {
      throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
    }

    const resolvedSelectedSpaces = selectedSpaces.filter(
      (space): space is spacesRepo.PublicSpaceRecord => space !== null,
    );
    const selectedTargets = await Promise.all(
      resolvedSelectedSpaces.map((space) =>
        availabilityService.ensureSpaceAvailable(
          space,
          input.from,
          input.to,
          tx,
          input.inventoryLockToken,
        ),
      ),
    );

    await assertInventoryLockCoversTargets(
      input.inventoryLockToken,
      selectedTargets,
      input.from,
      input.to,
      tx,
    );

    const uniqueTargetKeys = new Set(selectedTargets.map(getTargetKey));
    if (uniqueTargetKeys.size !== resolvedSelectedSpaces.length) {
      throw new HttpError(
        422,
        "DUPLICATE_BOOKING_SPACE",
        "Each selected space can only be booked once",
      );
    }

    const propertyIds = new Set(
      resolvedSelectedSpaces.map((space) => space.propertyId),
    );
    if (propertyIds.size !== 1) {
      throw new HttpError(
        422,
        "MULTI_ROOM_PROPERTY_MISMATCH",
        "Multi-room bookings must stay within one property",
      );
    }

    const isMultiRoom = input.bookingType === "MULTI_ROOM";
    if (
      isMultiRoom &&
      selectedTargets.some((target) => target.targetType !== BookingTargetType.ROOM)
    ) {
      throw new HttpError(
        422,
        "MULTI_ROOM_REQUIRES_ROOMS",
        "Multi-room bookings can only combine rooms",
      );
    }

    const selectedCapacity = resolvedSelectedSpaces.reduce(
      (total, space) => total + spacesService.getSpaceCapacity(space),
      0,
    );
    if (input.guests > selectedCapacity) {
      throw new HttpError(
        422,
        "INSUFFICIENT_CAPACITY",
        "Selected spaces do not cover the requested guest count",
      );
    }

    const guestAllocations = isMultiRoom
      ? allocateGuestsAcrossRooms(resolvedSelectedSpaces, input.guests)
      : [
          {
            space: getArrayItem(
              resolvedSelectedSpaces,
              0,
              "Missing booking space",
            ),
            guestCount: input.guests,
          },
        ];
    const pricedSpaces = await Promise.all(
      guestAllocations.map((allocation, index) =>
        resolvePricedSpace(
          allocation.space,
          getArrayItem(selectedTargets, index, "Missing booking target"),
          allocation.guestCount,
          input.comfortOption,
          scope.tenant.id,
          input.from,
          input.to,
          nights,
          tx,
          scope.propertyScope,
        ),
      ),
    );
    const itemInputs = pricedSpaces.map((space, index) =>
      buildBookingItemCreateInput(
        space,
        getArrayItem(selectedTargets, index, "Missing booking target"),
        nights,
        getArrayItem(guestAllocations, index, "Missing guest allocation")
          .guestCount,
      ),
    );
    const propertyId = getArrayItem(
      Array.from(propertyIds),
      0,
      "Missing booking property",
    );
    const policy = await spacesService.ensureBookingPolicy(propertyId, tx);
    const paymentPolicy = getPaymentPolicyForAdvanceType(policy.advancePaymentType);

    return calculateQuoteTotals(
      {
        propertyId,
        bookingType: isMultiRoom ? BookingType.MULTI_ROOM : BookingType.SINGLE_TARGET,
        checkIn: input.from,
        nights,
        guestCount: input.guests,
        comfortOption: input.comfortOption,
        paymentPolicy,
        upfrontAmount: 0,
        currency: scope.tenant.defaultCurrency,
        policy: spacesService.mapPolicy(policy),
        couponCode: input.couponCode,
        items: itemInputs.map((item, index) =>
          buildQuoteItemFromBookingInput(
            item,
            getArrayItem(pricedSpaces, index, "Missing priced space")
              .taxInclusive,
          ),
        ),
        userId,
      },
      tx,
    );
  });
};

export const createBooking = async (
  userId: string | undefined,
  input: CreatePublicBookingInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicBookingDTO> =>
  createBookingForUser(userId, input, tenantInput);

export const getBookingCheckoutQuote = async (
  userId: string | undefined,
  bookingId: string,
  input: PublicBookingCheckoutQuoteInput,
): Promise<PublicBookingQuoteDTO> =>
  repo.runSerializableTransaction(async (tx) => {
    const booking = await repo.findBookingById(bookingId, tx);
    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    await assertBookingCheckoutEditable(
      booking,
      userId,
      input.editToken,
      tx,
    );

    return calculateExistingBookingCheckoutQuote(
      booking,
      input.couponCode === undefined ? (booking.coupon?.code ?? null) : input.couponCode,
      tx,
    );
  });

export const updateBookingCheckout = async (
  userId: string | undefined,
  bookingId: string,
  input: UpdatePublicBookingCheckoutInput,
): Promise<PublicBookingDTO> => {
  for (let attempt = 1; attempt <= maxBookingTransactionAttempts; attempt += 1) {
    try {
      return await repo.runSerializableTransaction(async (tx) => {
        const booking = await repo.findBookingById(bookingId, tx);
        if (!booking) {
          throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
        }

        await assertBookingCheckoutEditable(
          booking,
          userId,
          input.editToken,
          tx,
        );

        const quote = await calculateExistingBookingCheckoutQuote(
          booking,
          input.couponCode === undefined
            ? (booking.coupon?.code ?? null)
            : input.couponCode,
          tx,
        );
        const currentCouponId = booking.couponId ?? undefined;
        const nextCouponId = quote.couponId;

        if (currentCouponId !== undefined && currentCouponId !== nextCouponId) {
          await repo.decrementCouponUsage(currentCouponId, tx);
        }

        if (nextCouponId !== undefined && nextCouponId !== currentCouponId) {
          await repo.incrementCouponUsage(nextCouponId, tx);
        }

        const updatedBooking = await repo.updateBookingById(
          booking.id,
          {
            guestNameSnapshot: input.guestDetails.name,
            guestEmailSnapshot: input.guestDetails.email,
            guestContactSnapshot: input.guestDetails.contactNumber,
            subtotalAmount: quote.subtotalAmount,
            discountAmount: quote.discountAmount,
            taxableAmount: quote.taxableAmount,
            taxAmount: quote.taxAmount,
            taxBreakdown: toTaxBreakdownJson(quote.taxBreakdown),
            totalAmount: quote.totalAmount,
            upfrontAmount: quote.upfrontAmount,
            ...(nextCouponId !== currentCouponId && {
              coupon:
                nextCouponId !== undefined
                  ? { connect: { id: nextCouponId } }
                  : { disconnect: true },
            }),
          },
          tx,
        );

        return mapBooking(updatedBooking);
      });
    } catch (error) {
      if (
        attempt < maxBookingTransactionAttempts &&
        isRetryableBookingTransactionError(error)
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new HttpError(
    409,
    "BOOKING_CONFLICT",
    "Selected space is no longer available for these dates",
  );
};

export const listBookings = async (
  userId: string,
): Promise<PublicBookingDTO[]> => {
  const bookings = await repo.listBookingsByUser(userId);
  const syncedBookings = await Promise.all(
    bookings.map(syncFulfilledRefundRequest),
  );
  return Promise.all(syncedBookings.map(mapBooking));
};

export const getBookingById = async (
  userId: string,
  bookingId: string,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingByUser(bookingId, userId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return mapBooking(await syncFulfilledRefundRequest(booking));
};

export const getBookingByIdPublic = async (
  bookingId: string,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return mapBooking(await syncFulfilledRefundRequest(booking));
};

export const getCancellationPreview = async (
  userId: string,
  bookingId: string,
): Promise<PublicBookingPolicyPreviewDTO> => {
  const booking = await repo.findBookingByUser(bookingId, userId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return buildBookingPolicyPreview(booking);
};

export const getRefundPreview = async (
  userId: string,
  bookingId: string,
): Promise<PublicBookingPolicyPreviewDTO> => {
  const booking = await repo.findBookingByUser(bookingId, userId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return buildBookingPolicyPreview(booking);
};

export const cancelBooking = async (
  userId: string,
  bookingId: string,
  reason?: string,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingByUser(bookingId, userId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    throw new HttpError(
      409,
      "BOOKING_NOT_CANCELLABLE",
      "Only pending or confirmed bookings can be cancelled",
    );
  }

  const cancellationReason = reason?.trim() || "Cancelled by guest";
  const updatedBooking = await repo.updateBookingCancellationById(
    booking.id,
    {
      status: BookingStatus.CANCELLED,
      cancellationReason,
      cancelledAt: now(),
    },
    {
      booking: {
        connect: {
          id: booking.id,
        },
      },
      fromStatus: booking.status,
      toStatus: BookingStatus.CANCELLED,
      actor: {
        connect: {
          id: userId,
        },
      },
      note: cancellationReason,
    },
  );
  await availabilityRepo.releaseInventoryLocksByBooking(booking.id, now());

  return mapBooking(updatedBooking);
};

export const createRefundRequest = async (
  userId: string,
  bookingId: string,
  reason: string,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingByUser(bookingId, userId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  if (
    booking.status !== BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.NO_SHOW
  ) {
    throw new HttpError(
      409,
      "REFUND_REQUEST_NOT_ALLOWED",
      "Refund can be requested only for cancelled or no-show bookings",
    );
  }

  if ((await getRefundableAmount(booking)) <= 0) {
    throw new HttpError(
      409,
      "BOOKING_NOT_REFUNDABLE",
      "This booking does not have a refundable payment balance",
    );
  }

  const activeRequest = booking.refundRequests.find((request) =>
    activeRefundRequestStatuses.includes(request.status),
  );
  if (activeRequest) {
    throw new HttpError(
      409,
      "REFUND_REQUEST_ALREADY_EXISTS",
      "A refund request is already active for this booking",
    );
  }

  await repo.createBookingRefundRequest({
    booking: {
      connect: {
        id: booking.id,
      },
    },
    property: {
      connect: {
        id: booking.propertyId,
      },
    },
    user: {
      connect: {
        id: booking.userId,
      },
    },
    status: BookingRefundRequestStatus.REQUESTED,
    reason,
  });

  const updatedBooking = await repo.findBookingByUser(bookingId, userId);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return mapBooking(updatedBooking);
};
