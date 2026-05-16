import { prisma } from "@/db/prisma.js";
import {
  type BookingStatus,
  BookingStatus as BookingStatusValue,
  type DiscountType,
  type LeadStatus,
  type MaintenanceTargetType,
  type PricingTier,
  Prisma,
  PropertyAssignmentRole,
  type RateType,
  type RoomProductCategory,
  type RoomStatus,
  type TaxType,
  type TenantStatus,
  UserRole,
  type PropertyStatus,
  type UnitStatus,
} from "@/generated/prisma/client.js";

const dashboardPropertyInclude = {
  tenant: true,
  assignments: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.PropertyInclude;

const dashboardAssignmentInclude = {
  property: true,
  user: true,
  assignedBy: true,
} satisfies Prisma.PropertyAssignmentInclude;

const dashboardAmenityInclude = {
  property: true,
} satisfies Prisma.AmenityInclude;

const dashboardUnitInclude = {
  property: true,
  amenities: {
    include: {
      amenity: true,
    },
  },
} satisfies Prisma.UnitInclude;

const dashboardRoomInclude = {
  unit: {
    include: {
      property: true,
    },
  },
  amenities: {
    include: {
      amenity: true,
    },
  },
} satisfies Prisma.RoomInclude;

const dashboardMaintenanceInclude = {
  property: true,
  unit: true,
  room: {
    include: {
      unit: true,
    },
  },
  createdBy: true,
} satisfies Prisma.MaintenanceBlockInclude;

const dashboardRoomProductInclude = {
  property: true,
} satisfies Prisma.RoomProductInclude;

const dashboardRoomPricingInclude = {
  property: true,
  product: true,
  unit: true,
  room: {
    include: {
      unit: true,
    },
  },
} satisfies Prisma.RoomPricingInclude;

const dashboardTaxInclude = {
  property: true,
} satisfies Prisma.TaxInclude;

const dashboardCouponInclude = {
  property: true,
} satisfies Prisma.CouponInclude;

const dashboardBookingInclude = {
  property: true,
  user: true,
  items: {
    orderBy: {
      createdAt: "asc",
    },
  },
  statusHistory: {
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.BookingInclude;

const dashboardEnquiryInclude = {
  property: true,
} satisfies Prisma.EnquiryInclude;

const dashboardQuoteInclude = {
  property: true,
  user: true,
  product: true,
} satisfies Prisma.QuoteRequestInclude;

export type DashboardUserRecord = Prisma.UserGetPayload<Record<string, never>>;
export type DashboardPropertyRecord = Prisma.PropertyGetPayload<{
  include: typeof dashboardPropertyInclude;
}>;
export type DashboardTenantRecord = Prisma.TenantGetPayload<Record<string, never>>;
export type DashboardPropertyAssignmentRecord =
  Prisma.PropertyAssignmentGetPayload<{
    include: typeof dashboardAssignmentInclude;
  }>;
export type DashboardAmenityRecord = Prisma.AmenityGetPayload<{
  include: typeof dashboardAmenityInclude;
}>;
export type DashboardUnitRecord = Prisma.UnitGetPayload<{
  include: typeof dashboardUnitInclude;
}>;
export type DashboardRoomRecord = Prisma.RoomGetPayload<{
  include: typeof dashboardRoomInclude;
}>;
export type DashboardMaintenanceRecord = Prisma.MaintenanceBlockGetPayload<{
  include: typeof dashboardMaintenanceInclude;
}>;
export type DashboardRoomProductRecord = Prisma.RoomProductGetPayload<{
  include: typeof dashboardRoomProductInclude;
}>;
export type DashboardRoomPricingRecord = Prisma.RoomPricingGetPayload<{
  include: typeof dashboardRoomPricingInclude;
}>;
export type DashboardTaxRecord = Prisma.TaxGetPayload<{
  include: typeof dashboardTaxInclude;
}>;
export type DashboardCouponRecord = Prisma.CouponGetPayload<{
  include: typeof dashboardCouponInclude;
}>;
export type DashboardBookingRecord = Prisma.BookingGetPayload<{
  include: typeof dashboardBookingInclude;
}>;
export type DashboardEnquiryRecord = Prisma.EnquiryGetPayload<{
  include: typeof dashboardEnquiryInclude;
}>;
export type DashboardQuoteRecord = Prisma.QuoteRequestGetPayload<{
  include: typeof dashboardQuoteInclude;
}>;
export type DashboardRoomBoardRoomRecord = Prisma.RoomGetPayload<{
  include: {
    unit: true;
  };
}>;
export type DashboardRoomBoardBookingItemRecord =
  Prisma.BookingItemGetPayload<{
    include: {
      booking: true;
    };
  }>;
export type DashboardRoomBoardMaintenanceRecord =
  Prisma.MaintenanceBlockGetPayload<Record<string, never>>;

interface UserListFilters {
  page: number;
  limit: number;
  roles: UserRole[];
  search?: string;
  isActive?: boolean;
  createdByUserId?: string;
}

interface PropertyListFilters {
  page: number;
  limit: number;
  tenantId?: string;
  propertyIds?: string[];
  search?: string;
  status?: PropertyStatus;
  isActive?: boolean;
}

interface TenantListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: TenantStatus;
}

interface AssignmentListFilters {
  page: number;
  limit: number;
  propertyIds?: string[];
  propertyId?: string;
  role?: PropertyAssignmentRole;
  userId?: string;
}

interface AmenityListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  isActive?: boolean;
}

interface UnitListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  status?: UnitStatus;
  isActive?: boolean;
}

interface RoomListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  status?: RoomStatus;
  isActive?: boolean;
}

interface MaintenanceListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  targetType?: MaintenanceTargetType;
}

interface RoomProductListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  category?: RoomProductCategory;
}

interface RoomPricingListFilters {
  page: number;
  limit: number;
  propertyId: string;
  productId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
}

interface TaxListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  taxType?: TaxType;
  isActive?: boolean;
}

interface CouponListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  discountType?: DiscountType;
  isActive?: boolean;
}

interface BookingListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  status?: BookingStatus;
}

interface LeadListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  status?: LeadStatus;
  source?: string;
}

const buildUserWhere = (filters: Omit<UserListFilters, "page" | "limit">) =>
  ({
    role: { in: filters.roles },
    ...(filters.search !== undefined && {
      OR: [
        { fullName: { contains: filters.search } },
        { email: { contains: filters.search } },
      ],
    }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    ...(filters.createdByUserId !== undefined && {
      createdByUserId: filters.createdByUserId,
    }),
  }) satisfies Prisma.UserWhereInput;

const buildPropertyWhere = (
  filters: Omit<PropertyListFilters, "page" | "limit">,
) =>
  ({
    ...(filters.tenantId !== undefined && { tenantId: filters.tenantId }),
    ...(filters.propertyIds !== undefined && {
      id: { in: filters.propertyIds },
    }),
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { city: { contains: filters.search } },
        { state: { contains: filters.search } },
      ],
    }),
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.PropertyWhereInput;

const buildTenantWhere = (filters: Omit<TenantListFilters, "page" | "limit">) =>
  ({
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { slug: { contains: filters.search } },
        { brandName: { contains: filters.search } },
        { primaryDomain: { contains: filters.search } },
      ],
    }),
    ...(filters.status !== undefined && { status: filters.status }),
  }) satisfies Prisma.TenantWhereInput;

const buildAssignmentWhere = (
  filters: Omit<AssignmentListFilters, "page" | "limit">,
) =>
  ({
    ...(filters.propertyIds !== undefined && {
      propertyId: { in: filters.propertyIds },
    }),
    ...(filters.propertyId !== undefined && { propertyId: filters.propertyId }),
    ...(filters.role !== undefined && { role: filters.role }),
    ...(filters.userId !== undefined && { userId: filters.userId }),
  }) satisfies Prisma.PropertyAssignmentWhereInput;

const buildAmenityWhere = (filters: Omit<AmenityListFilters, "page" | "limit">) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      name: { contains: filters.search },
    }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.AmenityWhereInput;

const buildUnitWhere = (filters: Omit<UnitListFilters, "page" | "limit">) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      unitNumber: { contains: filters.search },
    }),
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.UnitWhereInput;

const buildRoomWhere = (filters: Omit<RoomListFilters, "page" | "limit">) =>
  ({
    unit: {
      is: {
        propertyId: filters.propertyId,
      },
    },
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { number: { contains: filters.search } },
        {
          unit: {
            is: {
              unitNumber: { contains: filters.search },
            },
          },
        },
      ],
    }),
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.RoomWhereInput;

const buildMaintenanceWhere = (
  filters: Omit<MaintenanceListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      reason: { contains: filters.search },
    }),
    ...(filters.targetType !== undefined && {
      targetType: filters.targetType,
    }),
  }) satisfies Prisma.MaintenanceBlockWhereInput;

const buildRoomProductWhere = (
  filters: Omit<RoomProductListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      name: { contains: filters.search },
    }),
    ...(filters.category !== undefined && { category: filters.category }),
  }) satisfies Prisma.RoomProductWhereInput;

const buildRoomPricingWhere = (
  filters: Omit<RoomPricingListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.productId !== undefined && { productId: filters.productId }),
    ...(filters.rateType !== undefined && { rateType: filters.rateType }),
    ...(filters.pricingTier !== undefined && {
      pricingTier: filters.pricingTier,
    }),
  }) satisfies Prisma.RoomPricingWhereInput;

const buildTaxWhere = (filters: Omit<TaxListFilters, "page" | "limit">) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      name: { contains: filters.search },
    }),
    ...(filters.taxType !== undefined && { taxType: filters.taxType }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.TaxWhereInput;

const buildCouponWhere = (
  filters: Omit<CouponListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      OR: [
        { code: { contains: filters.search } },
        { name: { contains: filters.search } },
      ],
    }),
    ...(filters.discountType !== undefined && {
      discountType: filters.discountType,
    }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.CouponWhereInput;

const buildBookingWhere = (
  filters: Omit<BookingListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.search !== undefined && {
      OR: [
        { targetLabel: { contains: filters.search } },
        { productName: { contains: filters.search } },
        { guestNameSnapshot: { contains: filters.search } },
        { guestEmailSnapshot: { contains: filters.search } },
        { guestContactSnapshot: { contains: filters.search } },
        {
          user: {
            is: {
              OR: [
                { fullName: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            },
          },
        },
      ],
    }),
  }) satisfies Prisma.BookingWhereInput;

const buildEnquiryWhere = (
  filters: Omit<LeadListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.source !== undefined && { source: filters.source }),
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { contactNumber: { contains: filters.search } },
        { message: { contains: filters.search } },
      ],
    }),
  }) satisfies Prisma.EnquiryWhereInput;

const buildQuoteWhere = (filters: Omit<LeadListFilters, "page" | "limit">) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.search !== undefined && {
      OR: [
        { notes: { contains: filters.search } },
        {
          user: {
            is: {
              OR: [
                { fullName: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            },
          },
        },
        {
          product: {
            is: {
              name: { contains: filters.search },
            },
          },
        },
      ],
    }),
  }) satisfies Prisma.QuoteRequestWhereInput;

export const findUserById = (id: string) =>
  prisma.user.findUnique({
    where: { id },
  });

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({
    where: { email },
  });

export const createUser = (data: Prisma.UserCreateInput) =>
  prisma.user.create({
    data,
  });

export const updateUserById = (id: string, data: Prisma.UserUpdateInput) =>
  prisma.user.update({
    where: { id },
    data,
  });

export const listUsersPaginated = async (filters: UserListFilters) => {
  const where = buildUserWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
};

export const countUsersByRole = (role: UserRole, createdByUserId?: string) =>
  prisma.user.count({
    where: {
      role,
      ...(createdByUserId !== undefined && { createdByUserId }),
    },
  });

export const listAssignedPropertyIds = async (
  userId: string,
  role?: PropertyAssignmentRole,
) => {
  const assignments = await prisma.propertyAssignment.findMany({
    where: {
      userId,
      ...(role !== undefined && { role }),
    },
    select: {
      propertyId: true,
    },
  });

  return assignments.map((assignment) => assignment.propertyId);
};

export const listPropertySummaries = (propertyIds?: string[]) =>
  prisma.property.findMany({
    where: {
      ...(propertyIds !== undefined && {
        id: { in: propertyIds },
      }),
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      tenantId: true,
      name: true,
      city: true,
      state: true,
      tenant: {
        select: {
          name: true,
        },
      },
    },
  });

export const listTenantsPaginated = async (filters: TenantListFilters) => {
  const where = buildTenantWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.tenant.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { items, total };
};

export const listActiveTenantOptions = () =>
  prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

export const findTenantById = (id: string) =>
  prisma.tenant.findUnique({
    where: { id },
  });

export const findTenantBySlug = (slug: string) =>
  prisma.tenant.findUnique({
    where: { slug },
  });

export const createTenant = (data: Prisma.TenantCreateInput) =>
  prisma.tenant.create({
    data,
  });

export const updateTenantById = (id: string, data: Prisma.TenantUpdateInput) =>
  prisma.tenant.update({
    where: { id },
    data,
  });

export const listPropertiesPaginated = async (filters: PropertyListFilters) => {
  const where = buildPropertyWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardPropertyInclude,
    }),
    prisma.property.count({ where }),
  ]);

  return { items, total };
};

export const findPropertyById = (id: string) =>
  prisma.property.findUnique({
    where: { id },
    include: dashboardPropertyInclude,
  });

export const createProperty = (data: Prisma.PropertyCreateInput) =>
  prisma.property.create({
    data,
    include: dashboardPropertyInclude,
  });

export const updatePropertyById = (id: string, data: Prisma.PropertyUpdateInput) =>
  prisma.property.update({
    where: { id },
    data,
    include: dashboardPropertyInclude,
  });

export const listPropertyAssignmentsPaginated = async (
  filters: AssignmentListFilters,
) => {
  const where = buildAssignmentWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.propertyAssignment.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardAssignmentInclude,
    }),
    prisma.propertyAssignment.count({ where }),
  ]);

  return { items, total };
};

export const findPropertyAssignmentById = (id: string) =>
  prisma.propertyAssignment.findUnique({
    where: { id },
    include: dashboardAssignmentInclude,
  });

export const findPropertyAssignmentByPropertyAndUser = (
  propertyId: string,
  userId: string,
) =>
  prisma.propertyAssignment.findUnique({
    where: {
      propertyId_userId: {
        propertyId,
        userId,
      },
    },
    include: dashboardAssignmentInclude,
  });

export const findPropertyAssignmentByPropertyAndRole = (
  propertyId: string,
  role: PropertyAssignmentRole,
) =>
  prisma.propertyAssignment.findFirst({
    where: {
      propertyId,
      role,
    },
    include: dashboardAssignmentInclude,
  });

export const createPropertyAssignment = (data: Prisma.PropertyAssignmentCreateInput) =>
  prisma.propertyAssignment.create({
    data,
    include: dashboardAssignmentInclude,
  });

export const deletePropertyAssignmentById = (id: string) =>
  prisma.propertyAssignment.delete({
    where: { id },
  });

export const countAssignments = (
  propertyIds?: string[],
  role?: PropertyAssignmentRole,
) =>
  prisma.propertyAssignment.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(role !== undefined && { role }),
    },
  });

export const listAmenitiesPaginated = async (filters: AmenityListFilters) => {
  const where = buildAmenityWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.amenity.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardAmenityInclude,
    }),
    prisma.amenity.count({ where }),
  ]);

  return { items, total };
};

export const findAmenityById = (id: string) =>
  prisma.amenity.findUnique({
    where: { id },
    include: dashboardAmenityInclude,
  });

export const createAmenity = (data: Prisma.AmenityCreateInput) =>
  prisma.amenity.create({
    data,
    include: dashboardAmenityInclude,
  });

export const updateAmenityById = (id: string, data: Prisma.AmenityUpdateInput) =>
  prisma.amenity.update({
    where: { id },
    data,
    include: dashboardAmenityInclude,
  });

export const countActiveAmenitiesByPropertyAndIds = (
  propertyId: string,
  ids: string[],
) =>
  prisma.amenity.count({
    where: {
      propertyId,
      id: { in: ids },
      isActive: true,
    },
  });

export const countAmenities = (propertyIds?: string[]) =>
  prisma.amenity.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const listUnitsPaginated = async (filters: UnitListFilters) => {
  const where = buildUnitWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.unit.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardUnitInclude,
    }),
    prisma.unit.count({ where }),
  ]);

  return { items, total };
};

export const findUnitById = (id: string) =>
  prisma.unit.findUnique({
    where: { id },
    include: dashboardUnitInclude,
  });

export const findUnitByPropertyAndNumber = (propertyId: string, unitNumber: string) =>
  prisma.unit.findUnique({
    where: {
      propertyId_unitNumber: {
        propertyId,
        unitNumber,
      },
    },
    include: dashboardUnitInclude,
  });

export const createUnit = (data: Prisma.UnitCreateInput) =>
  prisma.unit.create({
    data,
    include: dashboardUnitInclude,
  });

export const updateUnitById = (id: string, data: Prisma.UnitUpdateInput) =>
  prisma.unit.update({
    where: { id },
    data,
    include: dashboardUnitInclude,
  });

export const softDeleteUnitById = (id: string) =>
  prisma.unit.update({
    where: { id },
    data: { isActive: false },
    include: dashboardUnitInclude,
  });

export const replaceUnitAmenities = async (unitId: string, amenityIds: string[]) =>
  prisma.$transaction(async (tx) => {
    await tx.unitAmenity.deleteMany({
      where: { unitId },
    });

    if (amenityIds.length > 0) {
      await tx.unitAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          unitId,
          amenityId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.unit.findUnique({
      where: { id: unitId },
      include: dashboardUnitInclude,
    });
  });

export const countUnits = (propertyIds?: string[]) =>
  prisma.unit.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const listRoomsPaginated = async (filters: RoomListFilters) => {
  const where = buildRoomWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.room.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardRoomInclude,
    }),
    prisma.room.count({ where }),
  ]);

  return { items, total };
};

export const findRoomById = (id: string) =>
  prisma.room.findUnique({
    where: { id },
    include: dashboardRoomInclude,
  });

export const findRoomByUnitAndNumber = (unitId: string, number: string) =>
  prisma.room.findUnique({
    where: {
      unitId_number: {
        unitId,
        number,
      },
    },
    include: dashboardRoomInclude,
  });

export const createRoom = (data: Prisma.RoomCreateInput) =>
  prisma.room.create({
    data,
    include: dashboardRoomInclude,
  });

export const updateRoomById = (id: string, data: Prisma.RoomUpdateInput) =>
  prisma.room.update({
    where: { id },
    data,
    include: dashboardRoomInclude,
  });

export const softDeleteRoomById = (id: string) =>
  prisma.room.update({
    where: { id },
    data: { isActive: false },
    include: dashboardRoomInclude,
  });

export const replaceRoomAmenities = async (roomId: string, amenityIds: string[]) =>
  prisma.$transaction(async (tx) => {
    await tx.roomAmenity.deleteMany({
      where: { roomId },
    });

    if (amenityIds.length > 0) {
      await tx.roomAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          roomId,
          amenityId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.room.findUnique({
      where: { id: roomId },
      include: dashboardRoomInclude,
    });
  });

export const countRooms = (propertyIds?: string[]) =>
  prisma.room.count({
    where: {
      ...(propertyIds !== undefined && {
        unit: {
          is: {
            propertyId: { in: propertyIds },
          },
        },
      }),
    },
  });

export const listRoomBoardRooms = (propertyId: string) =>
  prisma.room.findMany({
    where: {
      unit: {
        is: {
          propertyId,
        },
      },
    },
    include: {
      unit: true,
    },
    orderBy: [
      { unit: { floor: "asc" } },
      { unit: { unitNumber: "asc" } },
      { number: "asc" },
    ],
  });

export const listRoomBoardBookingItems = (
  propertyId: string,
  from: Date,
  to: Date,
) =>
  prisma.bookingItem.findMany({
    where: {
      booking: {
        propertyId,
        status: {
          notIn: [
            BookingStatusValue.CANCELLED,
            BookingStatusValue.CHECKED_OUT,
            BookingStatusValue.NO_SHOW,
          ],
        },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
    },
    include: {
      booking: true,
    },
    orderBy: [
      { booking: { checkIn: "asc" } },
      { booking: { createdAt: "asc" } },
    ],
  });

export const listRoomBoardMaintenanceBlocks = (
  propertyId: string,
  from: Date,
  to: Date,
) =>
  prisma.maintenanceBlock.findMany({
    where: {
      propertyId,
      startDate: { lt: to },
      endDate: { gt: from },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });

export const listMaintenancePaginated = async (
  filters: MaintenanceListFilters,
) => {
  const where = buildMaintenanceWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.maintenanceBlock.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { startDate: "desc" },
      include: dashboardMaintenanceInclude,
    }),
    prisma.maintenanceBlock.count({ where }),
  ]);

  return { items, total };
};

export const findMaintenanceBlockById = (id: string) =>
  prisma.maintenanceBlock.findUnique({
    where: { id },
    include: dashboardMaintenanceInclude,
  });

export const createMaintenanceBlock = (data: Prisma.MaintenanceBlockCreateInput) =>
  prisma.maintenanceBlock.create({
    data,
    include: dashboardMaintenanceInclude,
  });

export const updateMaintenanceBlockById = (
  id: string,
  data: Prisma.MaintenanceBlockUpdateInput,
) =>
  prisma.maintenanceBlock.update({
    where: { id },
    data,
    include: dashboardMaintenanceInclude,
  });

export const deleteMaintenanceBlockById = (id: string) =>
  prisma.maintenanceBlock.delete({
    where: { id },
  });

export const countMaintenanceBlocks = (propertyIds?: string[]) =>
  prisma.maintenanceBlock.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countRoomProducts = (propertyIds?: string[]) =>
  prisma.roomProduct.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countRoomPricing = (propertyIds?: string[]) =>
  prisma.roomPricing.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countTaxes = (propertyIds?: string[]) =>
  prisma.tax.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countCoupons = (propertyIds?: string[]) =>
  prisma.coupon.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countBookings = (
  propertyIds?: string[],
  statuses?: BookingStatus[],
) =>
  prisma.booking.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(statuses !== undefined && {
        status: { in: statuses },
      }),
    },
  });

export const countEnquiries = (
  propertyIds?: string[],
  statuses?: LeadStatus[],
) =>
  prisma.enquiry.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(statuses !== undefined && {
        status: { in: statuses },
      }),
    },
  });

export const countQuotes = (
  propertyIds?: string[],
  statuses?: LeadStatus[],
) =>
  prisma.quoteRequest.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(statuses !== undefined && {
        status: { in: statuses },
      }),
    },
  });

export const listRoomProductsPaginated = async (
  filters: RoomProductListFilters,
) => {
  const where = buildRoomProductWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.roomProduct.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardRoomProductInclude,
    }),
    prisma.roomProduct.count({ where }),
  ]);

  return { items, total };
};

export const findRoomProductById = (id: string) =>
  prisma.roomProduct.findUnique({
    where: { id },
    include: dashboardRoomProductInclude,
  });

export const createRoomProduct = (data: Prisma.RoomProductCreateInput) =>
  prisma.roomProduct.create({
    data,
    include: dashboardRoomProductInclude,
  });

export const updateRoomProductById = (
  id: string,
  data: Prisma.RoomProductUpdateInput,
) =>
  prisma.roomProduct.update({
    where: { id },
    data,
    include: dashboardRoomProductInclude,
  });

export const listRoomPricingPaginated = async (
  filters: RoomPricingListFilters,
) => {
  const where = buildRoomPricingWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.roomPricing.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { validFrom: "desc" },
      include: dashboardRoomPricingInclude,
    }),
    prisma.roomPricing.count({ where }),
  ]);

  return { items, total };
};

export const findRoomPricingById = (id: string) =>
  prisma.roomPricing.findUnique({
    where: { id },
    include: dashboardRoomPricingInclude,
  });

export const findOverlappingRoomPricing = (input: {
  propertyId: string;
  productId: string;
  roomId?: string | null;
  unitId?: string | null;
  rateType: RateType;
  validFrom: Date;
  validTo?: Date | null;
  excludePricingId?: string;
}) => {
  const scopeWhere =
    input.roomId !== undefined && input.roomId !== null
      ? { roomId: input.roomId }
      : input.unitId !== undefined && input.unitId !== null
        ? { roomId: null, unitId: input.unitId }
        : { roomId: null, unitId: null };

  return prisma.roomPricing.findFirst({
    where: {
      propertyId: input.propertyId,
      productId: input.productId,
      rateType: input.rateType,
      ...scopeWhere,
      ...(input.excludePricingId !== undefined && {
        id: { not: input.excludePricingId },
      }),
      validFrom: { lte: input.validTo ?? new Date("9999-12-31T00:00:00.000Z") },
      OR: [{ validTo: null }, { validTo: { gte: input.validFrom } }],
    },
    include: dashboardRoomPricingInclude,
  });
};

export const createRoomPricing = (data: Prisma.RoomPricingCreateInput) =>
  prisma.roomPricing.create({
    data,
    include: dashboardRoomPricingInclude,
  });

export const updateRoomPricingById = (
  id: string,
  data: Prisma.RoomPricingUpdateInput,
) =>
  prisma.roomPricing.update({
    where: { id },
    data,
    include: dashboardRoomPricingInclude,
  });

export const deleteRoomPricingById = (id: string) =>
  prisma.roomPricing.delete({
    where: { id },
  });

export const listTaxesPaginated = async (filters: TaxListFilters) => {
  const where = buildTaxWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.tax.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardTaxInclude,
    }),
    prisma.tax.count({ where }),
  ]);

  return { items, total };
};

export const findTaxById = (id: string) =>
  prisma.tax.findUnique({
    where: { id },
    include: dashboardTaxInclude,
  });

export const createTax = (data: Prisma.TaxCreateInput) =>
  prisma.tax.create({
    data,
    include: dashboardTaxInclude,
  });

export const updateTaxById = (id: string, data: Prisma.TaxUpdateInput) =>
  prisma.tax.update({
    where: { id },
    data,
    include: dashboardTaxInclude,
  });

export const listCouponsPaginated = async (filters: CouponListFilters) => {
  const where = buildCouponWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.coupon.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardCouponInclude,
    }),
    prisma.coupon.count({ where }),
  ]);

  return { items, total };
};

export const findCouponById = (id: string) =>
  prisma.coupon.findUnique({
    where: { id },
    include: dashboardCouponInclude,
  });

export const createCoupon = (data: Prisma.CouponCreateInput) =>
  prisma.coupon.create({
    data,
    include: dashboardCouponInclude,
  });

export const updateCouponById = (
  id: string,
  data: Prisma.CouponUpdateInput,
) =>
  prisma.coupon.update({
    where: { id },
    data,
    include: dashboardCouponInclude,
  });

export const listBookingsPaginated = async (filters: BookingListFilters) => {
  const where = buildBookingWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardBookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
};

export const findBookingById = (id: string) =>
  prisma.booking.findUnique({
    where: { id },
    include: dashboardBookingInclude,
  });

export const updateBookingById = (id: string, data: Prisma.BookingUpdateInput) =>
  prisma.booking.update({
    where: { id },
    data,
    include: dashboardBookingInclude,
  });

export const hasOverlappingRoomBooking = (input: {
  roomId: string;
  unitId: string;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId: string;
}) =>
  prisma.bookingItem
    .count({
      where: {
        OR: [
          { targetType: "ROOM", roomId: input.roomId },
          { targetType: "UNIT", unitId: input.unitId },
        ],
        booking: {
          id: { not: input.excludeBookingId },
          status: {
            notIn: [
              BookingStatusValue.CANCELLED,
              BookingStatusValue.CHECKED_OUT,
              BookingStatusValue.NO_SHOW,
            ],
          },
          checkIn: { lt: input.checkOut },
          checkOut: { gt: input.checkIn },
        },
      },
    })
    .then((count) => count > 0);

export const hasOverlappingRoomMaintenance = (input: {
  propertyId: string;
  roomId: string;
  unitId: string;
  checkIn: Date;
  checkOut: Date;
}) =>
  prisma.maintenanceBlock
    .count({
      where: {
        propertyId: input.propertyId,
        startDate: { lt: input.checkOut },
        endDate: { gt: input.checkIn },
        OR: [
          { targetType: "PROPERTY" },
          { targetType: "UNIT", unitId: input.unitId },
          { targetType: "ROOM", roomId: input.roomId },
        ],
      },
    })
    .then((count) => count > 0);

export const updateBookingLifecycleById = (
  id: string,
  data: Prisma.BookingUpdateInput,
  history?: Prisma.BookingStatusHistoryCreateInput,
  assignment?: {
    itemId: string;
    data: Prisma.BookingItemUpdateInput;
  },
) =>
  prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data,
    });

    if (assignment !== undefined) {
      await tx.bookingItem.update({
        where: { id: assignment.itemId },
        data: assignment.data,
      });
    }

    if (history !== undefined) {
      await tx.bookingStatusHistory.create({
        data: history,
      });
    }

    return tx.booking.findUniqueOrThrow({
      where: { id },
      include: dashboardBookingInclude,
    });
  });

export const listEnquiriesPaginated = async (filters: LeadListFilters) => {
  const where = buildEnquiryWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.enquiry.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardEnquiryInclude,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return { items, total };
};

export const findEnquiryById = (id: string) =>
  prisma.enquiry.findUnique({
    where: { id },
    include: dashboardEnquiryInclude,
  });

export const updateEnquiryById = (
  id: string,
  data: Prisma.EnquiryUpdateInput,
) =>
  prisma.enquiry.update({
    where: { id },
    data,
    include: dashboardEnquiryInclude,
  });

export const listQuotesPaginated = async (filters: LeadListFilters) => {
  const where = buildQuoteWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.quoteRequest.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardQuoteInclude,
    }),
    prisma.quoteRequest.count({ where }),
  ]);

  return { items, total };
};

export const findQuoteById = (id: string) =>
  prisma.quoteRequest.findUnique({
    where: { id },
    include: dashboardQuoteInclude,
  });

export const updateQuoteById = (
  id: string,
  data: Prisma.QuoteRequestUpdateInput,
) =>
  prisma.quoteRequest.update({
    where: { id },
    data,
    include: dashboardQuoteInclude,
  });
