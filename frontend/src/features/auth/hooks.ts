import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
} from "@/features/auth/types";
import * as authApi from "./api";
import type { AppError } from "@/utils/appError";

/**
 * LOGIN
 */
export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<LoginResponse, AppError, LoginPayload>({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
      });
    },
  });
};

/**
 * REGISTER
 */
export const useRegister = () => {
  return useMutation<
    RegisterResponse,
    AppError,
    RegisterPayload & { password: string }
  >({
    mutationFn: authApi.register,
  });
};

/**
 * FORGOT PASSWORD
 */
export const useForgotPassword = () => {
  return useMutation<
    { message: string; devResetToken?: string },
    AppError,
    { email: string }
  >({
    mutationFn: ({ email }) => authApi.forgotPassword(email),
  });
};

/**
 * RESET PASSWORD
 */
export const useResetPassword = () => {
  return useMutation<
    { message: string },
    AppError,
    { token: string; password: string }
  >({
    mutationFn: authApi.resetPassword,
  });
};

/**
 * LOGOUT
 * - Clears local auth
 * - Clears query cache
 * - Broadcasts logout to all tabs
 */
export const useLogout = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } finally {
        clearAuth();
        queryClient.clear();

        // Notify other tabs
        const channel = new BroadcastChannel("auth");
        channel.postMessage({ type: "LOGOUT" });
        channel.close();
      }
    },
  });
};
