import type { PropsWithChildren } from "react";
import { useEffect, useState, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { bootstrapAuth } from "@/features/auth/bootstrap";
import { useAuthStore } from "@/stores/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 0.5,
    },
    mutations: {
      retry: false,
    },
  },
});

function FullScreenLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface1 text-default">
      <div className="text-center">
        <div className="mb-4 animate-spin h-10 w-10 mx-auto border-4 border-muted rounded-full border-t-transparent" />
        <div className="text-sm text-muted">{message ?? "Starting App..."}</div>
      </div>
    </div>
  );
}

export default function AppProviders({ children }: PropsWithChildren) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  /**
   * Bootstrap auth (once)
   **/
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await bootstrapAuth();
      } finally {
        if (mounted) setBootstrapped(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Cross-tab logout listener
   **/
  useEffect(() => {
    const channel = new BroadcastChannel("auth");

    channel.onmessage = (event) => {
      if (event.data?.type === "LOGOUT") {
        clearAuth();
        queryClient.clear();
      }
    };

    return () => {
      channel.close();
    };
  }, [clearAuth]);

  if (!bootstrapped) {
    return <FullScreenLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<FullScreenLoader message="Restoring Session..." />}>
        {children}
      </Suspense>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
