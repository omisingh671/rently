import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { ApiSuccessResponse } from "@/common/types/api";
import type { PaginatedResult } from "@/common/types/pagination";
import type {
  AdminPropertyAssignment,
  CreatePropertyAssignmentPayload,
  PropertyAssignmentRole,
} from "./types";

export const fetchPropertyAssignments = async (
  page: number,
  limit: number,
  filters: {
    propertyId?: string;
    role?: PropertyAssignmentRole;
  },
): Promise<PaginatedResult<AdminPropertyAssignment>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<AdminPropertyAssignment>>
  >(API_ENDPOINTS.propertyAssignments.list, {
    params: {
      page,
      limit,
      ...filters,
    },
  });

  return res.data.data;
};

export const createPropertyAssignment = async (
  payload: CreatePropertyAssignmentPayload,
): Promise<AdminPropertyAssignment> => {
  const res = await axiosInstance.post<ApiSuccessResponse<AdminPropertyAssignment>>(
    API_ENDPOINTS.propertyAssignments.create,
    payload,
  );

  return res.data.data;
};

export const deletePropertyAssignment = async (
  assignmentId: string,
): Promise<void> => {
  await axiosInstance.delete(
    API_ENDPOINTS.propertyAssignments.deleteById(assignmentId),
  );
};
