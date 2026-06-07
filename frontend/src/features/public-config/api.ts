import axiosInstance from "@/api/axios";
import type { PublicTenantConfig } from "./types";

export const getPublicTenantConfig = async (): Promise<PublicTenantConfig> => {
  const res = await axiosInstance.get("/public/tenant-config");
  return res.data?.data;
};
