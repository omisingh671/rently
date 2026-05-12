import { Outlet, useNavigate } from "react-router-dom";
import { useLogout } from "@/features/auth/hooks";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type LayoutProps = React.PropsWithChildren<object>;

export default function UserLayout({ children }: LayoutProps) {
  const logoutMutation = useLogout();
  const navigate = useNavigate();

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
      <Header onLogout={onLogout} logoutPending={logoutMutation.isPending} />

      <main className="flex-1 w-full">
        {/* Prefer explicit children when provided (used by RouteError), otherwise render nested routes */}
        {children ?? <Outlet />}
      </main>

      <Footer />
    </div>
  );
}
