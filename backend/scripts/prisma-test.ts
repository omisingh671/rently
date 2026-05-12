import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  console.log("🔌 Testing Prisma connection...");

  /* =========================
     RAW CONNECTION TEST
  ========================= */

  const result = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
  console.log("✅ Raw query result:", result);

  /* =========================
     MODEL HEALTH CHECKS
  ========================= */

  const [userCount, propertyCount, amenityCount] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.amenity.count(),
  ]);

  console.log("📦 Users count:", userCount);
  console.log("🏢 Properties count:", propertyCount);
  console.log("🧩 Amenities count:", amenityCount);

  /* =========================
     SAMPLE RECORD CHECK
  ========================= */

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  console.log("👤 Sample admin:", admin ?? "None found");

  console.log("✅ Prisma test completed successfully");
}

main()
  .catch((error) => {
    console.error("❌ Prisma test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
