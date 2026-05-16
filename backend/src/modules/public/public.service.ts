import {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingStatus,
  BookingTargetType,
  BookingType,
  ComfortOption,
  Prisma,
  PaymentStatus,
  UnitStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import { randomUUID } from "node:crypto";
import { HttpError } from "@/common/errors/http-error.js";
import { hashPassword } from "@/common/utils/password.js";
import * as repo from "./public.repository.js";
import type {
  CheckAvailabilityInput,
  CreatePublicBookingInput,
  CreatePublicEnquiryInput,
  PublicBookingGuestDetailsInput,
  PublicSpaceTarget,
  TenantResolutionInput,
} from "./public.inputs.js";
import type {
  PublicAvailabilityDTO,
  PublicBookingDTO,
  PublicEnquiryDTO,
  PublicSpaceDTO,
  PublicTenantConfigDTO,
} from "./public.dto.js";
import {
  findAvailabilityOptionById,
  getPublicAvailabilityOptions,
  type PublicAvailabilityOptionInternal,
} from "./public-availability.service.js";

const now = () => new Date();
const maxBookingTransactionAttempts = 3;
const multiRoomTitle = "Multi-room stay";

const normalizeHost = (host?: string) => host?.split(":")[0]?.toLowerCase();

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

const mapTenantConfig = (
  tenant: NonNullable<Awaited<ReturnType<typeof repo.findDefaultTenant>>>,
): PublicTenantConfigDTO => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  brandName: tenant.brandName,
  logoUrl: tenant.logoUrl ?? null,
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? null,
  supportPhone: tenant.supportPhone ?? null,
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
  payAtCheckInEnabled: tenant.payAtCheckInEnabled,
  bookingTokenAmount: Number(tenant.bookingTokenAmount),
});

export const resolveTenant = async (input: TenantResolutionInput = {}) => {
  if (input.tenantId) {
    const tenant = await repo.findActiveTenantById(input.tenantId);
    if (tenant) {
      return tenant;
    }
  }

  if (input.tenantSlug) {
    const tenant = await repo.findActiveTenantBySlug(input.tenantSlug);
    if (tenant) {
      return tenant;
    }
  }

  const host = normalizeHost(input.host);
  if (host) {
    const tenant = await repo.findActiveTenantByDomain(host);
    if (tenant) {
      return tenant;
    }
  }

  const tenant = await repo.findDefaultTenant();
  if (!tenant) {
    throw new HttpError(503, "TENANT_UNAVAILABLE", "Tenant is not configured");
  }

  return tenant;
};

export const getTenantConfig = async (
  input: TenantResolutionInput = {},
): Promise<PublicTenantConfigDTO> => {
  const tenant = await resolveTenant(input);
  return mapTenantConfig(tenant);
};

const getNights = (checkIn: Date, checkOut: Date) => {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(1, nights);
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

const getSpaceTarget = (space: repo.PublicSpaceRecord): PublicSpaceTarget => {
  if (space.roomId) {
    return {
      targetType: BookingTargetType.ROOM,
      unitId: space.room?.unitId ?? null,
      roomId: space.roomId,
    };
  }

  if (space.unitId) {
    return {
      targetType: BookingTargetType.UNIT,
      unitId: space.unitId,
      roomId: null,
    };
  }

  throw new HttpError(
    422,
    "SPACE_NOT_BOOKABLE",
    "Space is missing a bookable target",
  );
};

const getSpaceCapacity = (space: repo.PublicSpaceRecord) =>
  space.room?.maxOccupancy ?? space.product.occupancy;

const getSpaceComfortOption = (space: repo.PublicSpaceRecord) =>
  space.product.hasAC ? ComfortOption.AC : ComfortOption.NON_AC;

const getSpaceTitle = (space: repo.PublicSpaceRecord) => {
  if (space.room) {
    return `${space.property.name} - Private Room`;
  }

  return `${space.property.name} - Whole Unit`;
};

const getSpaceLocation = (space: repo.PublicSpaceRecord) =>
  `${space.property.city}, ${space.property.state}`;

const mapSpace = (space: repo.PublicSpaceRecord): PublicSpaceDTO => {
  const target = getSpaceTarget(space);

  return {
    id: space.id,
    propertyId: space.propertyId,
    title: getSpaceTitle(space),
    description: `${space.product.category.toLowerCase()} stay at ${space.property.name}`,
    pricePerNight: Number(space.price),
    capacity: getSpaceCapacity(space),
    guestCount: space.product.occupancy,
    hasAC: space.room?.hasAC ?? space.product.hasAC,
    comfortOption: getSpaceComfortOption(space),
    location: getSpaceLocation(space),
    targetType: target.targetType,
    unitId: target.unitId,
    roomId: target.roomId,
  };
};

const mapBooking = (booking: repo.PublicBookingRecord): PublicBookingDTO => {
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
    totalAmount: Number(item.totalAmount),
  }));
  const title =
    booking.bookingType === BookingType.MULTI_ROOM
      ? `${multiRoomTitle} (${items.length} rooms)`
      : `${booking.productName} - ${booking.targetLabel}`;
  const paidAmount = booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const balanceAmount = Math.max(0, Number(booking.totalAmount) - paidAmount);
  const paymentStatus =
    paidAmount <= 0
      ? BookingPaymentStatus.PENDING
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
    guestName: booking.guestNameSnapshot,
    guestEmail: booking.guestEmailSnapshot,
    guestContactNumber: booking.guestContactSnapshot ?? null,
    from: booking.checkIn.toISOString(),
    to: booking.checkOut.toISOString(),
    pricePerNight: Number(booking.pricePerNight),
    totalPrice: Number(booking.totalAmount),
    paidAmount,
    balanceAmount,
    remainingPayAtCheckIn: balanceAmount,
    items,
    internalNotes: booking.internalNotes ?? null,
    cancellationReason: booking.cancellationReason ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
  };
};

const mapEnquiry = (enquiry: {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source: string | null;
  createdAt: Date;
}): PublicEnquiryDTO => ({
  id: enquiry.id,
  propertyId: enquiry.propertyId,
  name: enquiry.name,
  email: enquiry.email,
  contactNumber: enquiry.contactNumber,
  message: enquiry.message,
  source: enquiry.source ?? null,
  createdAt: enquiry.createdAt.toISOString(),
});

const ensureSpaceAvailable = async (
  space: repo.PublicSpaceRecord,
  checkIn: Date,
  checkOut: Date,
  tx?: Prisma.TransactionClient,
) => {
  const target = getSpaceTarget(space);
  const unit = space.unit ?? space.room?.unit;

  if (unit && (!unit.isActive || unit.status !== UnitStatus.ACTIVE)) {
    throw new HttpError(
      409,
      "UNIT_DISABLED",
      "The parent unit for this space is currently disabled or inactive",
    );
  }

  const [hasBooking, hasMaintenance] = await Promise.all([
    repo.hasOverlappingBooking(target, checkIn, checkOut, tx),
    repo.hasOverlappingMaintenance(
      space.propertyId,
      target,
      checkIn,
      checkOut,
      tx,
    ),
  ]);

  if (hasBooking || hasMaintenance) {
    throw new HttpError(
      409,
      "SPACE_NOT_AVAILABLE",
      "Selected space is not available for these dates",
    );
  }

  return target;
};

const isRetryableBookingTransactionError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2034" || error.code === "P2002");

export const listSpaces = async (
  input: TenantResolutionInput = {},
): Promise<PublicSpaceDTO[]> => {
  const tenant = await resolveTenant(input);
  const spaces = await repo.listActiveSpaces(now(), undefined, tenant.id);
  return spaces.map(mapSpace);
};

export const getSpaceById = async (
  id: string,
  input: TenantResolutionInput = {},
): Promise<PublicSpaceDTO> => {
  const tenant = await resolveTenant(input);
  const space = await repo.findActiveSpaceById(id, now(), tenant.id);
  if (!space) {
    throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
  }

  return mapSpace(space);
};

export const checkAvailability = async (
  input: CheckAvailabilityInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicAvailabilityDTO> => {
  const tenant = await resolveTenant(tenantInput);
  const nights = getNights(input.checkIn, input.checkOut);
  const options = await getPublicAvailabilityOptions(input, tenant.id, nights);

  return {
    available: options.length > 0,
    options,
  };
};

const buildBookingItemCreateInput = (
  space: repo.PublicSpaceRecord,
  target: PublicSpaceTarget,
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
    comfortOption: getSpaceComfortOption(space),
    targetLabel: target.roomId
      ? `${space.room?.name ?? "Room"} ${space.room?.number ?? ""}`.trim()
      : `Unit ${space.unit?.unitNumber ?? ""}`.trim(),
    productName: space.product.name,
    capacity: getSpaceCapacity(space),
    pricePerNight,
    totalAmount: pricePerNight * nights,
  };
};

const buildOptionBookingItemCreateInput = (
  item: PublicAvailabilityOptionInternal["items"][number],
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
  totalAmount: item.pricePerNight * nights,
});

const getTargetKey = (target: PublicSpaceTarget) =>
  target.targetType === BookingTargetType.ROOM
    ? `ROOM:${target.roomId ?? ""}`
    : `UNIT:${target.unitId ?? ""}`;

const allocateGuestsAcrossRooms = (
  spaces: repo.PublicSpaceRecord[],
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
    remainingCapacity: Math.max(0, getSpaceCapacity(space) - 1),
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
  space: repo.PublicSpaceRecord,
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
  space: repo.PublicSpaceRecord,
  target: PublicSpaceTarget,
  guestCount: number,
  comfortOption: ComfortOption,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
  nights: number,
  tx: Prisma.TransactionClient,
) => {
  const capacity = getSpaceCapacity(space);

  if (guestCount > capacity) {
    throw new HttpError(
      422,
      "INSUFFICIENT_CAPACITY",
      "Selected room does not cover the assigned guest count",
    );
  }

  assertComfortAvailableForSpace(space, comfortOption);

  const pricedSpace = await repo.findActivePricingForTarget(
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

export const createBookingForUser = async (
  userId: string | undefined,
  input: CreatePublicBookingInput,
  tenantInput: TenantResolutionInput = {},
  options: CreateBookingOptions = {},
): Promise<PublicBookingDTO> => {
  const tenant = await resolveTenant(tenantInput);
  const nights = getNights(input.from, input.to);
  const paymentPolicy =
    options.paymentPolicy ??
    (tenant.payAtCheckInEnabled
      ? BookingPaymentPolicy.TOKEN_AT_BOOKING
      : BookingPaymentPolicy.NO_UPFRONT_PAYMENT);
  const upfrontAmount =
    options.upfrontAmount ??
    (tenant.payAtCheckInEnabled ? Number(tenant.bookingTokenAmount) : 0);
  const initialStatus =
    options.initialStatus ??
    (tenant.payAtCheckInEnabled ? BookingStatus.PENDING : BookingStatus.CONFIRMED);

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
          const option = await findAvailabilityOptionById(
            input.bookingOptionId,
            {
              checkIn: input.from,
              checkOut: input.to,
              guests: input.guests,
              comfortOption: input.comfortOption,
            },
            tenant.id,
            nights,
            tx,
          );

          if (!option) {
            throw new HttpError(
              409,
              "BOOKING_OPTION_UNAVAILABLE",
              "Selected booking option is no longer available",
            );
          }

          if (
            options.requiredPropertyId !== undefined &&
            option.propertyId !== options.requiredPropertyId
          ) {
            throw new HttpError(
              422,
              "BOOKING_PROPERTY_MISMATCH",
              "Selected option does not belong to the selected property",
            );
          }

          const itemInputs = option.items.map((item) =>
            buildOptionBookingItemCreateInput(
              item,
              nights,
              input.comfortOption,
            ),
          );
          const totalAmount = option.stayTotal;
          const bookingUpfrontAmount = Math.min(upfrontAmount, totalAmount);
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
              totalAmount,
              paymentPolicy,
              upfrontAmount: bookingUpfrontAmount,
              ...(options.internalNotes !== undefined && {
                internalNotes: options.internalNotes,
              }),
              createdAt,
              items: {
                create: itemInputs,
              },
            },
            tx,
          );

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
                (tenant.payAtCheckInEnabled
                  ? "Booking created by guest"
                  : "Booking created without upfront payment"),
            },
            tx,
          );

          return booking;
        }

        const selectedSpaces =
          input.bookingType === "MULTI_ROOM"
            ? await Promise.all(
                (input.spaceIds ?? []).map((spaceId) =>
                  repo.findActiveSpaceById(spaceId, now(), tenant.id, tx, {
                    checkIn: input.from,
                    checkOut: input.to,
                    nights,
                  }),
                ),
              )
            : [
                await repo.findActiveSpaceById(
                  input.spaceId ?? "",
                  now(),
                  tenant.id,
                  tx,
                  {
                    checkIn: input.from,
                    checkOut: input.to,
                    nights,
                  },
                ),
              ];

        if (selectedSpaces.some((space) => !space)) {
          throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
        }

        const resolvedSelectedSpaces = selectedSpaces.filter(
          (space): space is repo.PublicSpaceRecord => space !== null,
        );

        const selectedTargets = await Promise.all(
          resolvedSelectedSpaces.map((space) =>
            ensureSpaceAvailable(space, input.from, input.to, tx),
          ),
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
          options.requiredPropertyId !== undefined &&
          propertyId !== options.requiredPropertyId
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
          (total, space) => total + getSpaceCapacity(space),
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
              tenant.id,
              input.from,
              input.to,
              nights,
              tx,
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
        const totalAmount = itemInputs.reduce(
          (total, item) => total + Number(item.totalAmount),
          0,
        );
        const bookingUpfrontAmount = Math.min(upfrontAmount, totalAmount);
        const pricePerNight = itemInputs.reduce(
          (total, item) => total + Number(item.pricePerNight),
          0,
        );
        const firstSpace = getArrayItem(
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

        const booking = await repo.createBooking(
          {
            bookingRef,
            property: { connect: { id: firstSpace.propertyId } },
            user: { connect: { id: guestSnapshot.userId } },
            ...(isMultiRoom ? {} : { productId: firstSpace.productId }),
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
            productName: isMultiRoom ? multiRoomTitle : firstSpace.product.name,
            pricePerNight,
            checkIn: input.from,
            checkOut: input.to,
            status: initialStatus,
            totalAmount,
            paymentPolicy,
            upfrontAmount: bookingUpfrontAmount,
            ...(options.internalNotes !== undefined && {
              internalNotes: options.internalNotes,
            }),
            createdAt,
            items: {
              create: itemInputs,
            },
          },
          tx,
        );

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
              (tenant.payAtCheckInEnabled
                ? "Booking created by guest"
                : "Booking created without upfront payment"),
          },
          tx,
        );

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

export const createBooking = async (
  userId: string | undefined,
  input: CreatePublicBookingInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicBookingDTO> =>
  createBookingForUser(userId, input, tenantInput);

export const listBookings = async (
  userId: string,
): Promise<PublicBookingDTO[]> => {
  const bookings = await repo.listBookingsByUser(userId);
  return bookings.map(mapBooking);
};

export const getBookingById = async (
  userId: string,
  bookingId: string,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingByUser(bookingId, userId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return mapBooking(booking);
};

export const getBookingByIdPublic = async (
  bookingId: string,
): Promise<PublicBookingDTO> => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return mapBooking(booking);
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

  if (booking.checkIn <= now()) {
    throw new HttpError(
      409,
      "BOOKING_CANCELLATION_CLOSED",
      "Bookings can be cancelled only before check-in",
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

  return mapBooking(updatedBooking);
};

export const createEnquiry = async (
  input: CreatePublicEnquiryInput,
): Promise<PublicEnquiryDTO> => {
  const property = input.propertyId
    ? await repo.findActivePropertyById(input.propertyId, input.tenantId)
    : await repo.findDefaultProperty(input.tenantId);

  if (!property) {
    throw new HttpError(
      422,
      "PROPERTY_NOT_AVAILABLE",
      "No active property is available for enquiries",
    );
  }

  const enquiry = await repo.createEnquiry({
    property: { connect: { id: property.id } },
    name: input.name,
    email: input.email,
    contactNumber: input.contactNumber,
    message: input.message,
    source: input.source ?? "PUBLIC_WEBSITE",
  });

  return mapEnquiry(enquiry);
};
