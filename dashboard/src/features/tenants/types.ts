export type TenantStatus = "ACTIVE" | "INACTIVE";

export type AdminTenant = {
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
  payAtCheckInEnabled: boolean;
  bookingTokenAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantFormPayload = {
  name: string;
  slug?: string;
  primaryDomain?: string | null;
  status?: TenantStatus;
  brandName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  defaultCurrency?: string;
  timezone?: string;
  payAtCheckInEnabled?: boolean;
  bookingTokenAmount?: number;
};

export type TenantUpdateVariables = {
  tenantId: string;
  payload: Partial<TenantFormPayload>;
};
