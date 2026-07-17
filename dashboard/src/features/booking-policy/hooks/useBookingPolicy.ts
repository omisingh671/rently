import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  getBookingPolicyApi,
  getBookingPolicyAuditsApi,
  updateBookingPolicyApi,
} from "../api";
import type { BookingPolicyPayload } from "../types";

export const useBookingPolicy = (propertyId: string | undefined) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(propertyId);

  const policyQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.bookingPolicy.detail(propertyId)
      : ADMIN_KEYS.bookingPolicy.all(),
    queryFn: () => {
      if (!propertyId) throw new Error("PropertyId required");
      return getBookingPolicyApi(propertyId);
    },
    enabled,
  });
  const auditQuery = useQuery({
    queryKey: propertyId
      ? [...ADMIN_KEYS.bookingPolicy.detail(propertyId), "audits"]
      : [...ADMIN_KEYS.bookingPolicy.all(), "audits"],
    queryFn: () => {
      if (!propertyId) throw new Error("PropertyId required");
      return getBookingPolicyAuditsApi(propertyId);
    },
    enabled,
  });

  const updatePolicy = useMutation({
    onMutate: async () => {
      if (!propertyId) return;
      await queryClient.cancelQueries({
        queryKey: ADMIN_KEYS.bookingPolicy.detail(propertyId),
      });
    },
    mutationFn: (payload: BookingPolicyPayload) => {
      if (!propertyId) throw new Error("PropertyId required");
      return updateBookingPolicyApi(propertyId, payload);
    },
    onSuccess: async (policy) => {
      queryClient.setQueryData(
        ADMIN_KEYS.bookingPolicy.detail(policy.propertyId),
        policy,
      );
      await queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.bookingPolicy.detail(policy.propertyId),
      });
    },
  });

  return {
    policy: policyQuery.data,
    isLoading: policyQuery.isPending,
    isFetching: policyQuery.isFetching,
    isError: policyQuery.isError,
    audits: auditQuery.data ?? [],
    areAuditsLoading: auditQuery.isPending,
    updatePolicy: updatePolicy.mutateAsync,
    isUpdating: updatePolicy.isPending,
  };
};
