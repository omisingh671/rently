import { useMutation } from "@tanstack/react-query";
import * as api from "./api";
import type { Enquiry } from "./types";

export const useCreateEnquiry = () => {
  return useMutation({
    mutationFn: (payload: Enquiry) => api.createEnquiry(payload),
  });
};
