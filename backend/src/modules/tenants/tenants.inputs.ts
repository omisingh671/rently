import type { TenantStatus } from "@/generated/prisma/enums.js";

export interface TenantListInput {
  page: number;
  limit: number;
  search?: string;
  status?: TenantStatus;
}

export interface CreateTenantInput {
  name: string;
  slug?: string;
  primaryDomain?: string;
  status?: TenantStatus;
  brandName: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultCurrency?: string;
  timezone?: string;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  primaryDomain?: string | null;
  status?: TenantStatus;
  brandName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  defaultCurrency?: string;
  timezone?: string;
}
