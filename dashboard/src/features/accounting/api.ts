import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { AccountingQuery, JournalResponse, Reconciliation } from "./types";

export const listJournalApi = async (params: AccountingQuery) => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<JournalResponse>>(
    API_ENDPOINTS.accounting.journal,
    { params },
  );
  return data.data;
};

export const getReconciliationApi = async (params: AccountingQuery) => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<Reconciliation>>(
    API_ENDPOINTS.accounting.reconciliation,
    { params },
  );
  return data.data;
};
