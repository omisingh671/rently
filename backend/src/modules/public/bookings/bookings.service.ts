import {
  BookingPaymentPolicy,
  BookingRefundRequestStatus,
  BookingStatus,
  BookingTargetType,
  BookingType,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  buildPolicySnapshot,
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
  PublicBookingCheckoutQuoteInput,
  UpdatePublicBookingCheckoutInput,
} from "./bookings.inputs.js";
import type {
  PublicBookingDTO,
  PublicBookingQuoteDTO,
} from "./bookings.dto.js";
import type { TenantResolutionInput } from "@/modules/public/tenant/tenant.inputs.js";
import * as availabilityRepo from "@/modules/public/availability/availability.repository.js";
import {
  assertBookingCheckoutEditable,
  assertPublicBookingAccess,
} from "./bookings.access.js";
import { activeRefundRequestStatuses } from "./bookings.financials.js";
import { toTaxBreakdownJson } from "./bookings.tax-breakdown.js";
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
} from "./bookings.mapping.js";
import {
  buildBookingPolicyPreview,
  type PublicBookingPolicyPreviewDTO,
} from "./bookings.policy.js";
import { calculateQuoteTotals } from "./bookings.pricing.js";
import { mapBooking } from "./bookings.presenter.js";
import {
  getRefundableAmount,
  syncFulfilledRefundRequest,
} from "./bookings.refunds.js";
import {
  generateBookingRef,
  getNights,
  isRetryableBookingTransactionError,
  maxBookingTransactionAttempts,
  releaseBookingLock,
} from "./bookings.lifecycle.js";
import { resolveBookingGuestSnapshot } from "./bookings.guests.js";
import { calculateExistingBookingCheckoutQuote } from "./bookings.checkout-quote.js";

const now = () => new Date();
const multiRoomTitle = "Multi-room stay";

interface CreateBookingOptions {
  actorUserId?: string;
  requiredPropertyId?: string;
  paymentPolicy?: BookingPaymentPolicy;
  upfrontAmount?: number;
  initialStatus?: BookingStatus;
  statusHistoryNote?: string;
  internalNotes?: string | null;
}

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
