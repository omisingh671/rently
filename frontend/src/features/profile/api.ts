import axiosInstance from "@/api/axios";

import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { UserProfile, ChangePasswordPayload } from "./types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface UpdateProfilePayload {
  fullName?: string;
  countryCode?: string | null;
  contactNumber?: string | null;
}

export const getProfile = async (): Promise<UserProfile> => {
  const res = await axiosInstance.get<ApiResponse<UserProfile>>(
    API_ENDPOINTS.users.me,
  );
  return res.data.data;
};

export const updateProfile = async (
  payload: UpdateProfilePayload,
): Promise<UserProfile> => {
  const res = await axiosInstance.patch<ApiResponse<UserProfile>>(
    API_ENDPOINTS.users.updateMe,
    payload,
  );
  return res.data.data;
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<void> => {
  await axiosInstance.post(API_ENDPOINTS.auth.changePassword, payload);
};
