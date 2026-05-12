import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/features/auth/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;

  setAuth: (payload: { user: AuthUser; accessToken: string }) => void;
  clearAuth: () => void;
  setLoading: () => void;

  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      status: "loading",

      setAuth: ({ user, accessToken }) =>
        set({
          user,
          accessToken,
          status: "authenticated",
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          status: "unauthenticated",
        }),

      setLoading: () =>
        set({
          status: "loading",
        }),

      isAuthenticated: () => {
        const { status, user, accessToken } = get();
        return status === "authenticated" && !!user && !!accessToken;
      },

    }),
    {
      name: "auth-ui",
      partialize: (state) => ({
        status: state.status,
      }),
    },
  ),
);
