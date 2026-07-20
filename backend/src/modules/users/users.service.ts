import { hashPassword } from "@/common/utils/password.js";
import { HttpError } from "@/common/errors/http-error.js";
import { UserRole } from "@/generated/prisma/enums.js";
import { env } from "@/config/env.js";
import { queuePasswordResetEmail } from "@/modules/email-deliveries/email-deliveries.service.js";

import * as repo from "./users.repository.js";
import type {
  UserDTO,
  UserProfileDTO,
  UpdateUserDTO,
  UpdateUserProfileDTO,
  UserEntity,
  DashboardUserDTO,
} from "./users.dto.js";

import type {
  CreateUserInput,
  UpdateUserInput,
  CreateDashboardUserInput,
  CreateDashboardTeamUserInput,
  UpdateDashboardUserInput,
  UpdateDashboardUserStatusInput,
  UpdateDashboardUserRoleInput,
  UpdateDashboardForcePasswordChangeInput,
} from "./users.inputs.js";


interface ListUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  roles?: UserRole[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdByUserId?: string;
}

/**
 * Authorization and active checks helpers
 */
const assertRole = (actor: UserEntity, roles: readonly UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

const ensureActiveActor = (actor: UserEntity) => {
  if (!actor.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }
};

export const getActor = async (userId: string): Promise<UserEntity> => {
  const actor = await repo.findUserById(userId);
  if (!actor) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  ensureActiveActor(actor as UserEntity);
  return actor as UserEntity;
};

const ensureUniqueUserEmail = async (email: string) => {
  const existingUser = await repo.findUserByEmail(email);
  if (existingUser) {
    throw new HttpError(409, "EMAIL_EXISTS", "Email already registered");
  }
};

const ensureRoleManageable = (target: UserEntity) => {
  if (target.role === UserRole.SUPER_ADMIN) {
    throw new HttpError(
      403,
      "SUPER_ADMIN_ROLE_PROTECTED",
      "Super admin users cannot be changed from this screen",
    );
  }
};

type TeamUserRole = Extract<
  UserRole,
  "MANAGER" | "FRONT_DESK" | "ACCOUNTANT"
>;

const TEAM_USER_ROLES: TeamUserRole[] = [
  UserRole.MANAGER,
  UserRole.FRONT_DESK,
  UserRole.ACCOUNTANT,
];

const isTeamUserRole = (role: UserRole): role is TeamUserRole =>
  TEAM_USER_ROLES.includes(role as TeamUserRole);

/**
 * Public/General users endpoints
 */
export const listUsers = async ({
  page,
  limit,
  search,
  role,
  roles,
  isActive,
  mustChangePassword,
  createdByUserId,
}: ListUsersParams) => {
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;

  const { items, total } = await repo.listUsersPaginated(safePage, safeLimit, {
    ...(search !== undefined && { search }),
    ...((roles !== undefined || role !== undefined) && {
      roles: roles ?? [role as UserRole],
    }),
    ...(isActive !== undefined && { isActive }),
    ...(mustChangePassword !== undefined && { mustChangePassword }),
    ...(createdByUserId !== undefined && { createdByUserId }),
  });

  return {
    items: items.map(mapDashboardUser),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const createUser = async (data: CreateUserInput): Promise<UserDTO> => {
  const passwordHash = await hashPassword(data.password);

  const user = await repo.createUser({
    fullName: data.fullName,
    email: data.email,
    passwordHash,
    role: data.role,
    ...(data.countryCode !== undefined &&
      data.contactNumber !== undefined && {
        countryCode: data.countryCode,
        contactNumber: data.contactNumber,
      }),
  });

  return mapUser(user as UserEntity);
};

export const updateUser = async (
  id: string,
  data: UpdateUserInput,
): Promise<UserDTO> => {
  const existing = await repo.findUserById(id);
  if (!existing) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const normalized: UpdateUserDTO = {
    ...(data.fullName !== undefined && { fullName: data.fullName }),
    ...(data.role !== undefined && { role: data.role }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
    ...(data.countryCode !== undefined &&
      data.contactNumber !== undefined && {
        countryCode: data.countryCode,
        contactNumber: data.contactNumber,
      }),
  };

  if (Object.keys(normalized).length === 0) {
    throw new HttpError(
      400,
      "NO_VALID_FIELDS_TO_UPDATE",
      "No valid fields provided for update",
    );
  }

  const user = await repo.updateUserById(id, normalized);
  return mapUser(user as UserEntity);
};

export const deleteUser = async (id: string): Promise<void> => {
  const existing = await repo.findUserById(id);
  if (!existing) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  await repo.updateUserById(id, { isActive: false });
};

/**
 * Self profile
 */
export const getMyProfile = async (userId: string): Promise<UserProfileDTO> => {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return mapUser(user as UserEntity);
};

export const updateMyProfile = async (
  userId: string,
  data: UpdateUserInput,
): Promise<UserProfileDTO> => {
  const normalized: UpdateUserProfileDTO = {
    ...(data.fullName !== undefined && { fullName: data.fullName }),
    ...(data.countryCode !== undefined &&
      data.contactNumber !== undefined && {
        countryCode: data.countryCode,
        contactNumber: data.contactNumber,
      }),
  };

  if (Object.keys(normalized).length === 0) {
    throw new HttpError(
      400,
      "NO_VALID_FIELDS_TO_UPDATE",
      "No valid fields provided for update",
    );
  }

  const user = await repo.updateUserById(userId, normalized);
  return mapUser(user as UserEntity);
};

/**
 * Dashboard Admin Services
 */
export const listAdmins = async (
  userId: string,
  filters: Omit<ListUsersParams, "page" | "limit"> & { page: number; limit: number },
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  return listUsers({
    ...filters,
    role: UserRole.ADMIN,
  });
};

export const createAdmin = async (
  userId: string,
  input: CreateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);
  await ensureUniqueUserEmail(input.email);

  const passwordHash = await hashPassword(input.password);
  const admin = await repo.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    role: UserRole.ADMIN,
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapDashboardUser(admin as UserEntity);
};

export const updateAdmin = async (
  userId: string,
  adminId: string,
  input: UpdateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const admin = await repo.findUserById(adminId);
  if (!admin || admin.role !== UserRole.ADMIN) {
    throw new HttpError(404, "ADMIN_NOT_FOUND", "Admin not found");
  }

  const updatedAdmin = await repo.updateUserById(adminId, {
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapDashboardUser(updatedAdmin as UserEntity);
};

/**
 * Dashboard Team User Services
 */
export const listTeamUsers = async (
  userId: string,
  filters: Omit<ListUsersParams, "page" | "limit" | "roles"> & {
    page: number;
    limit: number;
    role?: TeamUserRole;
  },
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  const { role, ...listFilters } = filters;

  return listUsers({
    ...listFilters,
    roles: role ? [role] : TEAM_USER_ROLES,
    ...(actor.role === UserRole.ADMIN && {
      createdByUserId: actor.id,
    }),
  });
};

export const createTeamUser = async (
  userId: string,
  input: CreateDashboardTeamUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.ADMIN]);
  await ensureUniqueUserEmail(input.email);

  const passwordHash = await hashPassword(input.password);
  const teamUser = await repo.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    role: input.role as TeamUserRole,
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });

  return mapDashboardUser(teamUser as UserEntity);
};

export const updateTeamUser = async (
  userId: string,
  teamUserId: string,
  input: UpdateDashboardUserInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const teamUser = await repo.findUserById(teamUserId);
  if (!teamUser || !isTeamUserRole(teamUser.role)) {
    throw new HttpError(404, "TEAM_USER_NOT_FOUND", "Team user not found");
  }

  if (
    actor.role === UserRole.ADMIN &&
    teamUser.createdByUserId !== actor.id
  ) {
    throw new HttpError(404, "TEAM_USER_NOT_FOUND", "Team user not found");
  }

  const updatedTeamUser = await repo.updateUserById(teamUserId, {
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });
  return mapDashboardUser(updatedTeamUser as UserEntity);
};

/**
 * Dashboard Operator Management Services (SUPER_ADMIN)
 */
export const listUsersForDashboard = async (
  userId: string,
  filters: ListUsersParams,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  return listUsers(filters);
};

export const updateUserStatus = async (
  userId: string,
  targetUserId: string,
  input: UpdateDashboardUserStatusInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  if (actor.id === targetUserId && input.isActive === false) {
    throw new HttpError(
      400,
      "SELF_DISABLE_NOT_ALLOWED",
      "You cannot disable your own account",
    );
  }

  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const updatedUser = await repo.updateUserById(target.id, {
    isActive: input.isActive,
  });

  if (!input.isActive) {
    await repo.deleteSessionsForUser(target.id);
  }

  return mapDashboardUser(updatedUser as UserEntity);
};

export const updateUserRole = async (
  userId: string,
  targetUserId: string,
  input: UpdateDashboardUserRoleInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  if (actor.id === targetUserId) {
    throw new HttpError(
      400,
      "SELF_ROLE_CHANGE_NOT_ALLOWED",
      "You cannot change your own role",
    );
  }

  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  ensureRoleManageable(target as UserEntity);

  const updatedUser = await repo.updateUserRoleAndAssignments(
    target.id,
    input.role as Exclude<UserRole, "SUPER_ADMIN">,
  );
  await repo.deleteSessionsForUser(target.id);

  return mapDashboardUser(updatedUser as UserEntity);
};

export const sendUserPasswordResetEmail = async (
  userId: string,
  targetUserId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  await queuePasswordResetEmail(
    target,
    env.DASHBOARD_URL ?? env.FRONTEND_URL,
    60,
  );
};

export const updateForcePasswordChange = async (
  userId: string,
  targetUserId: string,
  input: UpdateDashboardForcePasswordChangeInput,
): Promise<DashboardUserDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  const updatedUser = await repo.updateUserById(target.id, {
    mustChangePassword: input.mustChangePassword,
  });

  return mapDashboardUser(updatedUser as UserEntity);
};

export const revokeUserSessions = async (
  userId: string,
  targetUserId: string,
  currentRefreshToken?: string,
): Promise<void> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  if (target.id === actor.id && currentRefreshToken !== undefined) {
    await repo.deleteSessionsForUserExcept(target.id, currentRefreshToken);
    return;
  }

  await repo.deleteSessionsForUser(target.id);
};

/**
 * Mappers
 */
function mapUser(user: UserEntity): UserDTO {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    countryCode: user.countryCode ?? null,
    contactNumber: user.contactNumber ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mapDashboardUser(user: UserEntity): DashboardUserDTO {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdByUserId: user.createdByUserId ?? null,
    countryCode: user.countryCode ?? null,
    contactNumber: user.contactNumber ?? null,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
