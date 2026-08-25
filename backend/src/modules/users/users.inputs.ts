export interface UpdateUserInput {
  fullName?: string | undefined;
  countryCode?: string | undefined;
  contactNumber?: string | undefined;
}

export interface CreateDashboardUserInput {
  fullName: string;
  email: string;
  password: string;
  countryCode?: string;
  contactNumber?: string;
}

export interface CreateDashboardTeamUserInput extends CreateDashboardUserInput {
  role: "MANAGER" | "FRONT_DESK" | "ACCOUNTANT";
}

export interface UpdateDashboardUserInput {
  fullName?: string;
  isActive?: boolean;
  countryCode?: string;
  contactNumber?: string;
}

export interface UpdateDashboardUserStatusInput {
  isActive: boolean;
}

export interface UpdateDashboardUserRoleInput {
  role: "ADMIN" | "MANAGER" | "FRONT_DESK" | "ACCOUNTANT" | "GUEST";
}

export interface UpdateDashboardForcePasswordChangeInput {
  mustChangePassword: boolean;
}
