import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/common/utils/password.js";
import {
  BookingStatus,
  BookingTargetType,
  DiscountType,
  LeadStatus,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  TaxType,
  TenantStatus,
  UnitStatus,
  UserRole,
} from "../src/generated/prisma/client.js";

const credentials = {
  superAdmin: {
    email: "superadmin@sucasa.com",
    password: "SuperAdmin@123",
  },
  admin: {
    email: "admin@sucasa.com",
    password: "Admin@123",
  },
  manager: {
    email: "manager@sucasa.com",
    password: "Manager@123",
  },
  guest: {
    email: "guest@sucasa.com",
    password: "Guest@123",
  },
} as const;

async function clearExistingSeedData() {
  await prisma.$transaction([
    prisma.bookingStatusHistory.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.bookingItem.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.quoteRequest.deleteMany(),
    prisma.enquiry.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.tax.deleteMany(),
    prisma.maintenanceBlock.deleteMany(),
    prisma.roomPricing.deleteMany(),
    prisma.roomAmenity.deleteMany(),
    prisma.unitAmenity.deleteMany(),
    prisma.propertyAmenity.deleteMany(),
    prisma.amenity.deleteMany(),
    prisma.room.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.roomProduct.deleteMany(),
    prisma.propertyAssignment.deleteMany(),
    prisma.property.deleteMany(),
    prisma.tenant.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await clearExistingSeedData();

  const [superAdminHash, adminHash, managerHash, guestHash] =
    await Promise.all([
      hashPassword(credentials.superAdmin.password),
      hashPassword(credentials.admin.password),
      hashPassword(credentials.manager.password),
      hashPassword(credentials.guest.password),
    ]);

  const superAdmin = await prisma.user.create({
    data: {
      fullName: "Sucasa Super Admin",
      email: credentials.superAdmin.email,
      passwordHash: superAdminHash,
      role: UserRole.SUPER_ADMIN,
      countryCode: "+91",
      contactNumber: "9000000001",
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: "Sucasa Admin",
      email: credentials.admin.email,
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      createdByUserId: superAdmin.id,
      countryCode: "+91",
      contactNumber: "9000000002",
    },
  });

  const manager = await prisma.user.create({
    data: {
      fullName: "Sucasa Manager",
      email: credentials.manager.email,
      passwordHash: managerHash,
      role: UserRole.MANAGER,
      createdByUserId: admin.id,
      countryCode: "+91",
      contactNumber: "9000000003",
    },
  });

  const guest = await prisma.user.create({
    data: {
      fullName: "Demo Guest",
      email: credentials.guest.email,
      passwordHash: guestHash,
      role: UserRole.GUEST,
      countryCode: "+91",
      contactNumber: "9000000004",
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: "Sucasa Homes",
      slug: "sucasa",
      status: TenantStatus.ACTIVE,
      brandName: "Sucasa Homes",
      primaryColor: "#4f46e5",
      secondaryColor: "#f59e0b",
      supportEmail: "support@sucasa.com",
      supportPhone: "+919000000000",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: "Sucasa Homes Hyderabad",
      address: "Hitech City, Madhapur",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      isActive: true,
      createdByUserId: superAdmin.id,
    },
  });

  await prisma.propertyAssignment.createMany({
    data: [
      {
        propertyId: property.id,
        userId: admin.id,
        role: PropertyAssignmentRole.ADMIN,
        assignedByUserId: superAdmin.id,
      },
      {
        propertyId: property.id,
        userId: manager.id,
        role: PropertyAssignmentRole.MANAGER,
        assignedByUserId: admin.id,
      },
    ],
  });

  const amenities = await Promise.all(
    [
      { name: "Wi-Fi", icon: "FiWifi" },
      { name: "Kitchen", icon: "FiHome" },
      { name: "Power Backup", icon: "FiZap" },
    ].map((amenity) =>
      prisma.amenity.create({
        data: {
          propertyId: property.id,
          name: amenity.name,
          icon: amenity.icon,
        },
      }),
    ),
  );

  await prisma.propertyAmenity.createMany({
    data: amenities.map((amenity) => ({
      propertyId: property.id,
      amenityId: amenity.id,
    })),
  });

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: "A-101",
      floor: 1,
      status: UnitStatus.ACTIVE,
      isActive: true,
    },
  });

  await prisma.unitAmenity.createMany({
    data: amenities.map((amenity) => ({
      unitId: unit.id,
      amenityId: amenity.id,
    })),
  });

  const room = await prisma.room.create({
    data: {
      unitId: unit.id,
      name: "Deluxe Room",
      number: "101",
      rent: 2200,
      hasAC: true,
      maxOccupancy: 2,
      status: RoomStatus.AVAILABLE,
      isActive: true,
    },
  });

  await prisma.roomAmenity.createMany({
    data: amenities.map((amenity) => ({
      roomId: room.id,
      amenityId: amenity.id,
    })),
  });

  const product = await prisma.roomProduct.create({
    data: {
      propertyId: property.id,
      name: "Deluxe Double Room",
      occupancy: 2,
      hasAC: true,
      category: RoomProductCategory.NIGHTLY,
    },
  });

  const pricing = await prisma.roomPricing.create({
    data: {
      propertyId: property.id,
      roomId: room.id,
      unitId: unit.id,
      productId: product.id,
      rateType: RateType.NIGHTLY,
      pricingTier: PricingTier.STANDARD,
      minNights: 1,
      taxInclusive: false,
      price: 2200,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await prisma.tax.create({
    data: {
      propertyId: property.id,
      name: "GST",
      rate: 12,
      taxType: TaxType.PERCENTAGE,
      appliesTo: "ROOM",
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      propertyId: property.id,
      code: "WELCOME10",
      name: "Welcome discount",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxUses: 100,
      minNights: 1,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
    },
  });

  await prisma.booking.create({
    data: {
      bookingRef: "SCH-2026-SEED000001",
      propertyId: property.id,
      userId: guest.id,
      productId: product.id,
      targetType: BookingTargetType.ROOM,
      unitId: unit.id,
      roomId: room.id,
      guestNameSnapshot: guest.fullName,
      guestEmailSnapshot: guest.email,
      guestContactSnapshot: guest.contactNumber,
      targetLabel: "Deluxe Room 101",
      productName: product.name,
      pricePerNight: pricing.price,
      checkIn: new Date("2026-05-15T00:00:00.000Z"),
      checkOut: new Date("2026-05-17T00:00:00.000Z"),
      status: BookingStatus.CONFIRMED,
      totalAmount: 4400,
    },
  });

  await prisma.enquiry.create({
    data: {
      propertyId: property.id,
      name: "Demo Enquiry",
      email: "lead@sucasa.com",
      contactNumber: "9000000005",
      message: "Looking for a room next week.",
      source: "SEED",
      status: LeadStatus.NEW,
    },
  });

  await prisma.quoteRequest.create({
    data: {
      propertyId: property.id,
      userId: guest.id,
      productId: product.id,
      targetType: BookingTargetType.ROOM,
      unitId: unit.id,
      roomId: room.id,
      checkIn: new Date("2026-06-01T00:00:00.000Z"),
      checkOut: new Date("2026-06-08T00:00:00.000Z"),
      status: LeadStatus.NEW,
      notes: "Seeded weekly stay quote.",
    },
  });

  console.table([
    { app: "dashboard", role: "SUPER_ADMIN", ...credentials.superAdmin },
    { app: "dashboard", role: "ADMIN", ...credentials.admin },
    { app: "dashboard", role: "MANAGER", ...credentials.manager },
    { app: "frontend", role: "GUEST", ...credentials.guest },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
