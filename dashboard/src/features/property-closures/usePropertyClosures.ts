import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  cancelPropertyClosureApi,
  createPropertyClosureApi,
  listPropertyClosuresApi,
} from "./api";

export const usePropertyClosures = (propertyId: string) => {
  const queryClient = useQueryClient();
  const queryKey = propertyId
    ? ADMIN_KEYS.propertyClosures.byProperty(propertyId)
    : ADMIN_KEYS.propertyClosures.all();
  const query = useQuery({
    queryKey,
    queryFn: () => listPropertyClosuresApi(propertyId),
    enabled: Boolean(propertyId),
  });
  const invalidate = (nextPropertyId: string) =>
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.propertyClosures.byProperty(nextPropertyId),
    });
  const createMutation = useMutation({
    mutationFn: createPropertyClosureApi,
    onSuccess: (closure) => invalidate(closure.propertyId),
  });
  const cancelMutation = useMutation({
    mutationFn: ({ closureId, reason }: { closureId: string; reason: string }) =>
      cancelPropertyClosureApi(closureId, reason),
    onSuccess: (closure) => invalidate(closure.propertyId),
  });

  return {
    ...query,
    createClosure: createMutation.mutateAsync,
    cancelClosure: cancelMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
};
