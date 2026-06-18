import {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingStatus,
  BookingTargetType,
  BookingType,
  ComfortOption,
  Prisma,
  PaymentRefundStatus,
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
} from "@/modules/booking-policy/booking-policy.policy.js";
import * as repo from "./bookings.repository.js";
import * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import * as tenantService from "@/modules/public/tenant/tenant.service.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import * as availabilityService from "@/modules/public/availability/availability.service.js";
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
import type { PublicBookingPolicyDTO } from "@/modules/public/spaces/spaces.dto.js";
import * as availabilityRepo from "@/modules/public/availability/availability.repository.js";
import {
  assertBookingCheckoutEditable,
  assertPublicBookingAccess,
} from "./bookings.access.js";
import {
  activeRefundRequestStatuses,
  getNonRefundableTokenAmount,
  getPaidAmount,
  getRefundedAmount,
  getTokenPaidAmount,
  getTokenPaymentStatus,
} from "./bookings.financials.js";
import {
  getBookingTaxBreakdown,
  toTaxBreakdownJson,
} from "./bookings.tax-breakdown.js";
import {
  allocateGuestsAcrossRooms,
  assertInventoryLockCoversTargets,
  getArrayItem,
  getOptionPropertyScope,
  getRequiredPropertyId,
  getTargetKey,
  resolvePricedSpace,
} from "./bookings.targets.js";
import {
  buildBookingItemCreateInput,
  buildBookingItemCreateInputFromQuoteItem,
  buildQuoteItemFromBookingInput,
  buildQuoteItemFromOptionItem,
  buildQuoteItemsFromBooking,
  mapBookingItems,
} from "./bookings.mapping.js";
import {
  buildBookingPolicyPreview,
  getBookingPolicyDto,
  type PublicBookingPolicyPreviewDTO,
} from "./bookings.policy.js";
import {
  normalizeCouponCode,
  validateAndApplyCoupon,
} from "./bookings.coupons.js";

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

const mapBooking = async (
  booking: repo.PublicBookingRecord,
): Promise<PublicBookingDTO> => {
  const items = mapBookingItems(booking.items);
  const title =
    booking.bookingType === BookingType.MULTI_ROOM
      ? booking.targetLabel
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

export const getBookingByIdForPublicAccess = async (
  userId: string | undefined,
  bookingId: string,
  checkoutToken: string | undefined,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  await assertPublicBookingAccess(booking, userId, checkoutToken);

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
