import { z } from "zod";
import {
  BookingRefundRequestStatus,
  BookingStatus,
  ComfortOption,
  DiscountType,
  LeadStatus,
  MaintenanceTargetType,
  PaymentMethod,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  TenantStatus,
  TaxCalculationMode,
  TaxCategory,
  TaxDiscountTreatment,
  TaxScope,
  TaxTargetType,
  TaxType,
  UnitStatus,
  UserRole,
} from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const countryCodeSchema = z
  .string()
  .regex(/^\+\d{1,4}$/, "Invalid country code");

const contactNumberSchema = z
  .string()
  .regex(/^\d{6,15}$/, "Invalid contact number");

const optionalBooleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true")
  .optional();

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const contactFieldsRefine = <
  T extends {
    countryCode?: string | undefined;
    contactNumber?: string | undefined;
  },
>(
  schema: z.ZodType<T>,
) =>
  schema.refine(
    (data) =>
      (data.countryCode === undefined && data.contactNumber === undefined) ||
      (data.countryCode !== undefined && data.contactNumber !== undefined),
    { message: "Both countryCode and contactNumber are required together" },
  );

export const idParamsSchema = z.object({
  id: idSchema,
});

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

export const listPropertiesQuerySchema = basePaginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listTenantsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(TenantStatus).optional(),
});

export const listUsersQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listAllUsersQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: optionalBooleanQuerySchema,
  mustChangePassword: optionalBooleanQuerySchema,
});

export const listSessionsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  userId: idSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["active", "expired"]).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.GUEST]),
});

export const updateForcePasswordChangeSchema = z.object({
  mustChangePassword: z.boolean(),
});

export const listAssignmentsQuerySchema = basePaginationQuerySchema.extend({
  propertyId: idSchema.optional(),
  role: z.nativeEnum(PropertyAssignmentRole).optional(),
});

export const listAmenitiesQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listUnitsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listRoomsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listMaintenanceQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  targetType: z.nativeEnum(MaintenanceTargetType).optional(),
});

export const listRoomProductsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  category: z.nativeEnum(RoomProductCategory).optional(),
});

export const listRoomPricingQuerySchema = basePaginationQuerySchema.extend({
  productId: idSchema.optional(),
  rateType: z.nativeEnum(RateType).optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
});

export const listTaxesQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  taxType: z.nativeEnum(TaxType).optional(),
  category: z.nativeEnum(TaxCategory).optional(),
  scope: z.nativeEnum(TaxScope).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listCouponsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  discountType: z.nativeEnum(DiscountType).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const listBookingsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
});

export const listLeadsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.string().trim().min(1).max(80).optional(),
});

export const createPropertySchema = z.object({
  tenantId: idSchema,
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  status: z.nativeEnum(PropertyStatus).optional(),
  images: z.array(z.string().url()).optional(),
});

export const updatePropertySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    tenantId: idSchema.optional(),
    address: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    state: z.string().trim().min(1).max(80).optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    isActive: z.boolean().optional(),
    images: z.array(z.string().url()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });


const nullableOptionalString = (max: number) =>
  z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

export const createTenantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  primaryDomain: nullableOptionalString(190),
  status: z.nativeEnum(TenantStatus).optional(),
  brandName: z.string().trim().min(1).max(120),
  logoUrl: nullableOptionalString(500),
  primaryColor: colorSchema.optional(),
  secondaryColor: colorSchema.optional(),
  supportEmail: nullableOptionalString(190),
  supportPhone: nullableOptionalString(40),
  defaultCurrency: z.string().trim().min(3).max(3).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export const updateTenantSchema = createTenantSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const bookingPolicyRulesSchema = z.record(z.string(), z.unknown());

export const updateBookingPolicySchema = z.object({
  advancePaymentType: z.enum(["NONE", "FIXED_AMOUNT", "PERCENTAGE"]),
  advancePaymentValue: z.number().nonnegative(),
  tokenRefundable: z.boolean(),
  cancellationRules: bookingPolicyRulesSchema,
  refundRules: bookingPolicyRulesSchema,
  earlyCheckoutRules: bookingPolicyRulesSchema,
  noShowRules: bookingPolicyRulesSchema,
  guestPolicyText: z.string().trim().min(1).max(5000),
});

export const createDashboardUserSchema = contactFieldsRefine(
  z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    password: z.string().min(8),
    countryCode: countryCodeSchema.optional(),
    contactNumber: contactNumberSchema.optional(),
  }),
);

export const updateDashboardUserSchema = contactFieldsRefine(
  z
    .object({
      fullName: z.string().trim().min(1).max(120).optional(),
      isActive: z.boolean().optional(),
      countryCode: countryCodeSchema.optional(),
      contactNumber: contactNumberSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
);

export const createAssignmentSchema = z.object({
  propertyId: idSchema,
  userId: idSchema,
  role: z.nativeEnum(PropertyAssignmentRole),
});

export const createAmenitySchema = z.object({
  name: z.string().trim().min(1).max(120),
  icon: z.string().trim().min(1).max(120).optional(),
});

export const updateAmenitySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    icon: z.string().trim().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const replacePropertyAmenityAssignmentsSchema = z.object({
  amenityIds: z.array(idSchema),
});

export const createUnitSchema = z.object({
  unitNumber: z.string().trim().min(1).max(50),
  floor: z.number().int().min(0),
  status: z.nativeEnum(UnitStatus).optional(),
  amenityIds: z.array(idSchema).optional(),
});

export const updateUnitSchema = z
  .object({
    unitNumber: z.string().trim().min(1).max(50).optional(),
    floor: z.number().int().min(0).optional(),
    status: z.nativeEnum(UnitStatus).optional(),
    isActive: z.boolean().optional(),
    amenityIds: z.array(idSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createRoomSchema = z.object({
  unitId: idSchema,
  name: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(50),
  hasAC: z.boolean().optional(),
  maxOccupancy: z.number().int().min(1).max(10).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  amenityIds: z.array(idSchema).optional(),
});

export const updateRoomSchema = z
  .object({
    unitId: idSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    number: z.string().trim().min(1).max(50).optional(),
    hasAC: z.boolean().optional(),
    maxOccupancy: z.number().int().min(1).max(10).optional(),
    status: z.nativeEnum(RoomStatus).optional(),
    isActive: z.boolean().optional(),
    amenityIds: z.array(idSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createMaintenanceSchema = z
  .object({
    targetType: z.nativeEnum(MaintenanceTargetType),
    unitId: idSchema.optional(),
    roomId: idSchema.optional(),
    reason: z.string().trim().max(500).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate cannot be before startDate",
      });
    }

    if (data.targetType === MaintenanceTargetType.UNIT && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "unitId is required for unit maintenance blocks",
      });
    }

    if (data.targetType === MaintenanceTargetType.ROOM && !data.roomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roomId"],
        message: "roomId is required for room maintenance blocks",
      });
    }
  });

export const updateMaintenanceSchema = z
  .object({
    targetType: z.nativeEnum(MaintenanceTargetType).optional(),
    unitId: idSchema.optional(),
    roomId: idSchema.optional(),
    reason: z.string().trim().max(500).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createRoomProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  occupancy: z.number().int().min(1).max(20),
  hasAC: z.boolean(),
  category: z.nativeEnum(RoomProductCategory),
});

export const updateRoomProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    occupancy: z.number().int().min(1).max(20).optional(),
    hasAC: z.boolean().optional(),
    category: z.nativeEnum(RoomProductCategory).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const optionalTargetSchema = z
  .object({
    unitId: idSchema.nullable().optional(),
    roomId: idSchema.nullable().optional(),
  })
  .refine((data) => !(data.unitId && data.roomId), {
    message: "Use either unitId or roomId, not both",
  });

export const createRoomPricingSchema = optionalTargetSchema.extend({
  productId: idSchema,
  rateType: z.nativeEnum(RateType).optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
  minNights: z.number().int().min(1).optional(),
  maxNights: z.number().int().min(1).optional(),
  taxInclusive: z.boolean().optional(),
  price: z.number().positive(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
}).superRefine((data, ctx) => {
  if (data.maxNights !== undefined && data.minNights !== undefined) {
    if (data.maxNights < data.minNights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxNights"],
        message: "maxNights must be greater than or equal to minNights",
      });
    }
  }

  if (data.validTo !== undefined && data.validTo < data.validFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validTo"],
      message: "validTo must be on or after validFrom",
    });
  }
});

export const updateRoomPricingSchema = optionalTargetSchema.extend({
  productId: idSchema.optional(),
  rateType: z.nativeEnum(RateType).optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
  minNights: z.number().int().min(1).optional(),
  maxNights: z.number().int().min(1).optional(),
  taxInclusive: z.boolean().optional(),
  price: z.number().positive().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const createTaxSchema = z.object({
  name: z.string().trim().min(1).max(120),
  rate: z.number().nonnegative(),
  taxType: z.nativeEnum(TaxType).optional(),
  category: z.nativeEnum(TaxCategory).optional(),
  scope: z.nativeEnum(TaxScope).optional(),
  targetType: z.nativeEnum(TaxTargetType).optional(),
  calculationMode: z.nativeEnum(TaxCalculationMode).optional(),
  discountTreatment: z.nativeEnum(TaxDiscountTreatment).optional(),
  minTariff: z.number().nonnegative().nullable().optional(),
  maxTariff: z.number().positive().nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
  priority: z.number().int().optional(),
  appliesTo: z.string().trim().min(1).max(120).optional(),
  isRefundable: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.calculationMode === TaxCalculationMode.FLAT) {
    if (data.minTariff !== undefined && data.minTariff !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minTariff"],
        message: "minTariff is not used for flat tax rules",
      });
    }

    if (data.maxTariff !== undefined && data.maxTariff !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxTariff"],
        message: "maxTariff is not used for flat tax rules",
      });
    }
  }

  if (
    data.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
    (data.minTariff === undefined || data.minTariff === null)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minTariff"],
      message: "minTariff is required for slab tax rules",
    });
  }

  if (
    data.minTariff !== undefined &&
    data.minTariff !== null &&
    data.maxTariff !== undefined &&
    data.maxTariff !== null &&
    data.maxTariff <= data.minTariff
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxTariff"],
      message: "maxTariff must be greater than minTariff",
    });
  }

  if (
    data.validFrom !== undefined &&
    data.validFrom !== null &&
    data.validTo !== undefined &&
    data.validTo !== null &&
    data.validTo < data.validFrom
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validTo"],
      message: "validTo must be on or after validFrom",
    });
  }
});

export const updateTaxSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    rate: z.number().nonnegative().optional(),
    taxType: z.nativeEnum(TaxType).optional(),
    category: z.nativeEnum(TaxCategory).optional(),
    scope: z.nativeEnum(TaxScope).optional(),
    targetType: z.nativeEnum(TaxTargetType).optional(),
    calculationMode: z.nativeEnum(TaxCalculationMode).optional(),
    discountTreatment: z.nativeEnum(TaxDiscountTreatment).optional(),
    minTariff: z.number().nonnegative().nullable().optional(),
    maxTariff: z.number().positive().nullable().optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    priority: z.number().int().optional(),
    appliesTo: z.string().trim().min(1).max(120).optional(),
    isRefundable: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.calculationMode === TaxCalculationMode.FLAT) {
      if (data.minTariff !== undefined && data.minTariff !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minTariff"],
          message: "minTariff is not used for flat tax rules",
        });
      }

      if (data.maxTariff !== undefined && data.maxTariff !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxTariff"],
          message: "maxTariff is not used for flat tax rules",
        });
      }
    }

    if (
      data.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
      data.minTariff === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minTariff"],
        message: "minTariff is required for slab tax rules",
      });
    }

    if (
      data.minTariff !== undefined &&
      data.minTariff !== null &&
      data.maxTariff !== undefined &&
      data.maxTariff !== null &&
      data.maxTariff <= data.minTariff
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxTariff"],
        message: "maxTariff must be greater than minTariff",
      });
    }

    if (
      data.validFrom !== undefined &&
      data.validFrom !== null &&
      data.validTo !== undefined &&
      data.validTo !== null &&
      data.validTo < data.validFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be on or after validFrom",
      });
    }
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(120),
    discountType: z.nativeEnum(DiscountType).optional(),
    discountValue: z.number().positive(),
    maxUses: z.number().int().positive().optional(),
    minNights: z.number().int().positive().optional(),
    minAmount: z.number().positive().optional(),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    oncePerUser: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.validTo !== undefined && data.validTo < data.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be on or after validFrom",
      });
    }
  });

export const updateCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    discountType: z.nativeEnum(DiscountType).optional(),
    discountValue: z.number().positive().optional(),
    maxUses: z.number().int().positive().optional(),
    minNights: z.number().int().positive().optional(),
    minAmount: z.number().positive().optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    oncePerUser: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const updateBookingStatusSchema = z
  .object({
    status: z.nativeEnum(BookingStatus).optional(),
    internalNotes: z.string().trim().max(5000).nullable().optional(),
    note: z.string().trim().max(1000).optional(),
    roomId: idSchema.optional(),
    statusOverride: z.boolean().optional(),
    allowBalanceDueCheckIn: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.internalNotes !== undefined ||
      data.roomId !== undefined,
    {
      message: "Status, assignment, or internal notes are required",
    },
  );

export const recordBookingPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  note: z.string().trim().max(1000).optional(),
  paidAt: z.coerce.date().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const recordBookingRefundSchema = z.object({
  paymentId: idSchema,
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  reason: z.string().trim().min(1).max(1000),
  refundRequestId: idSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const refundRequestParamsSchema = z.object({
  id: idSchema,
  requestId: idSchema,
});

export const updateRefundRequestSchema = z
  .object({
    status: z
      .enum([
        BookingRefundRequestStatus.IN_REVIEW,
        BookingRefundRequestStatus.REJECTED,
      ])
      .optional(),
    adminNote: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.adminNote !== undefined, {
    message: "Status or admin note is required",
  })
  .refine(
    (data) =>
      data.status !== BookingRefundRequestStatus.REJECTED ||
      Boolean(data.adminNote?.trim()),
    {
      message: "Admin note is required when rejecting a refund request",
      path: ["adminNote"],
    },
  );

export const createManualBookingSchema = contactFieldsRefine(
  z
    .object({
      bookingType: z.enum(["SINGLE_TARGET", "MULTI_ROOM"]).default("SINGLE_TARGET"),
      bookingOptionId: z.string().trim().min(1).max(128).optional(),
      spaceId: idSchema.optional(),
      spaceIds: z.array(idSchema).optional(),
      from: z.coerce.date(),
      to: z.coerce.date(),
      guests: z.coerce.number().int().min(1).max(20),
      comfortOption: z.nativeEnum(ComfortOption),
      couponCode: z.string().trim().min(1).max(20).optional(),
      guestName: z.string().trim().min(1).max(120),
      guestEmail: z.string().trim().email().max(190),
      countryCode: countryCodeSchema.optional(),
      contactNumber: contactNumberSchema.optional(),
      internalNotes: z.string().trim().max(5000).nullable().optional(),
    })
    .refine((data) => data.to > data.from, {
      message: "Check-out must be after check-in",
      path: ["to"],
    })
    .superRefine((data, ctx) => {
      if (data.bookingOptionId) {
        return;
      }

      if (data.bookingType === "MULTI_ROOM") {
        if (!data.spaceIds || data.spaceIds.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least two spaces are required for a multi-room booking",
            path: ["spaceIds"],
          });
        }
        return;
      }

      if (!data.spaceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "spaceId is required",
          path: ["spaceId"],
        });
      }
    }),
);

export const checkManualBookingAvailabilitySchema = z
  .object({
    spaceIds: z.array(idSchema).optional(),
    from: z.coerce.date(),
    to: z.coerce.date(),
    guests: z.coerce.number().int().min(1).max(20),
    comfortOption: z.nativeEnum(ComfortOption),
  })
  .refine((data) => data.to > data.from, {
    message: "Check-out must be after check-in",
    path: ["to"],
  });

export const roomBoardQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.to > data.from, {
    message: "End date must be after start date",
    path: ["to"],
  });

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});
