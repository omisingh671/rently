/**
 * Called once on app startup. Attempts to restore user session using:
 * 1) If accessToken exists in authStore -> call /auth/me
 * 2) Otherwise -> call /auth/refresh (uses HttpOnly cookie)
 *
 * GUARANTEES:
 * - Bootstrap NEVER overrides a successful interactive login
 * - Bootstrap NEVER clears auth if user+token already exist
 * - Runs only once even in React.StrictMode
 * - Bootstrap is the ONLY place that resolves final auth status
 */

import * as authApi from "./api";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "./types";

// Guard so bootstrapAuth only runs once (even in React.StrictMode)
let bootstrapPromise: Promise<void> | null = null;

export async function bootstrapAuth(): Promise<void> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const store = useAuthStore.getState();

    // Explicitly mark auth as resolving
    store.setLoading();

    // Helper to commit auth safely (never partial)
    const commitAuth = (user: AuthUser, accessToken: string) => {
      useAuthStore.getState().setAuth({
        user,
        accessToken,
      });
    };

    try {
      /**
       * If interactive login already succeeded, DO NOTHING
       * (axios interceptor may have already refreshed token)
       */
      if (store.user && store.accessToken) {
        // status should already be authenticated
        return;
      }

      /**
       * If we have an access token, try /auth/me first
       * This validates token without rotating it
       */
      if (store.accessToken) {
        try {
          const meRes = await authApi.me();

          if (meRes?.user) {
            commitAuth(meRes.user, store.accessToken);
            return;
          }
        } catch {
          // Non-fatal → fall through to refresh
          console.warn("bootstrapAuth: /auth/me failed, trying refresh");
        }
      }

      /**
       * Try refresh (cookie-based, authoritative)
       */
      try {
        const refreshRes = await authApi.refresh();

        if (refreshRes?.user && refreshRes?.accessToken) {
          commitAuth(refreshRes.user, refreshRes.accessToken);
          return;
        }
      } catch {
        console.warn("bootstrapAuth: /auth/refresh failed");
      }

      /**
       * Final fallback
       * Clear ONLY if auth is still empty
       **/
      const finalState = useAuthStore.getState();
      if (!finalState.user && !finalState.accessToken) {
        finalState.clearAuth(); // → status = unauthenticated
      }
    } catch (err) {
      /**
       * Absolute safety net
       * Never leave auth in loading state
       **/
      console.error("bootstrapAuth: fatal error", err);

      const finalState = useAuthStore.getState();
      if (!finalState.user && !finalState.accessToken) {
        finalState.clearAuth();
      }
    }
  })();

  return bootstrapPromise;
}
