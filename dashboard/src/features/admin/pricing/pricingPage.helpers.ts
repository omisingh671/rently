import { z } from "zod";
import type { AdminRoomPricing } from "./types";

export type Tab = "products" | "rates" | "taxes" | "coupons";

export const productSchema = z.object({
  name: z.string().trim().min(1),
  occupancy: z.number().int().min(1),
  hasAC: z.boolean(),
  category: z.enum(["NIGHTLY", "LONG_STAY", "CORPORATE"]),
});

export const rateSchema = z
  .object({
    productId: z.string().min(1),
    targetType: z.enum(["PROPERTY", "UNIT", "ROOM"]),
    unitId: z.string().optional(),
    roomId: z.string().optional(),
    rateType: z.enum(["NIGHTLY", "WEEKLY", "MONTHLY"]),
    pricingTier: z.enum(["STANDARD", "CORPORATE", "SEASONAL"]),
    minNights: z.number().int().min(1),
    maxNights: z.number().int().min(1).optional(),
    taxInclusive: z.boolean(),
    price: z.number().positive(),
    validFrom: z.string().min(1),
    validTo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "UNIT" && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "Unit is required",
      });
    }

    if (data.targetType === "ROOM" && !data.roomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roomId"],
        message: "Room is required",
      });
    }

    if (data.maxNights !== undefined && data.maxNights < data.minNights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxNights"],
        message: "Max nights must be greater than min nights",
      });
    }
  });

export const taxSchema = z.object({
  name: z.string().trim().min(1),
  rate: z.number().nonnegative(),
  taxType: z.enum(["PERCENTAGE", "FIXED"]),
  appliesTo: z.string().trim().min(1),
  isActive: z.boolean(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  minNights: z.number().int().positive().optional(),
  minAmount: z.number().positive().optional(),
  validFrom: z.string().min(1),
  validTo: z.string().optional(),
  isActive: z.boolean(),
});

export type ProductForm = z.input<typeof productSchema>;
export type RateForm = z.input<typeof rateSchema>;
export type TaxForm = z.input<typeof taxSchema>;
export type CouponForm = z.input<typeof couponSchema>;

export const tabs: Array<{ key: Tab; label: string }> = [
  { key: "products", label: "Rate Products" },
  { key: "rates", label: "Price Rules / Rates" },
  { key: "taxes", label: "Taxes" },
  { key: "coupons", label: "Coupons" },
];

export const dateInput = (value: string | null) => value?.slice(0, 10) ?? "";

export const emptyProduct: ProductForm = {
  name: "",
  occupancy: 1,
  hasAC: false,
  category: "NIGHTLY",
};

export const emptyRate: RateForm = {
  productId: "",
  targetType: "PROPERTY",
  unitId: "",
  roomId: "",
  rateType: "NIGHTLY",
  pricingTier: "STANDARD",
  minNights: 1,
  maxNights: undefined,
  taxInclusive: false,
  price: 1,
  validFrom: "",
  validTo: "",
};

export const emptyTax: TaxForm = {
  name: "",
  rate: 0,
  taxType: "PERCENTAGE",
  appliesTo: "ALL",
  isActive: true,
};

export const emptyCoupon: CouponForm = {
  code: "",
  name: "",
  discountType: "PERCENTAGE",
  discountValue: 1,
  maxUses: undefined,
  minNights: undefined,
  minAmount: undefined,
  validFrom: "",
  validTo: "",
  isActive: true,
};

export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Open";

export const getRateTarget = (rate: AdminRoomPricing) => {
  if (rate.roomLabel) return `Room override: ${rate.roomLabel}`;
  if (rate.unitNumber) return `Unit override: ${rate.unitNumber}`;
  return "Property-wide";
};
