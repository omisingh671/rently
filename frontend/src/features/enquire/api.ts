import type { Enquiry } from "./types";
import axiosInstance from "@/api/axios";

export const createEnquiry = async (payload: Enquiry): Promise<Enquiry> => {
  const res = await axiosInstance.post("/public/enquiries", payload);
  return res.data?.data;
};
