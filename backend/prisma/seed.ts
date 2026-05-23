import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/common/utils/password.js";
import { UserRole } from "../src/generated/prisma/client.js";

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

async function main() {
  const [superAdminHash, adminHash, managerHash, guestHash] = await Promise.all(
    [
      hashPassword(credentials.superAdmin.password),
      hashPassword(credentials.admin.password),
      hashPassword(credentials.manager.password),
      hashPassword(credentials.guest.password),
    ],
  );

  const superAdmin = await prisma.user.upsert({
    where: { email: credentials.superAdmin.email },
    update: {
      fullName: "Sucasa Super Admin",
      passwordHash: superAdminHash,
      role: UserRole.SUPER_ADMIN,
      createdByUserId: null,
      countryCode: "+91",
      contactNumber: "9000000001",
      isActive: true,
    },
    create: {
      fullName: "Sucasa Super Admin",
      email: credentials.superAdmin.email,
      passwordHash: superAdminHash,
      role: UserRole.SUPER_ADMIN,
      countryCode: "+91",
      contactNumber: "9000000001",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: credentials.admin.email },
    update: {
      fullName: "Sucasa Admin",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      createdByUserId: superAdmin.id,
      countryCode: "+91",
      contactNumber: "9000000002",
      isActive: true,
    },
    create: {
      fullName: "Sucasa Admin",
      email: credentials.admin.email,
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      createdByUserId: superAdmin.id,
      countryCode: "+91",
      contactNumber: "9000000002",
    },
  });

  await prisma.user.upsert({
    where: { email: credentials.manager.email },
    update: {
      fullName: "Sucasa Manager",
      passwordHash: managerHash,
      role: UserRole.MANAGER,
      createdByUserId: admin.id,
      countryCode: "+91",
      contactNumber: "9000000003",
      isActive: true,
    },
    create: {
      fullName: "Sucasa Manager",
      email: credentials.manager.email,
      passwordHash: managerHash,
      role: UserRole.MANAGER,
      createdByUserId: admin.id,
      countryCode: "+91",
      contactNumber: "9000000003",
    },
  });

  await prisma.user.upsert({
    where: { email: credentials.guest.email },
    update: {
      fullName: "Demo Guest",
      passwordHash: guestHash,
      role: UserRole.GUEST,
      createdByUserId: null,
      countryCode: "+91",
      contactNumber: "9000000004",
      isActive: true,
    },
    create: {
      fullName: "Demo Guest",
      email: credentials.guest.email,
      passwordHash: guestHash,
      role: UserRole.GUEST,
      countryCode: "+91",
      contactNumber: "9000000004",
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
