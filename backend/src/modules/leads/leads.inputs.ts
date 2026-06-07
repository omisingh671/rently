import type { LeadStatus } from "@/generated/prisma/enums.js";

export interface DashboardPaginationInput {
  page: number;
  limit: number;
}

export interface DashboardLeadListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  status?: LeadStatus;
  source?: string;
}

export interface UpdateDashboardLeadInput {
  status: LeadStatus;
}
