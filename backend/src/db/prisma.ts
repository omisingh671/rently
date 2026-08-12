import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "@/config/database-url.js";
import { PrismaClient } from "../generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaMariaDb(parseDatabaseUrl(databaseUrl));

export const prisma = new PrismaClient({ adapter });
