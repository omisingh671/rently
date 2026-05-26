import { z } from "zod";
import {
  BillingDocumentStatus,
  BillingDocumentType,
} from "@/generated/prisma/enums.js";

const idSchema = z.string().uuid();
const optionalString = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null).nullable().optional();

export const billingDocumentIdParamsSchema = z.object({
  id: idSchema,
});

export const billingPropertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

export const listBillingDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  propertyId: idSchema.optional(),
  type: z.nativeEnum(BillingDocumentType).optional(),
  status: z.nativeEnum(BillingDocumentStatus).optional(),
  bookingRef: z.string().trim().min(1).max(80).optional(),
  guest: z.string().trim().min(1).max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const generateInvoiceSchema = z.object({
  bookingId: idSchema,
});

export const generateReceiptSchema = z.object({
  paymentId: idSchema,
});

export const voidBillingDocumentSchema = z.object({
  reason: z.string().trim().min(1).max(1000).optional(),
});

export const updateBillingSettingSchema = z.object({
  legalName: optionalString(190),
  gstin: optionalString(32),
  pan: optionalString(32),
  billingAddress: optionalString(2000),
  invoicePrefix: z.string().trim().min(1).max(20).optional(),
  receiptPrefix: z.string().trim().min(1).max(20).optional(),
  creditNotePrefix: z.string().trim().min(1).max(20).optional(),
  footerNotes: optionalString(2000),
});

export const publicBillingDocumentsQuerySchema = z.object({
  checkoutToken: z.string().uuid().optional(),
});
