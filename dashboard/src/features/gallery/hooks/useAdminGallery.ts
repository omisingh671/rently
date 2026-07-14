import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { fetchGalleries, createGallery, deleteGallery } from "../api";
import type { CreateGalleryPayload } from "../types";

export function useAdminGallery(filters: {
  propertyId?: string;
  unitId?: string;
  roomId?: string;
}) {
  const queryClient = useQueryClient();

  const galleriesQuery = useQuery({
    queryKey: ADMIN_KEYS.galleries.list(filters),
    queryFn: () => fetchGalleries(filters),
  });

  const uploadAndCreateMutation = useMutation({
    mutationFn: (payload: CreateGalleryPayload) => createGallery(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.galleries.all() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (galleryId: string) => deleteGallery(galleryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.galleries.all() });
    },
  });

  return {
    ...galleriesQuery,
    uploadAndCreate: uploadAndCreateMutation.mutate,
    isUploading: uploadAndCreateMutation.isPending,
    uploadError: uploadAndCreateMutation.error,
    deleteGallery: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
