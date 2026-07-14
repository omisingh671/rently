import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  listEmailDeliveryJobsApi,
  retryEmailDeliveryJobApi,
} from "./api";

export const useEmailDeliveryJobs = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ADMIN_KEYS.emailDeliveries.all(),
    queryFn: listEmailDeliveryJobsApi,
  });
  const retry = useMutation({
    mutationFn: retryEmailDeliveryJobApi,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.emailDeliveries.all(),
      }),
  });

  return {
    ...query,
    retryDelivery: retry.mutateAsync,
    retryingId: retry.isPending ? retry.variables : undefined,
  };
};
