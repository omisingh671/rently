import {
  BookingStatus,
  BookingTargetType,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./public.repository.js";
import type {
  CheckAvailabilityInput,
  CreatePublicBookingInput,
  CreatePublicEnquiryInput,
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

const now = () => new Date();
const maxBookingTransactionAttempts = 3;

const normalizeHost = (host?: string) => host?.split(":")[0]?.toLowerCase();

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
});

export const resolveTenant = async (input: TenantResolutionInput = {}) => {
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

const getSpaceTitle = (space: repo.PublicSpaceRecord) => {
  const targetName = space.room
    ? `${space.room.name} ${space.room.number}`
    : `Unit ${space.unit?.unitNumber ?? ""}`.trim();

  return `${space.property.name} - ${space.product.name} - ${targetName}`;
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
    capacity: space.product.occupancy,
    location: getSpaceLocation(space),
    targetType: target.targetType,
    unitId: target.unitId,
    roomId: target.roomId,
  };
};

const mapBooking = (booking: {
  id: string;
  bookingRef: string;
  userId: string;
  propertyId: string;
  productId: string | null;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  targetLabel: string;
  productName: string;
  pricePerNight: { toString(): string };
  checkIn: Date;
  checkOut: Date;
  status: PublicBookingDTO["status"];
  totalAmount: { toString(): string };
  guestNameSnapshot: string;
  guestEmailSnapshot: string;
  guestContactSnapshot: string | null;
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
}): PublicBookingDTO => ({
  id: booking.id,
  bookingRef: booking.bookingRef,
  userId: booking.userId,
  spaceId: booking.roomId ?? booking.unitId ?? booking.productId ?? booking.id,
  propertyId: booking.propertyId,
  title: `${booking.productName} - ${booking.targetLabel}`,
  spaceName: booking.targetLabel,
  status: booking.status,
  guestName: booking.guestNameSnapshot,
  guestEmail: booking.guestEmailSnapshot,
  guestContactNumber: booking.guestContactSnapshot ?? null,
  from: booking.checkIn.toISOString(),
  to: booking.checkOut.toISOString(),
  pricePerNight: Number(booking.pricePerNight),
  totalPrice: Number(booking.totalAmount),
  internalNotes: booking.internalNotes ?? null,
  cancellationReason: booking.cancellationReason ?? null,
  cancelledAt: booking.cancelledAt?.toISOString() ?? null,
  createdAt: booking.createdAt.toISOString(),
});

const mapEnquiry = (enquiry: {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  createdAt: Date;
}): PublicEnquiryDTO => ({
  id: enquiry.id,
  propertyId: enquiry.propertyId,
  name: enquiry.name,
  email: enquiry.email,
  contactNumber: enquiry.contactNumber,
  message: enquiry.message,
  createdAt: enquiry.createdAt.toISOString(),
});

const ensureSpaceAvailable = async (
  space: repo.PublicSpaceRecord,
  checkIn: Date,
  checkOut: Date,
  tx?: Prisma.TransactionClient,
) => {
  const target = getSpaceTarget(space);
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

const spaceMatchesAvailabilityInput = (
  space: repo.PublicSpaceRecord,
  input: CheckAvailabilityInput,
) => {
  const capacity = space.room?.maxOccupancy ?? space.product.occupancy;

  if (input.guests > capacity) {
    return false;
  }

  if (input.occupancyType === "single") {
    return capacity === 1;
  }

  return capacity >= 2;
};

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
  const minOccupancy = input.occupancyType === "double" ? 2 : input.guests;
  const spaces = await repo.listActiveSpaces(
    now(),
    minOccupancy,
    tenant.id,
    undefined,
    {
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
    },
  );
  const availableSpaces = [];

  for (const space of spaces) {
    if (!spaceMatchesAvailabilityInput(space, input)) {
      continue;
    }

    const target = getSpaceTarget(space);
    const [hasBooking, hasMaintenance] = await Promise.all([
      repo.hasOverlappingBooking(target, input.checkIn, input.checkOut),
      repo.hasOverlappingMaintenance(
        space.propertyId,
        target,
        input.checkIn,
        input.checkOut,
      ),
    ]);

    if (!hasBooking && !hasMaintenance) {
      availableSpaces.push({
        spaceId: space.id,
        title: getSpaceTitle(space),
        location: getSpaceLocation(space),
        priceTotal: Number(space.price) * nights,
      });
    }
  }

  return {
    available: availableSpaces.length > 0,
    spaces: availableSpaces,
  };
};

export const createBooking = async (
  userId: string,
  input: CreatePublicBookingInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicBookingDTO> => {
  const tenant = await resolveTenant(tenantInput);
  const nights = getNights(input.from, input.to);

  for (let attempt = 1; attempt <= maxBookingTransactionAttempts; attempt += 1) {
    try {
      const booking = await repo.runSerializableTransaction(async (tx) => {
        const space = await repo.findActiveSpaceById(
          input.spaceId,
          now(),
          tenant.id,
          tx,
          {
            checkIn: input.from,
            checkOut: input.to,
            nights,
          },
        );

        if (!space) {
          throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
        }

        const target = await ensureSpaceAvailable(
          space,
          input.from,
          input.to,
          tx,
        );
        const pricePerNight = Number(space.price);
        const createdAt = now();
        const bookingRef = await generateBookingRef(createdAt, tx);
        const guestSnapshot = await repo.findUserSnapshotById(userId, tx);

        if (!guestSnapshot) {
          throw new HttpError(404, "USER_NOT_FOUND", "User not found");
        }

        const booking = await repo.createBooking(
          {
            bookingRef,
            property: { connect: { id: space.propertyId } },
            user: { connect: { id: userId } },
            productId: space.productId,
            targetType: target.targetType,
            unitId: target.unitId,
            roomId: target.roomId,
            guestNameSnapshot: guestSnapshot.fullName,
            guestEmailSnapshot: guestSnapshot.email,
            ...(guestSnapshot.contactNumber !== null && {
              guestContactSnapshot: guestSnapshot.contactNumber,
            }),
            targetLabel: target.roomId
              ? `${space.room?.name ?? "Room"} ${
                  space.room?.number ?? ""
                }`.trim()
              : `Unit ${space.unit?.unitNumber ?? ""}`.trim(),
            productName: space.product.name,
            pricePerNight,
            checkIn: input.from,
            checkOut: input.to,
            status: BookingStatus.PENDING,
            totalAmount: pricePerNight * nights,
            createdAt,
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
            toStatus: BookingStatus.PENDING,
            actor: {
              connect: {
                id: userId,
              },
            },
            note: "Booking created by guest",
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
    source: "PUBLIC_WEBSITE",
  });

  return mapEnquiry(enquiry);
};
