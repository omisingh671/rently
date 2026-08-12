import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import axiosInstance from "@/api/axios";
import type {
  BookingGroup,
  BookingGroupStatus,
  CompanyAccount,
  CreateCompanyPayload,
  CreateGroupPayload,
} from "./types";

const unwrap = <T>(response: { data: ApiSuccessResponse<T> }) =>
  response.data.data;

export const listCompaniesApi = async (propertyId: string) =>
  unwrap(
    await axiosInstance.get<ApiSuccessResponse<CompanyAccount[]>>(
      API_ENDPOINTS.commercial.companiesByProperty(propertyId),
    ),
  );

export const createCompanyApi = async (
  propertyId: string,
  payload: CreateCompanyPayload,
) =>
  unwrap(
    await axiosInstance.post<ApiSuccessResponse<CompanyAccount>>(
      API_ENDPOINTS.commercial.companiesByProperty(propertyId),
      payload,
    ),
  );

export const listGroupsApi = async (propertyId: string) =>
  unwrap(
    await axiosInstance.get<ApiSuccessResponse<BookingGroup[]>>(
      API_ENDPOINTS.commercial.groupsByProperty(propertyId),
    ),
  );

export const getGroupApi = async (groupId: string) =>
  unwrap(
    await axiosInstance.get<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.groupById(groupId),
    ),
  );

export const createGroupApi = async (
  propertyId: string,
  payload: CreateGroupPayload,
) =>
  unwrap(
    await axiosInstance.post<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.groupsByProperty(propertyId),
      payload,
    ),
  );

export const updateGroupStatusApi = async (
  groupId: string,
  status: BookingGroupStatus,
  reason: string,
) =>
  unwrap(
    await axiosInstance.patch<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.groupStatus(groupId),
      { status, reason },
    ),
  );

export const holdGroupRoomsApi = async (
  groupId: string,
  payload: { roomIds: string[]; releaseDate: string; reason: string },
) =>
  unwrap(
    await axiosInstance.post<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.groupRoomBlocks(groupId),
      payload,
    ),
  );

export const releaseGroupRoomsApi = async (
  groupId: string,
  payload: { roomIds?: string[]; reason: string },
) =>
  unwrap(
    await axiosInstance.post<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.releaseGroupRoomBlocks(groupId),
      payload,
    ),
  );

export const addGroupChargeApi = async (
  groupId: string,
  payload: { description: string; amount: number; note?: string },
) =>
  unwrap(
    await axiosInstance.post<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.groupFolioCharges(groupId),
      payload,
    ),
  );

export const voidGroupChargeApi = async (
  groupId: string,
  chargeId: string,
  reason: string,
) =>
  unwrap(
    await axiosInstance.post<ApiSuccessResponse<BookingGroup>>(
      API_ENDPOINTS.commercial.groupFolioCharge(groupId, chargeId),
      { reason },
    ),
  );
