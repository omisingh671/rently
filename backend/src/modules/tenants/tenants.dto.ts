import type { TenantStatus } from "@/generated/prisma/enums.js";

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  primaryDomain: string | null;
  status: TenantStatus;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultCurrency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
