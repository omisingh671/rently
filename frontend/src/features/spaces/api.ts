/**
 * Spaces API - thin wrappers around axiosInstance
 **/

import axiosInstance from "@/api/axios";
import type { Space } from "./types";

export const listSpaces = async (): Promise<Space[]> => {
  const res = await axiosInstance.get("/public/spaces");
  return res.data?.data ?? [];
};

export const getSpace = async (id: string): Promise<Space> => {
  const res = await axiosInstance.get(`/public/spaces/${id}`);
  return res.data?.data;
};
