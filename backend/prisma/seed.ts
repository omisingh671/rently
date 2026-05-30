import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/common/utils/password.js";
import { UserRole } from "../src/generated/prisma/client.js";

const requiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required seed env variable: ${key}`);
  }

  return value;
};

const credentials = {
  superAdmin: {
    fullName: requiredEnv("SEED_SUPER_ADMIN_FULL_NAME"),
    email: requiredEnv("SEED_SUPER_ADMIN_EMAIL"),
    password: requiredEnv("SEED_SUPER_ADMIN_PASSWORD"),
    countryCode: requiredEnv("SEED_SUPER_ADMIN_COUNTRY_CODE"),
    contactNumber: requiredEnv("SEED_SUPER_ADMIN_CONTACT_NUMBER"),
  },
} as const;

const seededAmenities = [
  { name: "24x7 Security", icon: "FiCamera" },
  { name: "AC", icon: "FiWind" },
  { name: "Balcony", icon: "FiNavigation" },
  { name: "Dining Area", icon: "FiCoffee" },
  { name: "Fast Wi-Fi", icon: "FiWifi" },
  { name: "Fully Furnished", icon: "MdChair" },
  { name: "Gated Community", icon: "FiShield" },
  { name: "House Keeping", icon: "MdCleaningServices" },
  { name: "Lift Access", icon: "FiArrowUp" },
  { name: "Modular Kitchen", icon: "MdKitchen" },
  { name: "Parking", icon: "FaParking" },
  { name: "Power Backup", icon: "FiZap" },
  { name: "Regular Maintenance", icon: "MdBuild" },
  { name: "RO Water", icon: "MdWaterDrop" },
  { name: "Wardrobe", icon: "MdDoorFront" },
] as const satisfies ReadonlyArray<{
  name: string;
  icon: string;
}>;

const findSeedSuperAdmin = async () => {
  const superAdminByEmail = await prisma.user.findFirst({
    where: {
      email: credentials.superAdmin.email,
      role: UserRole.SUPER_ADMIN,
    },
  });

  if (superAdminByEmail) {
    return superAdminByEmail;
  }

  return prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
    orderBy: { createdAt: "asc" },
  });
};

async function main() {
  const superAdminHash = await hashPassword(credentials.superAdmin.password);
  const existingSuperAdmin = await findSeedSuperAdmin();
  const emailOwner = await prisma.user.findUnique({
    where: { email: credentials.superAdmin.email },
  });

  if (
    emailOwner &&
    (!existingSuperAdmin || emailOwner.id !== existingSuperAdmin.id)
  ) {
    throw new Error(
      `Cannot seed SUPER_ADMIN with email ${credentials.superAdmin.email}: email is already used by another user.`,
    );
  }

  const superAdminData = {
    fullName: credentials.superAdmin.fullName,
    email: credentials.superAdmin.email,
    passwordHash: superAdminHash,
    role: UserRole.SUPER_ADMIN,
    countryCode: credentials.superAdmin.countryCode,
    contactNumber: credentials.superAdmin.contactNumber,
    isActive: true,
  };

  if (existingSuperAdmin) {
    await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        ...superAdminData,
        createdByUserId: null,
      },
    });
  } else {
    await prisma.user.create({
      data: superAdminData,
    });
  }

  await Promise.all(
    seededAmenities.map((amenity) =>
      prisma.amenity.upsert({
        where: { name: amenity.name },
        update: {
          icon: amenity.icon,
          isActive: true,
        },
        create: {
          name: amenity.name,
          icon: amenity.icon,
          isActive: true,
        },
      }),
    ),
  );

  console.table([
    { app: "dashboard", role: "SUPER_ADMIN", ...credentials.superAdmin },
  ]);
  console.log(`Seeded ${seededAmenities.length} amenities.`);
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
