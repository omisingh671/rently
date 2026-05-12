import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { UserProfile, ChangePasswordPayload } from "./types";
import * as usersApi from "./api";

export const useProfile = () => {
  return useQuery<UserProfile>({
    queryKey: ["users", "me"],
    queryFn: usersApi.getProfile,
    staleTime: 1000 * 60,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateProfile,

    onSuccess: (profile) => {
      // Update profile cache
      queryClient.setQueryData<UserProfile>(["users", "me"], profile);

      // Sync auth store (only what auth actually needs)
      const { user, accessToken, setAuth } = useAuthStore.getState();

      if (!user || !accessToken) return;

      // Currently auth user only cares about fullName
      if (user.fullName !== profile.fullName) {
        setAuth({
          user: {
            ...user,
            fullName: profile.fullName,
          },
          accessToken,
        });
      }
    },
  });
};

export const useChangePassword = () => {
  return useMutation<void, Error, ChangePasswordPayload>({
    mutationFn: usersApi.changePassword,
  });
};
