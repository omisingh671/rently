/**
 * Spaces API - thin wrappers around axiosInstance
 **/

import axiosInstance from "@/api/axios";
import type { Space } from "./types";

export const listSpaces = async (city?: string): Promise<Space[]> => {
  const res = await axiosInstance.get("/public/spaces", {
    params: { ...(city !== undefined && { city }) },
  });
  return res.data?.data ?? [];
};

export const getSpace = async (id: string): Promise<Space> => {
  const res = await axiosInstance.get(`/public/spaces/${id}`);
  return res.data?.data;
};
