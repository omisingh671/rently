import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchGalleries, createGallery, deleteGallery } from "../api";
import type { CreateGalleryPayload } from "../types";

const QUERY_KEY = ["admin", "galleries"] as const;

export function useAdminGallery(filters: {
  propertyId?: string;
  unitId?: string;
  roomId?: string;
}) {
  const queryClient = useQueryClient();

  const galleriesQuery = useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: () => fetchGalleries(filters),
  });

  const uploadAndCreateMutation = useMutation({
    mutationFn: (payload: CreateGalleryPayload) => createGallery(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (galleryId: string) => deleteGallery(galleryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
