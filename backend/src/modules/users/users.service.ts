import { hashPassword } from "@/common/utils/password.js";
import { HttpError } from "@/common/errors/http-error.js";

import { UserRole } from "@/generated/prisma/enums.js";

import * as repo from "./users.repository.js";
import type {
  UserDTO,
  UserProfileDTO,
  UpdateUserDTO,
  UpdateUserProfileDTO,
  UserEntity,
} from "./users.dto.js";

import type { CreateUserInput, UpdateUserInput } from "./users.inputs.js";

type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
};

/**
 * Admin services
 **/
export const listUsers = async ({
  page,
  limit,
  search,
  role,
  isActive,
}: ListUsersParams) => {
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;

  const { items, total } = await repo.listUsersPaginated(safePage, safeLimit, {
    ...(search !== undefined && { search }),
    ...(role !== undefined && { role }),
    ...(isActive !== undefined && { isActive }),
  });

  return {
    items: items.map(mapUser),
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

  return mapUser(user);
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
  return mapUser(user);
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
 **/
export const getMyProfile = async (userId: string): Promise<UserProfileDTO> => {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return mapUser(user);
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
  return mapUser(user);
};

/**
 * Mapper
 **/
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
