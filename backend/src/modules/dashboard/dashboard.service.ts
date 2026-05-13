import {
  BookingPaymentPolicy,
  BookingStatus,
  BookingTargetType,
  LeadStatus,
  MaintenanceTargetType,
  PricingTier,
  Prisma,
  PropertyAssignmentRole,
  RateType,
  UserRole,
} from "@/generated/prisma/client.js";
import { hashPassword } from "@/common/utils/password.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { PaginatedResult } from "@/common/types/pagination.js";
import { randomUUID } from "node:crypto";
import { createBookingForUser } from "@/modules/public/public.service.js";
import * as publicRepo from "@/modules/public/public.repository.js";
import * as repo from "./dashboard.repository.js";
import type {
  CreateDashboardAmenityInput,
  CreateDashboardAssignmentInput,
  CreateDashboardCouponInput,
  CreateDashboardManualBookingInput,
  CheckDashboardManualBookingAvailabilityInput,
  CreateDashboardTenantInput,
  CreateDashboardRoomPricingInput,
  CreateDashboardRoomProductInput,
  CreateDashboardPropertyInput,
  CreateDashboardRoomInput,
  CreateDashboardTaxInput,
  CreateDashboardUnitInput,
  CreateDashboardUserInput,
  CreateDashboardMaintenanceInput,
  DashboardAdminListInput,
  DashboardAmenityListInput,
  DashboardAssignmentListInput,
  DashboardBookingListInput,
  DashboardMaintenanceListInput,
  DashboardCouponListInput,
  DashboardLeadListInput,
  DashboardManagerListInput,
  DashboardRoomPricingListInput,
  DashboardRoomProductListInput,
  DashboardPropertyListInput,
  DashboardRoomListInput,
  DashboardTaxListInput,
  DashboardTenantListInput,
  DashboardUnitListInput,
  UpdateDashboardAmenityInput,
  UpdateDashboardCouponInput,
  UpdateDashboardMaintenanceInput,
  UpdateDashboardPropertyInput,
  UpdateDashboardRoomPricingInput,
  UpdateDashboardRoomProductInput,
  UpdateDashboardRoomInput,
  UpdateDashboardTaxInput,
  UpdateDashboardTenantInput,
  UpdateDashboardUnitInput,
  UpdateDashboardBookingInput,
  UpdateDashboardLeadInput,
  UpdateDashboardUserInput,
} from "./dashboard.inputs.js";

import type {
  DashboardAmenityDTO,
  DashboardBookingDTO,
  DashboardCouponDTO,
  DashboardEnquiryDTO,
  DashboardManualBookingAvailabilityDTO,
  DashboardMaintenanceBlockDTO,
  DashboardMeDTO,
  DashboardPropertyAssignmentDTO,
  DashboardPropertyDTO,
  DashboardRoomPricingDTO,
  DashboardRoomProductDTO,
  DashboardRoomDTO,
  DashboardSummaryDTO,
  DashboardTaxDTO,
  DashboardTenantDTO,
  DashboardUnitDTO,
  DashboardUserDTO,
  DashboardQuoteDTO,
} from "./dashboard.dto.js";
import type { PublicSpaceTarget } from "@/modules/public/public.inputs.js";

const allowedBookingTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.CHECKED_IN,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CHECKED_IN]: [BookingStatus.CHECKED_OUT],
  [BookingStatus.CHECKED_OUT]: [],
  [BookingStatus.CANCELLED]: [],
};

const assertBookingTransitionAllowed = (
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
) => {
  if (allowedBookingTransitions[fromStatus].includes(toStatus)) {
    return;
  }

  throw new HttpError(
    409,
    "INVALID_BOOKING_STATUS_TRANSITION",
    `Cannot move booking from ${fromStatus} to ${toStatus}`,
  );
};

type DashboardActor = NonNullable<Awaited<ReturnType<typeof repo.findUserById>>>;
type DashboardPropertyScope = {
  isGlobal: boolean;
  propertyIds: string[];
};

const DASHBOARD_MODULES: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: [
    "dashboard",
    "tenants",
    "properties",
    "admins",
    "propertyAssignments",
  ],
  [UserRole.ADMIN]: [
    "dashboard",
    "assignedProperties",
    "amenities",
    "units",
    "rooms",
    "pricing",
    "maintenance",
    "managers",
    "bookings",
    "enquiries",
    "quotes",
  ],
  [UserRole.MANAGER]: ["dashboard", "bookings", "enquiries", "quotes"],
  [UserRole.GUEST]: [],
};

const INVENTORY_ROLES = new Set<UserRole>([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
]);

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const mapUser = (user: DashboardActor): DashboardUserDTO => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  createdByUserId: user.createdByUserId ?? null,
  countryCode: user.countryCode ?? null,
  contactNumber: user.contactNumber ?? null,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const mapProperty = (property: repo.DashboardPropertyRecord): DashboardPropertyDTO => {
  const adminAssignment = property.assignments.find(
    (assignment) => assignment.role === PropertyAssignmentRole.ADMIN,
  );

  return {
    id: property.id,
    tenantId: property.tenantId,
    tenantName: property.tenant.name,
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    status: property.status,
    isActive: property.isActive,
    createdByUserId: property.createdByUserId,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    adminAssignment: adminAssignment
      ? {
          userId: adminAssignment.user.id,
          fullName: adminAssignment.user.fullName,
          email: adminAssignment.user.email,
        }
      : null,
  };
};

const mapTenant = (tenant: repo.DashboardTenantRecord): DashboardTenantDTO => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  primaryDomain: tenant.primaryDomain ?? null,
  status: tenant.status,
  brandName: tenant.brandName,
  logoUrl: tenant.logoUrl ?? null,
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? null,
  supportPhone: tenant.supportPhone ?? null,
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
  payAtCheckInEnabled: tenant.payAtCheckInEnabled,
  bookingTokenAmount: tenant.bookingTokenAmount.toString(),
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
});

const mapAssignment = (
  assignment: repo.DashboardPropertyAssignmentRecord,
): DashboardPropertyAssignmentDTO => ({
  id: assignment.id,
  propertyId: assignment.propertyId,
  propertyName: assignment.property.name,
  userId: assignment.userId,
  userName: assignment.user.fullName,
  userEmail: assignment.user.email,
  role: assignment.role,
  assignedByUserId: assignment.assignedByUserId,
  assignedByName: assignment.assignedBy.fullName,
  createdAt: assignment.createdAt,
});

const mapAmenity = (amenity: repo.DashboardAmenityRecord): DashboardAmenityDTO => ({
  id: amenity.id,
  propertyId: amenity.propertyId,
  propertyName: amenity.property.name,
  name: amenity.name,
  icon: amenity.icon ?? null,
  isActive: amenity.isActive,
  createdAt: amenity.createdAt,
});

const mapUnit = (unit: repo.DashboardUnitRecord): DashboardUnitDTO => ({
  id: unit.id,
  propertyId: unit.propertyId,
  propertyName: unit.property.name,
  unitNumber: unit.unitNumber,
  floor: unit.floor,
  status: unit.status,
  isActive: unit.isActive,
  amenityIds: unit.amenities.map((amenityLink) => amenityLink.amenityId),
  createdAt: unit.createdAt,
  updatedAt: unit.updatedAt,
});

const mapRoom = (room: repo.DashboardRoomRecord): DashboardRoomDTO => ({
  id: room.id,
  propertyId: room.unit.propertyId,
  propertyName: room.unit.property.name,
  unitId: room.unitId,
  unitNumber: room.unit.unitNumber,
  name: room.name,
  number: room.number,
  rent: room.rent,
  hasAC: room.hasAC,
  maxOccupancy: room.maxOccupancy,
  status: room.status,
  isActive: room.isActive,
  amenityIds: room.amenities.map((amenityLink) => amenityLink.amenityId),
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

const mapMaintenanceBlock = (
  block: repo.DashboardMaintenanceRecord,
): DashboardMaintenanceBlockDTO => ({
  id: block.id,
  propertyId: block.propertyId,
  propertyName: block.property.name,
  targetType: block.targetType,
  unitId: block.unitId ?? block.room?.unitId ?? null,
  unitNumber: block.unit?.unitNumber ?? block.room?.unit.unitNumber ?? null,
  roomId: block.roomId ?? null,
  roomLabel: block.room
    ? `${block.room.number} (${block.room.name})`
    : null,
  reason: block.reason ?? null,
  startDate: block.startDate,
  endDate: block.endDate,
  createdByUserId: block.createdByUserId,
  createdByName: block.createdBy.fullName,
  createdAt: block.createdAt,
  updatedAt: block.updatedAt,
});

const mapRoomProduct = (
  product: repo.DashboardRoomProductRecord,
): DashboardRoomProductDTO => ({
  id: product.id,
  propertyId: product.propertyId,
  propertyName: product.property.name,
  name: product.name,
  occupancy: product.occupancy,
  hasAC: product.hasAC,
  category: product.category,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const mapRoomPricing = (
  pricing: repo.DashboardRoomPricingRecord,
): DashboardRoomPricingDTO => ({
  id: pricing.id,
  propertyId: pricing.propertyId,
  propertyName: pricing.property.name,
  roomId: pricing.roomId ?? null,
  roomLabel: pricing.room
    ? `${pricing.room.number} (${pricing.room.name})`
    : null,
  unitId: pricing.unitId ?? pricing.room?.unitId ?? null,
  unitNumber: pricing.unit?.unitNumber ?? pricing.room?.unit.unitNumber ?? null,
  productId: pricing.productId,
  productName: pricing.product.name,
  rateType: pricing.rateType,
  pricingTier: pricing.pricingTier,
  minNights: pricing.minNights,
  maxNights: pricing.maxNights ?? null,
  taxInclusive: pricing.taxInclusive,
  price: pricing.price.toString(),
  validFrom: pricing.validFrom,
  validTo: pricing.validTo ?? null,
  createdAt: pricing.createdAt,
});

const mapTax = (tax: repo.DashboardTaxRecord): DashboardTaxDTO => ({
  id: tax.id,
  propertyId: tax.propertyId,
  propertyName: tax.property.name,
  name: tax.name,
  rate: tax.rate.toString(),
  taxType: tax.taxType,
  appliesTo: tax.appliesTo,
  isActive: tax.isActive,
  createdAt: tax.createdAt,
  updatedAt: tax.updatedAt,
});

const mapCoupon = (coupon: repo.DashboardCouponRecord): DashboardCouponDTO => ({
  id: coupon.id,
  propertyId: coupon.propertyId,
  propertyName: coupon.property.name,
  code: coupon.code,
  name: coupon.name,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue.toString(),
  maxUses: coupon.maxUses ?? null,
  usedCount: coupon.usedCount,
  minNights: coupon.minNights ?? null,
  minAmount: coupon.minAmount?.toString() ?? null,
  validFrom: coupon.validFrom,
  validTo: coupon.validTo ?? null,
  isActive: coupon.isActive,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
});

const mapBooking = (booking: repo.DashboardBookingRecord): DashboardBookingDTO => ({
  id: booking.id,
  bookingRef: booking.bookingRef,
  propertyId: booking.propertyId,
  propertyName: booking.property.name,
  userId: booking.userId,
  guestName: booking.user.fullName,
  guestEmail: booking.user.email,
  guestNameSnapshot: booking.guestNameSnapshot,
  guestEmailSnapshot: booking.guestEmailSnapshot,
  guestContactSnapshot: booking.guestContactSnapshot ?? null,
  bookingType: booking.bookingType,
  guestCount: booking.guestCount,
  productId: booking.productId ?? null,
  targetType: booking.targetType,
  unitId: booking.unitId ?? null,
  roomId: booking.roomId ?? null,
  targetLabel: booking.targetLabel,
  productName: booking.productName,
  pricePerNight: booking.pricePerNight.toString(),
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
  status: booking.status,
  totalAmount: booking.totalAmount.toString(),
  paymentPolicy: booking.paymentPolicy,
  upfrontAmount: booking.upfrontAmount.toString(),
  internalNotes: booking.internalNotes ?? null,
  items: booking.items.map((item) => ({
    id: item.id,
    targetType: item.targetType,
    unitId: item.unitId ?? null,
    roomId: item.roomId ?? null,
    productId: item.productId ?? null,
    targetLabel: item.targetLabel,
    productName: item.productName,
    capacity: item.capacity,
    pricePerNight: item.pricePerNight.toString(),
    totalAmount: item.totalAmount.toString(),
  })),
  statusHistory: booking.statusHistory.map((event) => ({
    id: event.id,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus,
    actorUserId: event.actorUserId ?? null,
    actorName: event.actor?.fullName ?? null,
    note: event.note ?? null,
    createdAt: event.createdAt,
  })),
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
});

const mapEnquiry = (
  enquiry: repo.DashboardEnquiryRecord,
): DashboardEnquiryDTO => ({
  id: enquiry.id,
  propertyId: enquiry.propertyId,
  propertyName: enquiry.property.name,
  name: enquiry.name,
  email: enquiry.email,
  contactNumber: enquiry.contactNumber,
  message: enquiry.message,
  source: enquiry.source ?? null,
  status: enquiry.status,
  createdAt: enquiry.createdAt,
  updatedAt: enquiry.updatedAt,
});

const mapQuote = (quote: repo.DashboardQuoteRecord): DashboardQuoteDTO => ({
  id: quote.id,
  propertyId: quote.propertyId,
  propertyName: quote.property.name,
  userId: quote.userId ?? null,
  guestName: quote.user?.fullName ?? null,
  guestEmail: quote.user?.email ?? null,
  productId: quote.productId ?? null,
  productName: quote.product?.name ?? null,
  targetType: quote.targetType,
  unitId: quote.unitId ?? null,
  roomId: quote.roomId ?? null,
  checkIn: quote.checkIn,
  checkOut: quote.checkOut,
  status: quote.status,
  notes: quote.notes ?? null,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});

const assertRole = (actor: DashboardActor, roles: readonly UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

const ensureActiveActor = (actor: DashboardActor) => {
  if (!actor.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }
};

const getActor = async (userId: string): Promise<DashboardActor> => {
  const actor = await repo.findUserById(userId);
  if (!actor) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  ensureActiveActor(actor);
  return actor;
};

const getPropertyScope = async (
  actor: DashboardActor,
): Promise<DashboardPropertyScope> => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return {
      isGlobal: true,
      propertyIds: [],
    };
  }

  if (actor.role === UserRole.ADMIN) {
    return {
      isGlobal: false,
      propertyIds: await repo.listAssignedPropertyIds(
        actor.id,
        PropertyAssignmentRole.ADMIN,
      ),
    };
  }

  if (actor.role === UserRole.MANAGER) {
    return {
      isGlobal: false,
      propertyIds: await repo.listAssignedPropertyIds(
        actor.id,
        PropertyAssignmentRole.MANAGER,
      ),
    };
  }

  return {
    isGlobal: false,
    propertyIds: [],
  };
};

const assertPropertyInScope = async (
  actor: DashboardActor,
  propertyId: string,
): Promise<void> => {
  const scope = await getPropertyScope(actor);
  if (scope.isGlobal) {
    return;
  }

  if (!scope.propertyIds.includes(propertyId)) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
};

const assertCanManageInventory = async (
  actor: DashboardActor,
  propertyId: string,
) => {
  if (!INVENTORY_ROLES.has(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  await assertPropertyInScope(actor, propertyId);
};

const ensureManagerBelongsToAdmin = (
  actor: DashboardActor,
  manager: DashboardActor,
) => {
  if (
    actor.role === UserRole.ADMIN &&
    manager.createdByUserId !== actor.id
  ) {
    throw new HttpError(404, "MANAGER_NOT_FOUND", "Manager not found");
  }
};

const ensurePropertyExists = async (propertyId: string) => {
  const property = await repo.findPropertyById(propertyId);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  return property;
};

const ensureTenantExists = async (tenantId: string) => {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) {
    throw new HttpError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }

  return tenant;
};

const buildTenantSlug = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "tenant";
};

const withSlugSuffix = (baseSlug: string, suffix: number) => {
  if (suffix === 0) {
    return baseSlug;
  }

  const suffixText = `-${suffix}`;
  const maxBaseLength = 80 - suffixText.length;
  const base = baseSlug.slice(0, maxBaseLength).replace(/-+$/g, "");
  return `${base}${suffixText}`;
};

const generateUniqueTenantSlug = async (name: string) => {
  const baseSlug = buildTenantSlug(name);

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = withSlugSuffix(baseSlug, suffix);
    const existingTenant = await repo.findTenantBySlug(candidate);

    if (!existingTenant) {
      return candidate;
    }
  }

  throw new HttpError(
    409,
    "TENANT_SLUG_EXHAUSTED",
    "Could not generate a unique tenant slug",
  );
};

const ensureAmenityExists = async (amenityId: string) => {
  const amenity = await repo.findAmenityById(amenityId);
  if (!amenity) {
    throw new HttpError(404, "AMENITY_NOT_FOUND", "Amenity not found");
  }

  return amenity;
};

const ensureUnitExists = async (unitId: string) => {
  const unit = await repo.findUnitById(unitId);
  if (!unit) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  return unit;
};

const ensureRoomExists = async (roomId: string) => {
  const room = await repo.findRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }

  return room;
};

const ensureMaintenanceBlockExists = async (maintenanceBlockId: string) => {
  const block = await repo.findMaintenanceBlockById(maintenanceBlockId);
  if (!block) {
    throw new HttpError(
      404,
      "MAINTENANCE_BLOCK_NOT_FOUND",
      "Maintenance block not found",
    );
  }

  return block;
};

const ensureRoomProductExists = async (productId: string) => {
  const product = await repo.findRoomProductById(productId);
  if (!product) {
    throw new HttpError(
      404,
      "ROOM_PRODUCT_NOT_FOUND",
      "Room product not found",
    );
  }

  return product;
};

const ensureRoomPricingExists = async (pricingId: string) => {
  const pricing = await repo.findRoomPricingById(pricingId);
  if (!pricing) {
    throw new HttpError(
      404,
      "ROOM_PRICING_NOT_FOUND",
      "Room pricing not found",
    );
  }

  return pricing;
};

const ensureTaxExists = async (taxId: string) => {
  const tax = await repo.findTaxById(taxId);
  if (!tax) {
    throw new HttpError(404, "TAX_NOT_FOUND", "Tax not found");
  }

  return tax;
};

const ensureCouponExists = async (couponId: string) => {
  const coupon = await repo.findCouponById(couponId);
  if (!coupon) {
    throw new HttpError(404, "COUPON_NOT_FOUND", "Coupon not found");
  }

  return coupon;
};

const ensureBookingExists = async (bookingId: string) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return booking;
};

const ensureEnquiryExists = async (enquiryId: string) => {
  const enquiry = await repo.findEnquiryById(enquiryId);
  if (!enquiry) {
    throw new HttpError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found");
  }

  return enquiry;
};

const ensureQuoteExists = async (quoteId: string) => {
  const quote = await repo.findQuoteById(quoteId);
  if (!quote) {
    throw new HttpError(404, "QUOTE_NOT_FOUND", "Quote not found");
  }

  return quote;
};

const ensureUniqueUserEmail = async (email: string) => {
  const existingUser = await repo.findUserByEmail(email);
  if (existingUser) {
    throw new HttpError(409, "EMAIL_EXISTS", "Email already registered");
  }
};

const findOrCreateWalkInGuest = async (
  actor: DashboardActor,
  input: Pick<
    CreateDashboardManualBookingInput,
    "guestName" | "guestEmail" | "countryCode" | "contactNumber"
  >,
) => {
  const email = input.guestEmail.trim().toLowerCase();
  const existingUser = await repo.findUserByEmail(email);

  if (existingUser) {
    if (existingUser.role !== UserRole.GUEST) {
      throw new HttpError(
        409,
        "GUEST_EMAIL_UNAVAILABLE",
        "This email belongs to a dashboard user",
      );
    }

    return repo.updateUserById(existingUser.id, {
      fullName: input.guestName,
      ...(input.countryCode !== undefined &&
        input.contactNumber !== undefined && {
          countryCode: input.countryCode,
          contactNumber: input.contactNumber,
        }),
    });
  }

  const passwordHash = await hashPassword(randomUUID());
  return repo.createUser({
    fullName: input.guestName,
    email,
    passwordHash,
    role: UserRole.GUEST,
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });
};

const getStayNights = (from: Date, to: Date) =>
  Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );

const getManualBookingSpaceTarget = (
  space: publicRepo.PublicSpaceRecord,
): PublicSpaceTarget => {
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

const getManualBookingSpaceCapacity = (space: publicRepo.PublicSpaceRecord) =>
  space.room?.maxOccupancy ?? space.product.occupancy;

const ensureAmenityIdsBelongToProperty = async (
  propertyId: string,
  amenityIds: string[],
) => {
  if (amenityIds.length === 0) {
    return;
  }

  const count = await repo.countActiveAmenitiesByPropertyAndIds(
    propertyId,
    amenityIds,
  );

  if (count !== amenityIds.length) {
    throw new HttpError(
      400,
      "INVALID_AMENITIES",
      "Some amenities are invalid, inactive, or belong to another property",
    );
  }
};

const ensureUnitBelongsToProperty = (
  unit: repo.DashboardUnitRecord,
  propertyId: string,
) => {
  if (unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_UNIT",
      "Unit does not belong to the selected property",
    );
  }
};

const ensureRoomBelongsToProperty = (
  room: repo.DashboardRoomRecord,
  propertyId: string,
) => {
  if (room.unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_ROOM",
      "Room does not belong to the selected property",
    );
  }
};

const assertValidDateRange = (startDate: Date, endDate: Date) => {
  if (endDate.getTime() < startDate.getTime()) {
    throw new HttpError(
      400,
      "INVALID_DATE_RANGE",
      "End date must be on or after start date",
    );
  }
};

const assertValidOptionalDateRange = (
  validFrom?: Date,
  validTo?: Date,
) => {
  if (
    validFrom !== undefined &&
    validTo !== undefined &&
    validTo.getTime() < validFrom.getTime()
  ) {
    throw new HttpError(
      400,
      "INVALID_DATE_RANGE",
      "End date must be on or after start date",
    );
  }
};

const assertValidNightRange = (minNights?: number, maxNights?: number) => {
  if (
    minNights !== undefined &&
    maxNights !== undefined &&
    maxNights < minNights
  ) {
    throw new HttpError(
      400,
      "INVALID_NIGHT_RANGE",
      "Max nights must be greater than or equal to min nights",
    );
  }
};

const ensureRoomProductBelongsToProperty = (
  product: repo.DashboardRoomProductRecord,
  propertyId: string,
) => {
  if (product.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_PRODUCT",
      "Room product does not belong to the selected property",
    );
  }
};

const resolvePricingTarget = async (
  propertyId: string,
  input: {
    unitId?: string | undefined;
    roomId?: string | undefined;
  },
) => {
  if (input.unitId && input.roomId) {
    throw new HttpError(
      400,
      "INVALID_PRICING_TARGET",
      "Use either unitId or roomId, not both",
    );
  }

  if (input.unitId) {
    const unit = await ensureUnitExists(input.unitId);
    ensureUnitBelongsToProperty(unit, propertyId);

    return {
      unitId: unit.id,
      roomId: undefined,
    };
  }

  if (input.roomId) {
    const room = await ensureRoomExists(input.roomId);
    ensureRoomBelongsToProperty(room, propertyId);

    return {
      unitId: undefined,
      roomId: room.id,
    };
  }

  return {
    unitId: undefined,
    roomId: undefined,
  };
};

const resolveMaintenanceTarget = async (
  propertyId: string,
  input: {
    targetType: MaintenanceTargetType;
    unitId?: string | undefined;
    roomId?: string | undefined;
  },
) => {
  if (input.targetType === MaintenanceTargetType.PROPERTY) {
    return {
      unitId: undefined,
      roomId: undefined,
    };
  }

  if (input.targetType === MaintenanceTargetType.UNIT) {
    if (!input.unitId) {
      throw new HttpError(
        400,
        "UNIT_REQUIRED",
        "Unit is required for unit maintenance blocks",
      );
    }

    const unit = await ensureUnitExists(input.unitId);
    ensureUnitBelongsToProperty(unit, propertyId);

    return {
      unitId: unit.id,
      roomId: undefined,
    };
  }

  if (!input.roomId) {
    throw new HttpError(
      400,
      "ROOM_REQUIRED",
      "Room is required for room maintenance blocks",
    );
  }

  const room = await ensureRoomExists(input.roomId);
  ensureRoomBelongsToProperty(room, propertyId);

  return {
    unitId: room.unitId,
    roomId: room.id,
  };
};

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
): PaginatedResult<T> => ({
  items,
  pagination: buildPagination(page, limit, total),
});

const countOperationalSummary = async (propertyIds?: string[]) => {
  const [
    totalRooms,
    totalMaintenanceBlocks,
    totalRoomProducts,
    totalRoomPricing,
    totalTaxes,
    totalCoupons,
    totalBookings,
    pendingBookings,
    totalEnquiries,
    openEnquiries,
    totalQuotes,
    openQuotes,
  ] = await Promise.all([
    repo.countRooms(propertyIds),
    repo.countMaintenanceBlocks(propertyIds),
    repo.countRoomProducts(propertyIds),
    repo.countRoomPricing(propertyIds),
    repo.countTaxes(propertyIds),
    repo.countCoupons(propertyIds),
    repo.countBookings(propertyIds),
    repo.countBookings(propertyIds, [BookingStatus.PENDING]),
    repo.countEnquiries(propertyIds),
    repo.countEnquiries(propertyIds, [
      LeadStatus.NEW,
      LeadStatus.IN_PROGRESS,
    ]),
    repo.countQuotes(propertyIds),
    repo.countQuotes(propertyIds, [LeadStatus.NEW, LeadStatus.IN_PROGRESS]),
  ]);

  return {
    totalRooms,
    totalMaintenanceBlocks,
    totalRoomProducts,
    totalRoomPricing,
    totalTaxes,
    totalCoupons,
    totalBookings,
    pendingBookings,
    totalEnquiries,
    openEnquiries,
    totalQuotes,
    openQuotes,
  };
};

export const getDashboardContext = async (
  userId: string,
): Promise<DashboardMeDTO> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  const properties = await repo.listPropertySummaries(
    scope.isGlobal ? undefined : scope.propertyIds,
  );

  return {
    user: mapUser(actor),
    properties: properties.map((property) => ({
      id: property.id,
      name: property.name,
      city: property.city,
      state: property.state,
      tenantId: property.tenantId,
      tenantName: property.tenant.name,
    })),
    modules: DASHBOARD_MODULES[actor.role],
  };
};

export const listTenants = async (
  userId: string,
  filters: DashboardTenantListInput,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const { items, total } = await repo.listTenantsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapTenant),
  );
};

export const listActiveTenants = async (
  userId: string,
): Promise<DashboardTenantDTO[]> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const tenants = await repo.listActiveTenantOptions();
  return tenants.map(mapTenant);
};

export const getTenantById = async (
  userId: string,
  tenantId: string,
): Promise<DashboardTenantDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const tenant = await ensureTenantExists(tenantId);
  return mapTenant(tenant);
};

export const createTenant = async (
  userId: string,
  input: CreateDashboardTenantInput,
): Promise<DashboardTenantDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  try {
    const slug = input.slug ?? (await generateUniqueTenantSlug(input.name));
    const tenant = await repo.createTenant({
      name: input.name,
      slug,
      ...(input.primaryDomain !== undefined && {
        primaryDomain: input.primaryDomain,
      }),
      ...(input.status !== undefined && { status: input.status }),
      brandName: input.brandName,
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.primaryColor !== undefined && {
        primaryColor: input.primaryColor,
      }),
      ...(input.secondaryColor !== undefined && {
        secondaryColor: input.secondaryColor,
      }),
      ...(input.supportEmail !== undefined && {
        supportEmail: input.supportEmail,
      }),
      ...(input.supportPhone !== undefined && {
        supportPhone: input.supportPhone,
      }),
      ...(input.defaultCurrency !== undefined && {
        defaultCurrency: input.defaultCurrency,
      }),
      ...(input.payAtCheckInEnabled !== undefined && {
        payAtCheckInEnabled: input.payAtCheckInEnabled,
      }),
      ...(input.bookingTokenAmount !== undefined && {
        bookingTokenAmount: input.bookingTokenAmount,
      }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
    });

    return mapTenant(tenant);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "TENANT_EXISTS",
        "Tenant slug or domain already exists",
      );
    }

    throw error;
  }
};

export const updateTenant = async (
  userId: string,
  tenantId: string,
  input: UpdateDashboardTenantInput,
): Promise<DashboardTenantDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);
  await ensureTenantExists(tenantId);

  try {
    const tenant = await repo.updateTenantById(tenantId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.primaryDomain !== undefined && {
        primaryDomain: input.primaryDomain,
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.brandName !== undefined && { brandName: input.brandName }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.primaryColor !== undefined && {
        primaryColor: input.primaryColor,
      }),
      ...(input.secondaryColor !== undefined && {
        secondaryColor: input.secondaryColor,
      }),
      ...(input.supportEmail !== undefined && {
        supportEmail: input.supportEmail,
      }),
      ...(input.supportPhone !== undefined && {
        supportPhone: input.supportPhone,
      }),
      ...(input.defaultCurrency !== undefined && {
        defaultCurrency: input.defaultCurrency,
      }),
      ...(input.payAtCheckInEnabled !== undefined && {
        payAtCheckInEnabled: input.payAtCheckInEnabled,
      }),
      ...(input.bookingTokenAmount !== undefined && {
        bookingTokenAmount: input.bookingTokenAmount,
      }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
    });

    return mapTenant(tenant);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "TENANT_EXISTS",
        "Tenant slug or domain already exists",
      );
    }

    throw error;
  }
};

export const getDashboardSummary = async (
  userId: string,
): Promise<DashboardSummaryDTO> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  const scopedPropertyIds = scope.isGlobal ? undefined : scope.propertyIds;

  if (actor.role === UserRole.SUPER_ADMIN) {
    const [
      totalProperties,
      totalAdmins,
      totalManagers,
      totalAmenities,
      totalUnits,
      totalAssignments,
      operationalSummary,
    ] = await Promise.all([
      repo.listPropertySummaries().then((properties) => properties.length),
      repo.countUsersByRole(UserRole.ADMIN),
      repo.countUsersByRole(UserRole.MANAGER),
      repo.countAmenities(),
      repo.countUnits(),
      repo.countAssignments(),
      countOperationalSummary(),
    ]);

    return {
      totalProperties,
      totalAdmins,
      totalManagers,
      totalAmenities,
      totalUnits,
      ...operationalSummary,
      totalAssignments,
    };
  }

  if (actor.role === UserRole.ADMIN) {
    const [
      totalAmenities,
      totalUnits,
      totalManagers,
      totalAssignments,
      operationalSummary,
    ] = await Promise.all([
      repo.countAmenities(scopedPropertyIds),
      repo.countUnits(scopedPropertyIds),
      repo.countUsersByRole(UserRole.MANAGER, actor.id),
      repo.countAssignments(scopedPropertyIds, PropertyAssignmentRole.MANAGER),
      countOperationalSummary(scopedPropertyIds),
    ]);

    return {
      totalProperties: scope.propertyIds.length,
      totalAdmins: 1,
      totalManagers,
      totalAmenities,
      totalUnits,
      ...operationalSummary,
      totalAssignments,
    };
  }

  const operationalSummary = await countOperationalSummary(scopedPropertyIds);

  return {
    totalProperties: scope.propertyIds.length,
    totalAdmins: 0,
    totalManagers: 0,
    totalAmenities: 0,
    totalUnits: 0,
    totalRooms: 0,
    totalMaintenanceBlocks: 0,
    totalRoomProducts: 0,
    totalRoomPricing: 0,
    totalTaxes: 0,
    totalCoupons: 0,
    totalBookings: operationalSummary.totalBookings,
    pendingBookings: operationalSummary.pendingBookings,
    totalEnquiries: operationalSummary.totalEnquiries,
    openEnquiries: operationalSummary.openEnquiries,
    totalQuotes: operationalSummary.totalQuotes,
    openQuotes: operationalSummary.openQuotes,
    totalAssignments: scope.propertyIds.length,
  };
};

export const listProperties = async (
  userId: string,
  filters: DashboardPropertyListInput,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);

  const scope = await getPropertyScope(actor);
  const propertyIds = scope.isGlobal ? undefined : scope.propertyIds;

  if (propertyIds !== undefined && propertyIds.length === 0) {
    return normalizePaginationResult(filters.page, filters.limit, 0, []);
  }

  const { items, total } = await repo.listPropertiesPaginated({
    ...filters,
    ...(filters.tenantId !== undefined && { tenantId: filters.tenantId }),
    ...(propertyIds !== undefined && { propertyIds }),
  });

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapProperty),
  );
};

export const getPropertyById = async (
  userId: string,
  propertyId: string,
): Promise<DashboardPropertyDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);
  await assertPropertyInScope(actor, propertyId);

  const property = await ensurePropertyExists(propertyId);
  return mapProperty(property);
};

export const createProperty = async (
  userId: string,
  input: CreateDashboardPropertyInput,
): Promise<DashboardPropertyDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);
  await ensureTenantExists(input.tenantId);

  try {
    const property = await repo.createProperty({
      tenant: {
        connect: {
          id: input.tenantId,
        },
      },
      name: input.name,
      address: input.address,
      city: input.city,
      state: input.state,
      createdBy: {
        connect: {
          id: actor.id,
        },
      },
      ...(input.status !== undefined && { status: input.status }),
    });

    return mapProperty(property);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "PROPERTY_EXISTS", "Property already exists");
    }

    throw error;
  }
};

export const updateProperty = async (
  userId: string,
  propertyId: string,
  input: UpdateDashboardPropertyInput,
): Promise<DashboardPropertyDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);
  await ensurePropertyExists(propertyId);
  if (input.tenantId !== undefined) {
    await ensureTenantExists(input.tenantId);
  }

  try {
    const property = await repo.updatePropertyById(propertyId, {
      ...(input.tenantId !== undefined && {
        tenant: {
          connect: {
            id: input.tenantId,
          },
        },
      }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });

    return mapProperty(property);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "PROPERTY_EXISTS", "Property already exists");
    }

    throw error;
  }
};

const listUsersByRole = async (
  filters: DashboardAdminListInput | DashboardManagerListInput,
  options: {
    roles: UserRole[];
    createdByUserId?: string;
  },
) => {
  const { items, total } = await repo.listUsersPaginated({
    ...filters,
    roles: options.roles,
    ...(options.createdByUserId !== undefined && {
      createdByUserId: options.createdByUserId,
    }),
  });

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapUser),
  );
};

export const listAdmins = async (
  userId: string,
  filters: DashboardAdminListInput,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  return listUsersByRole(filters, {
    roles: [UserRole.ADMIN],
  });
};

export const createAdmin = async (
  userId: string,
  input: CreateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);
  await ensureUniqueUserEmail(input.email);

  const passwordHash = await hashPassword(input.password);
  const admin = await repo.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    role: UserRole.ADMIN,
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapUser(admin);
};

export const updateAdmin = async (
  userId: string,
  adminId: string,
  input: UpdateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const admin = await repo.findUserById(adminId);
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new HttpError(404, "ADMIN_NOT_FOUND", "Admin not found");
  }

  const updatedAdmin = await repo.updateUserById(adminId, {
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapUser(updatedAdmin);
};

export const listManagers = async (
  userId: string,
  filters: DashboardManagerListInput,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  return listUsersByRole(filters, {
    roles: [UserRole.MANAGER],
    ...(actor.role === UserRole.ADMIN && {
      createdByUserId: actor.id,
    }),
  });
};

export const createManager = async (
  userId: string,
  input: CreateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.ADMIN]);
  await ensureUniqueUserEmail(input.email);

  const passwordHash = await hashPassword(input.password);
  const manager = await repo.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    role: UserRole.MANAGER,
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapUser(manager);
};

export const updateManager = async (
  userId: string,
  managerId: string,
  input: UpdateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const manager = await repo.findUserById(managerId);
  if (!manager || manager.role !== UserRole.MANAGER) {
    throw new HttpError(404, "MANAGER_NOT_FOUND", "Manager not found");
  }

  ensureManagerBelongsToAdmin(actor, manager);

  const updatedManager = await repo.updateUserById(managerId, {
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapUser(updatedManager);
};

export const listPropertyAssignments = async (
  userId: string,
  filters: DashboardAssignmentListInput,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  if (actor.role === UserRole.ADMIN && filters.role === PropertyAssignmentRole.ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Admins cannot view admin assignments");
  }

  const scope = await getPropertyScope(actor);
  const propertyIds = scope.isGlobal ? undefined : scope.propertyIds;

  if (propertyIds !== undefined && propertyIds.length === 0) {
    return normalizePaginationResult(filters.page, filters.limit, 0, []);
  }

  const { items, total } = await repo.listPropertyAssignmentsPaginated({
    ...filters,
    ...(actor.role === UserRole.ADMIN && {
      role: PropertyAssignmentRole.MANAGER,
    }),
    ...(propertyIds !== undefined && { propertyIds }),
  });

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items
      .filter((assignment) =>
        actor.role === UserRole.ADMIN
          ? assignment.user.createdByUserId === actor.id
          : true,
      )
      .map(mapAssignment),
  );
};

export const createPropertyAssignment = async (
  userId: string,
  input: CreateDashboardAssignmentInput,
): Promise<DashboardPropertyAssignmentDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const property = await ensurePropertyExists(input.propertyId);
  const targetUser = await repo.findUserById(input.userId);

  if (!targetUser || !targetUser.isActive) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const existingAssignment = await repo.findPropertyAssignmentByPropertyAndUser(
    input.propertyId,
    input.userId,
  );

  if (existingAssignment) {
    throw new HttpError(
      409,
      "ASSIGNMENT_EXISTS",
      "This user is already assigned to the property",
    );
  }

  if (input.role === PropertyAssignmentRole.ADMIN) {
    assertRole(actor, [UserRole.SUPER_ADMIN]);

    if (targetUser.role !== UserRole.ADMIN) {
      throw new HttpError(
        400,
        "INVALID_ASSIGNMENT",
        "Only admin users can receive admin property assignments",
      );
    }

    const existingAdminAssignment =
      await repo.findPropertyAssignmentByPropertyAndRole(
        property.id,
        PropertyAssignmentRole.ADMIN,
      );

    if (existingAdminAssignment) {
      throw new HttpError(
        409,
        "PROPERTY_ADMIN_EXISTS",
        "Property already has an assigned admin",
      );
    }
  }

  if (input.role === PropertyAssignmentRole.MANAGER) {
    if (targetUser.role !== UserRole.MANAGER) {
      throw new HttpError(
        400,
        "INVALID_ASSIGNMENT",
        "Only manager users can receive manager property assignments",
      );
    }

    const adminAssignment = await repo.findPropertyAssignmentByPropertyAndRole(
      property.id,
      PropertyAssignmentRole.ADMIN,
    );

    if (!adminAssignment) {
      throw new HttpError(
        400,
        "PROPERTY_ADMIN_REQUIRED",
        "Assign an admin to the property before assigning managers",
      );
    }

    if (actor.role === UserRole.ADMIN) {
      if (adminAssignment.userId !== actor.id) {
        throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
      }

      if (targetUser.createdByUserId !== actor.id) {
        throw new HttpError(
          400,
          "INVALID_ASSIGNMENT",
          "Admins can only assign managers they created",
        );
      }
    }

    if (actor.role === UserRole.SUPER_ADMIN) {
      if (targetUser.createdByUserId !== adminAssignment.userId) {
        throw new HttpError(
          400,
          "INVALID_ASSIGNMENT",
          "Manager must belong to the admin assigned to the property",
        );
      }
    }
  }

  const assignment = await repo.createPropertyAssignment({
    role: input.role,
    property: {
      connect: {
        id: input.propertyId,
      },
    },
    user: {
      connect: {
        id: input.userId,
      },
    },
    assignedBy: {
      connect: {
        id: actor.id,
      },
    },
  });

  return mapAssignment(assignment);
};

export const deletePropertyAssignment = async (
  userId: string,
  assignmentId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const assignment = await repo.findPropertyAssignmentById(assignmentId);
  if (!assignment) {
    throw new HttpError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  if (actor.role === UserRole.ADMIN) {
    if (assignment.role !== PropertyAssignmentRole.MANAGER) {
      throw new HttpError(403, "FORBIDDEN", "Access denied");
    }

    await assertPropertyInScope(actor, assignment.propertyId);

    if (assignment.user.createdByUserId !== actor.id) {
      throw new HttpError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }
  }

  await repo.deletePropertyAssignmentById(assignmentId);
};

export const listAmenities = async (
  userId: string,
  filters: DashboardAmenityListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listAmenitiesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapAmenity),
  );
};

export const getAmenityById = async (
  userId: string,
  amenityId: string,
): Promise<DashboardAmenityDTO> => {
  const actor = await getActor(userId);
  const amenity = await ensureAmenityExists(amenityId);
  await assertCanManageInventory(actor, amenity.propertyId);
  return mapAmenity(amenity);
};

export const createAmenity = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardAmenityInput,
): Promise<DashboardAmenityDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);

  try {
    const amenity = await repo.createAmenity({
      property: {
        connect: {
          id: propertyId,
        },
      },
      name: input.name,
      ...(input.icon !== undefined && { icon: input.icon }),
    });

    return mapAmenity(amenity);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "AMENITY_EXISTS", "Amenity already exists");
    }

    throw error;
  }
};

export const updateAmenity = async (
  userId: string,
  amenityId: string,
  input: UpdateDashboardAmenityInput,
): Promise<DashboardAmenityDTO> => {
  const actor = await getActor(userId);
  const amenity = await ensureAmenityExists(amenityId);
  await assertCanManageInventory(actor, amenity.propertyId);

  try {
    const updatedAmenity = await repo.updateAmenityById(amenityId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });

    return mapAmenity(updatedAmenity);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "AMENITY_EXISTS", "Amenity already exists");
    }

    throw error;
  }
};

export const listUnits = async (
  userId: string,
  filters: DashboardUnitListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listUnitsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapUnit),
  );
};

export const getUnitById = async (
  userId: string,
  unitId: string,
): Promise<DashboardUnitDTO> => {
  const actor = await getActor(userId);
  const unit = await ensureUnitExists(unitId);
  await assertCanManageInventory(actor, unit.propertyId);
  return mapUnit(unit);
};

export const createUnit = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardUnitInput,
): Promise<DashboardUnitDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const existingUnit = await repo.findUnitByPropertyAndNumber(
    propertyId,
    input.unitNumber,
  );
  if (existingUnit) {
    throw new HttpError(
      409,
      "UNIT_EXISTS",
      "Unit number already exists for this property",
    );
  }

  await ensureAmenityIdsBelongToProperty(propertyId, input.amenityIds ?? []);

  const unit = await repo.createUnit({
    property: {
      connect: {
        id: propertyId,
      },
    },
    unitNumber: input.unitNumber,
    floor: input.floor,
    ...(input.status !== undefined && { status: input.status }),
  });

  if ((input.amenityIds ?? []).length === 0) {
    return mapUnit(unit);
  }

  const updatedUnit = await repo.replaceUnitAmenities(unit.id, input.amenityIds ?? []);
  if (!updatedUnit) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  return mapUnit(updatedUnit);
};

export const updateUnit = async (
  userId: string,
  unitId: string,
  input: UpdateDashboardUnitInput,
): Promise<DashboardUnitDTO> => {
  const actor = await getActor(userId);
  const existingUnit = await ensureUnitExists(unitId);
  await assertCanManageInventory(actor, existingUnit.propertyId);

  if (
    input.unitNumber !== undefined &&
    input.unitNumber !== existingUnit.unitNumber
  ) {
    const duplicateUnit = await repo.findUnitByPropertyAndNumber(
      existingUnit.propertyId,
      input.unitNumber,
    );

    if (duplicateUnit) {
      throw new HttpError(
        409,
        "UNIT_EXISTS",
        "Unit number already exists for this property",
      );
    }
  }

  if (input.amenityIds !== undefined) {
    await ensureAmenityIdsBelongToProperty(
      existingUnit.propertyId,
      input.amenityIds,
    );
  }

  const unit = await repo.updateUnitById(unitId, {
    ...(input.unitNumber !== undefined && { unitNumber: input.unitNumber }),
    ...(input.floor !== undefined && { floor: input.floor }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  if (input.amenityIds === undefined) {
    return mapUnit(unit);
  }

  const updatedUnit = await repo.replaceUnitAmenities(unitId, input.amenityIds);
  if (!updatedUnit) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  return mapUnit(updatedUnit);
};

export const deleteUnit = async (
  userId: string,
  unitId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const unit = await ensureUnitExists(unitId);
  await assertCanManageInventory(actor, unit.propertyId);
  await repo.softDeleteUnitById(unitId);
};

export const listRooms = async (
  userId: string,
  filters: DashboardRoomListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listRoomsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapRoom),
  );
};

export const getRoomById = async (
  userId: string,
  roomId: string,
): Promise<DashboardRoomDTO> => {
  const actor = await getActor(userId);
  const room = await ensureRoomExists(roomId);
  await assertCanManageInventory(actor, room.unit.propertyId);
  return mapRoom(room);
};

export const createRoom = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardRoomInput,
): Promise<DashboardRoomDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const unit = await ensureUnitExists(input.unitId);
  ensureUnitBelongsToProperty(unit, propertyId);

  const existingRoom = await repo.findRoomByUnitAndNumber(input.unitId, input.number);
  if (existingRoom) {
    throw new HttpError(
      409,
      "ROOM_EXISTS",
      "Room number already exists for this unit",
    );
  }

  await ensureAmenityIdsBelongToProperty(propertyId, input.amenityIds ?? []);

  const room = await repo.createRoom({
    unit: {
      connect: {
        id: input.unitId,
      },
    },
    name: input.name,
    number: input.number,
    rent: input.rent,
    hasAC: input.hasAC ?? false,
    maxOccupancy: input.maxOccupancy ?? 1,
    ...(input.status !== undefined && { status: input.status }),
  });

  if ((input.amenityIds ?? []).length === 0) {
    return mapRoom(room);
  }

  const updatedRoom = await repo.replaceRoomAmenities(room.id, input.amenityIds ?? []);
  if (!updatedRoom) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }

  return mapRoom(updatedRoom);
};

export const updateRoom = async (
  userId: string,
  roomId: string,
  input: UpdateDashboardRoomInput,
): Promise<DashboardRoomDTO> => {
  const actor = await getActor(userId);
  const existingRoom = await ensureRoomExists(roomId);
  const propertyId = existingRoom.unit.propertyId;
  await assertCanManageInventory(actor, propertyId);

  let nextUnitId = input.unitId ?? existingRoom.unitId;
  if (input.unitId !== undefined) {
    const nextUnit = await ensureUnitExists(input.unitId);
    ensureUnitBelongsToProperty(nextUnit, propertyId);
    nextUnitId = nextUnit.id;
  }

  const nextNumber = input.number ?? existingRoom.number;
  if (
    nextUnitId !== existingRoom.unitId ||
    nextNumber !== existingRoom.number
  ) {
    const duplicateRoom = await repo.findRoomByUnitAndNumber(nextUnitId, nextNumber);

    if (duplicateRoom && duplicateRoom.id !== roomId) {
      throw new HttpError(
        409,
        "ROOM_EXISTS",
        "Room number already exists for this unit",
      );
    }
  }

  if (input.amenityIds !== undefined) {
    await ensureAmenityIdsBelongToProperty(propertyId, input.amenityIds);
  }

  const room = await repo.updateRoomById(roomId, {
    ...(input.unitId !== undefined && {
      unit: {
        connect: {
          id: input.unitId,
        },
      },
    }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.number !== undefined && { number: input.number }),
    ...(input.rent !== undefined && { rent: input.rent }),
    ...(input.hasAC !== undefined && { hasAC: input.hasAC }),
    ...(input.maxOccupancy !== undefined && {
      maxOccupancy: input.maxOccupancy,
    }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  if (input.amenityIds === undefined) {
    return mapRoom(room);
  }

  const updatedRoom = await repo.replaceRoomAmenities(roomId, input.amenityIds);
  if (!updatedRoom) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }

  return mapRoom(updatedRoom);
};

export const deleteRoom = async (
  userId: string,
  roomId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const room = await ensureRoomExists(roomId);
  await assertCanManageInventory(actor, room.unit.propertyId);
  await repo.softDeleteRoomById(roomId);
};

export const listMaintenanceBlocks = async (
  userId: string,
  filters: DashboardMaintenanceListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listMaintenancePaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapMaintenanceBlock),
  );
};

export const getMaintenanceBlockById = async (
  userId: string,
  maintenanceBlockId: string,
): Promise<DashboardMaintenanceBlockDTO> => {
  const actor = await getActor(userId);
  const block = await ensureMaintenanceBlockExists(maintenanceBlockId);
  await assertCanManageInventory(actor, block.propertyId);
  return mapMaintenanceBlock(block);
};

export const createMaintenanceBlock = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardMaintenanceInput,
): Promise<DashboardMaintenanceBlockDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  assertValidDateRange(input.startDate, input.endDate);

  const target = await resolveMaintenanceTarget(propertyId, input);

  const block = await repo.createMaintenanceBlock({
    property: {
      connect: {
        id: propertyId,
      },
    },
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    targetType: input.targetType,
    startDate: input.startDate,
    endDate: input.endDate,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(target.unitId !== undefined && {
      unit: {
        connect: {
          id: target.unitId,
        },
      },
    }),
    ...(target.roomId !== undefined && {
      room: {
        connect: {
          id: target.roomId,
        },
      },
    }),
  });

  return mapMaintenanceBlock(block);
};

export const updateMaintenanceBlock = async (
  userId: string,
  maintenanceBlockId: string,
  input: UpdateDashboardMaintenanceInput,
): Promise<DashboardMaintenanceBlockDTO> => {
  const actor = await getActor(userId);
  const existingBlock = await ensureMaintenanceBlockExists(maintenanceBlockId);
  await assertCanManageInventory(actor, existingBlock.propertyId);

  const nextTargetType = input.targetType ?? existingBlock.targetType;
  const nextStartDate = input.startDate ?? existingBlock.startDate;
  const nextEndDate = input.endDate ?? existingBlock.endDate;
  assertValidDateRange(nextStartDate, nextEndDate);

  const target = await resolveMaintenanceTarget(existingBlock.propertyId, {
    targetType: nextTargetType,
    unitId: input.unitId ?? existingBlock.unitId ?? undefined,
    roomId: input.roomId ?? existingBlock.roomId ?? undefined,
  });

  const block = await repo.updateMaintenanceBlockById(maintenanceBlockId, {
    targetType: nextTargetType,
    startDate: nextStartDate,
    endDate: nextEndDate,
    ...(input.reason !== undefined && { reason: input.reason }),
    unit:
      target.unitId !== undefined
        ? {
            connect: {
              id: target.unitId,
            },
          }
        : {
            disconnect: true,
          },
    room:
      target.roomId !== undefined
        ? {
            connect: {
              id: target.roomId,
            },
          }
        : {
            disconnect: true,
          },
  });

  return mapMaintenanceBlock(block);
};

export const deleteMaintenanceBlock = async (
  userId: string,
  maintenanceBlockId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const block = await ensureMaintenanceBlockExists(maintenanceBlockId);
  await assertCanManageInventory(actor, block.propertyId);
  await repo.deleteMaintenanceBlockById(maintenanceBlockId);
};

export const listRoomProducts = async (
  userId: string,
  filters: DashboardRoomProductListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listRoomProductsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapRoomProduct),
  );
};

export const createRoomProduct = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardRoomProductInput,
): Promise<DashboardRoomProductDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  try {
    const product = await repo.createRoomProduct({
      property: {
        connect: {
          id: propertyId,
        },
      },
      name: input.name,
      occupancy: input.occupancy,
      hasAC: input.hasAC,
      category: input.category,
    });

    return mapRoomProduct(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "ROOM_PRODUCT_EXISTS",
        "Room product already exists",
      );
    }

    throw error;
  }
};

export const updateRoomProduct = async (
  userId: string,
  productId: string,
  input: UpdateDashboardRoomProductInput,
): Promise<DashboardRoomProductDTO> => {
  const actor = await getActor(userId);
  const existingProduct = await ensureRoomProductExists(productId);
  await assertCanManageInventory(actor, existingProduct.propertyId);

  try {
    const product = await repo.updateRoomProductById(productId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.occupancy !== undefined && { occupancy: input.occupancy }),
      ...(input.hasAC !== undefined && { hasAC: input.hasAC }),
      ...(input.category !== undefined && { category: input.category }),
    });

    return mapRoomProduct(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "ROOM_PRODUCT_EXISTS",
        "Room product already exists",
      );
    }

    throw error;
  }
};

export const listRoomPricing = async (
  userId: string,
  filters: DashboardRoomPricingListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listRoomPricingPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapRoomPricing),
  );
};

export const createRoomPricing = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardRoomPricingInput,
): Promise<DashboardRoomPricingDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  assertValidOptionalDateRange(input.validFrom, input.validTo);
  assertValidNightRange(input.minNights ?? 1, input.maxNights);

  const product = await ensureRoomProductExists(input.productId);
  ensureRoomProductBelongsToProperty(product, propertyId);
  const target = await resolvePricingTarget(propertyId, input);

  const pricing = await repo.createRoomPricing({
    property: {
      connect: {
        id: propertyId,
      },
    },
    product: {
      connect: {
        id: input.productId,
      },
    },
    ...(target.unitId !== undefined && {
      unit: {
        connect: {
          id: target.unitId,
        },
      },
    }),
    ...(target.roomId !== undefined && {
      room: {
        connect: {
          id: target.roomId,
        },
      },
    }),
    rateType: input.rateType ?? RateType.NIGHTLY,
    pricingTier: input.pricingTier ?? PricingTier.STANDARD,
    minNights: input.minNights ?? 1,
    ...(input.maxNights !== undefined && { maxNights: input.maxNights }),
    taxInclusive: input.taxInclusive ?? false,
    price: input.price,
    validFrom: input.validFrom,
    ...(input.validTo !== undefined && { validTo: input.validTo }),
  });

  return mapRoomPricing(pricing);
};

export const updateRoomPricing = async (
  userId: string,
  pricingId: string,
  input: UpdateDashboardRoomPricingInput,
): Promise<DashboardRoomPricingDTO> => {
  const actor = await getActor(userId);
  const existingPricing = await ensureRoomPricingExists(pricingId);
  await assertCanManageInventory(actor, existingPricing.propertyId);

  const nextValidFrom = input.validFrom ?? existingPricing.validFrom;
  const nextValidTo = input.validTo ?? existingPricing.validTo ?? undefined;
  assertValidOptionalDateRange(nextValidFrom, nextValidTo);
  assertValidNightRange(
    input.minNights ?? existingPricing.minNights,
    input.maxNights ?? existingPricing.maxNights ?? undefined,
  );

  if (input.productId !== undefined) {
    const product = await ensureRoomProductExists(input.productId);
    ensureRoomProductBelongsToProperty(product, existingPricing.propertyId);
  }

  const target =
    input.unitId !== undefined || input.roomId !== undefined
      ? await resolvePricingTarget(existingPricing.propertyId, input)
      : undefined;

  const pricing = await repo.updateRoomPricingById(pricingId, {
    ...(input.productId !== undefined && {
      product: {
        connect: {
          id: input.productId,
        },
      },
    }),
    ...(target?.unitId !== undefined && {
      unit: {
        connect: {
          id: target.unitId,
        },
      },
      room: {
        disconnect: true,
      },
    }),
    ...(target?.roomId !== undefined && {
      room: {
        connect: {
          id: target.roomId,
        },
      },
      unit: {
        disconnect: true,
      },
    }),
    ...(input.rateType !== undefined && { rateType: input.rateType }),
    ...(input.pricingTier !== undefined && {
      pricingTier: input.pricingTier,
    }),
    ...(input.minNights !== undefined && { minNights: input.minNights }),
    ...(input.maxNights !== undefined && { maxNights: input.maxNights }),
    ...(input.taxInclusive !== undefined && {
      taxInclusive: input.taxInclusive,
    }),
    ...(input.price !== undefined && { price: input.price }),
    ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
    ...(input.validTo !== undefined && { validTo: input.validTo }),
  });

  return mapRoomPricing(pricing);
};

export const deleteRoomPricing = async (
  userId: string,
  pricingId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const pricing = await ensureRoomPricingExists(pricingId);
  await assertCanManageInventory(actor, pricing.propertyId);
  await repo.deleteRoomPricingById(pricingId);
};

export const listTaxes = async (
  userId: string,
  filters: DashboardTaxListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listTaxesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapTax),
  );
};

export const createTax = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardTaxInput,
): Promise<DashboardTaxDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const tax = await repo.createTax({
    property: {
      connect: {
        id: propertyId,
      },
    },
    name: input.name,
    rate: input.rate,
    ...(input.taxType !== undefined && { taxType: input.taxType }),
    ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  return mapTax(tax);
};

export const updateTax = async (
  userId: string,
  taxId: string,
  input: UpdateDashboardTaxInput,
): Promise<DashboardTaxDTO> => {
  const actor = await getActor(userId);
  const existingTax = await ensureTaxExists(taxId);
  await assertCanManageInventory(actor, existingTax.propertyId);

  const tax = await repo.updateTaxById(taxId, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.rate !== undefined && { rate: input.rate }),
    ...(input.taxType !== undefined && { taxType: input.taxType }),
    ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  return mapTax(tax);
};

export const listCoupons = async (
  userId: string,
  filters: DashboardCouponListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listCouponsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapCoupon),
  );
};

export const createCoupon = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardCouponInput,
): Promise<DashboardCouponDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  assertValidOptionalDateRange(input.validFrom, input.validTo);

  try {
    const coupon = await repo.createCoupon({
      property: {
        connect: {
          id: propertyId,
        },
      },
      code: input.code.toUpperCase(),
      name: input.name,
      ...(input.discountType !== undefined && {
        discountType: input.discountType,
      }),
      discountValue: input.discountValue,
      ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
      ...(input.minNights !== undefined && { minNights: input.minNights }),
      ...(input.minAmount !== undefined && { minAmount: input.minAmount }),
      validFrom: input.validFrom,
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });

    return mapCoupon(coupon);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "COUPON_EXISTS", "Coupon already exists");
    }

    throw error;
  }
};

export const updateCoupon = async (
  userId: string,
  couponId: string,
  input: UpdateDashboardCouponInput,
): Promise<DashboardCouponDTO> => {
  const actor = await getActor(userId);
  const existingCoupon = await ensureCouponExists(couponId);
  await assertCanManageInventory(actor, existingCoupon.propertyId);
  assertValidOptionalDateRange(
    input.validFrom ?? existingCoupon.validFrom,
    input.validTo ?? existingCoupon.validTo ?? undefined,
  );

  try {
    const coupon = await repo.updateCouponById(couponId, {
      ...(input.code !== undefined && { code: input.code.toUpperCase() }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.discountType !== undefined && {
        discountType: input.discountType,
      }),
      ...(input.discountValue !== undefined && {
        discountValue: input.discountValue,
      }),
      ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
      ...(input.minNights !== undefined && { minNights: input.minNights }),
      ...(input.minAmount !== undefined && { minAmount: input.minAmount }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });

    return mapCoupon(coupon);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "COUPON_EXISTS", "Coupon already exists");
    }

    throw error;
  }
};

export const listBookings = async (
  userId: string,
  filters: DashboardBookingListInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, filters.propertyId);

  const { items, total } = await repo.listBookingsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapBooking),
  );
};

export const checkManualBookingAvailability = async (
  userId: string,
  propertyId: string,
  input: CheckDashboardManualBookingAvailabilityInput,
): Promise<DashboardManualBookingAvailabilityDTO> => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await ensurePropertyExists(propertyId);
  const uniqueSpaceIds = [...new Set(input.spaceIds)];
  const nights = getStayNights(input.from, input.to);

  const items = await Promise.all(
    uniqueSpaceIds.map(async (spaceId) => {
      const space = await publicRepo.findActiveSpaceById(
        spaceId,
        new Date(),
        property.tenantId,
        undefined,
        {
          checkIn: input.from,
          checkOut: input.to,
          nights,
        },
      );

      if (!space) {
        return {
          spaceId,
          available: false,
          capacity: 0,
          targetType: BookingTargetType.ROOM,
          reason: "No active price for selected dates",
        };
      }

      if (space.propertyId !== propertyId) {
        return {
          spaceId,
          available: false,
          capacity: getManualBookingSpaceCapacity(space),
          targetType: getManualBookingSpaceTarget(space).targetType,
          reason: "Space belongs to another property",
        };
      }

      const target = getManualBookingSpaceTarget(space);
      const capacity = getManualBookingSpaceCapacity(space);
      const [hasBooking, hasMaintenance] = await Promise.all([
        publicRepo.hasOverlappingBooking(target, input.from, input.to),
        publicRepo.hasOverlappingMaintenance(
          propertyId,
          target,
          input.from,
          input.to,
        ),
      ]);

      if (hasBooking) {
        return {
          spaceId,
          available: false,
          capacity,
          targetType: target.targetType,
          reason: "Already booked for selected dates",
        };
      }

      if (hasMaintenance) {
        return {
          spaceId,
          available: false,
          capacity,
          targetType: target.targetType,
          reason: "Blocked for maintenance",
        };
      }

      return {
        spaceId,
        available: true,
        capacity,
        targetType: target.targetType,
        reason: null,
      };
    }),
  );

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    guests: input.guests,
    availableSpaceIds: items
      .filter((item) => item.available)
      .map((item) => item.spaceId),
    items,
  };
};

export const createManualBooking = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardManualBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await ensurePropertyExists(propertyId);
  const guest = await findOrCreateWalkInGuest(actor, input);

  const createdBooking = await createBookingForUser(
    guest.id,
    {
      bookingType: input.bookingType,
      ...(input.spaceId !== undefined && { spaceId: input.spaceId }),
      ...(input.spaceIds !== undefined && { spaceIds: input.spaceIds }),
      from: input.from,
      to: input.to,
      guests: input.guests,
    },
    {
      tenantId: property.tenantId,
    },
    {
      actorUserId: actor.id,
      requiredPropertyId: propertyId,
      paymentPolicy: BookingPaymentPolicy.NO_UPFRONT_PAYMENT,
      upfrontAmount: 0,
      initialStatus: BookingStatus.CONFIRMED,
      statusHistoryNote: "Manual walk-in booking created from dashboard",
      internalNotes: input.internalNotes ?? null,
    },
  );

  const booking = await repo.findBookingById(createdBooking.id);
  if (!booking) {
    throw new HttpError(
      500,
      "BOOKING_READ_FAILED",
      "Booking was created but could not be loaded",
    );
  }

  return mapBooking(booking);
};

export const updateBooking = async (
  userId: string,
  bookingId: string,
  input: UpdateDashboardBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);

  const nextStatus = input.status;
  const statusChanged =
    nextStatus !== undefined && nextStatus !== booking.status;

  if (statusChanged && nextStatus !== undefined) {
    assertBookingTransitionAllowed(booking.status, nextStatus);
  }

  const updatedBooking = await repo.updateBookingLifecycleById(
    bookingId,
    {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.internalNotes !== undefined && {
        internalNotes: input.internalNotes,
      }),
    },
    statusChanged && nextStatus !== undefined
      ? {
          booking: {
            connect: {
              id: bookingId,
            },
          },
          fromStatus: booking.status,
          toStatus: nextStatus,
          actor: {
            connect: {
              id: actor.id,
            },
          },
          ...(input.note !== undefined && { note: input.note }),
        }
      : undefined,
  );

  return mapBooking(updatedBooking);
};

export const listEnquiries = async (
  userId: string,
  filters: DashboardLeadListInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, filters.propertyId);

  const { items, total } = await repo.listEnquiriesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapEnquiry),
  );
};

export const updateEnquiry = async (
  userId: string,
  enquiryId: string,
  input: UpdateDashboardLeadInput,
): Promise<DashboardEnquiryDTO> => {
  const actor = await getActor(userId);
  const enquiry = await ensureEnquiryExists(enquiryId);
  await assertPropertyInScope(actor, enquiry.propertyId);

  const updatedEnquiry = await repo.updateEnquiryById(enquiryId, {
    status: input.status,
  });

  return mapEnquiry(updatedEnquiry);
};

export const listQuotes = async (
  userId: string,
  filters: DashboardLeadListInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, filters.propertyId);

  const { items, total } = await repo.listQuotesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapQuote),
  );
};

export const updateQuote = async (
  userId: string,
  quoteId: string,
  input: UpdateDashboardLeadInput,
): Promise<DashboardQuoteDTO> => {
  const actor = await getActor(userId);
  const quote = await ensureQuoteExists(quoteId);
  await assertPropertyInScope(actor, quote.propertyId);

  const updatedQuote = await repo.updateQuoteById(quoteId, {
    status: input.status,
  });

  return mapQuote(updatedQuote);
};
