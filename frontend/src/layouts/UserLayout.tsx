import { Outlet, useNavigate } from "react-router-dom";
import { useLogout } from "@/features/auth/hooks";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePublicTenantConfig } from "@/features/public-config/hooks";

type LayoutProps = React.PropsWithChildren<object>;

export default function UserLayout({ children }: LayoutProps) {
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const { data: tenantConfig } = usePublicTenantConfig();

  const onLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-default">
      <Header
        onLogout={onLogout}
        logoutPending={logoutMutation.isPending}
        logoUrl={tenantConfig?.logoUrl}
        brandName={tenantConfig?.brandName}
      />

      <main className="flex-1 w-full">
        {/* Prefer explicit children when provided (used by RouteError), otherwise render nested routes */}
        {children ?? <Outlet />}
      </main>

      <Footer
        logoUrl={tenantConfig?.logoUrl}
        brandName={tenantConfig?.brandName}
      />
    </div>
  );
}
