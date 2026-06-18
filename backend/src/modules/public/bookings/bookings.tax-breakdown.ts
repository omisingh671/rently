import { Prisma } from "@/generated/prisma/client.js";
import type { PublicTaxBreakdownDTO } from "./bookings.dto.js";

const isTaxBreakdown = (value: unknown): value is PublicTaxBreakdownDTO[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "taxId" in item &&
      "name" in item &&
      "taxAmount" in item,
  );

export const getBookingTaxBreakdown = (
  value: Prisma.JsonValue | null,
): PublicTaxBreakdownDTO[] => (isTaxBreakdown(value) ? value : []);

export const toTaxBreakdownJson = (
  breakdown: PublicTaxBreakdownDTO[],
): Prisma.InputJsonValue => breakdown as unknown as Prisma.InputJsonValue;
