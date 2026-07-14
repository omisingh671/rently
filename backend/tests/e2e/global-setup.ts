export default async function globalSetup() {
  const databaseName = process.env.E2E_DATABASE_NAME?.trim() ?? "";
  if (!/(audit|test|e2e)/i.test(databaseName)) {
    throw new Error("Refusing to seed without an isolated E2E_DATABASE_NAME");
  }

  process.env.DATABASE_NAME = databaseName;
  const { seedE2e, disconnectE2eSeed } = await import(
    "../../scripts/seed-e2e.js"
  );

  try {
    await seedE2e();
  } finally {
    await disconnectE2eSeed();
  }
}
