import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/features/auth/hooks";
import { ADMIN_ROUTES } from "@/configs/routePathsAdmin";

function getAdminPageMeta(pathname: string) {
  if (pathname.includes(ADMIN_ROUTES.DASHBOARD))
    return { title: "Welcome Back", subtitle: "Dashboard overview" };

  if (pathname.includes(ADMIN_ROUTES.PROFILE))
    return { title: "My Profile", subtitle: "Manage personal information" };

  if (pathname.includes(ADMIN_ROUTES.CHANGE_PASSWORD))
    return { title: "Change Password", subtitle: "Update security" };

  if (pathname.includes(ADMIN_ROUTES.ADMINS))
    return { title: "Admins", subtitle: "Manage property admins" };

  if (pathname.includes(ADMIN_ROUTES.MANAGERS))
    return { title: "Managers", subtitle: "Manage booking managers" };

  if (pathname.includes(ADMIN_ROUTES.PROPERTY_ASSIGNMENTS))
    return {
      title: "Property Assignments",
      subtitle: "Map properties to admins and managers",
    };

  if (pathname.includes(ADMIN_ROUTES.PROPERTIES))
    return { title: "Properties", subtitle: "Manage assigned properties" };

  /* Inventory Children (Specific First) */
  if (pathname.includes(ADMIN_ROUTES.INVENTORY_CHILDREN.AMENITIES))
    return {
      title: "Amenities",
      subtitle: "Manage property-scoped amenity inventory",
    };

  if (pathname.includes(ADMIN_ROUTES.INVENTORY_CHILDREN.ROOMS))
    return {
      title: "Rooms",
      subtitle: "Manage room-level inventory",
    };

  if (pathname.includes(ADMIN_ROUTES.INVENTORY_CHILDREN.MAINTENANCE))
    return {
      title: "Maintenance",
      subtitle: "Control maintenance blocks",
    };

  if (pathname.includes(ADMIN_ROUTES.INVENTORY_CHILDREN.PRICING))
    return {
      title: "Pricing",
      subtitle: "Manage pricing rules",
    };

  /* Generic Inventory */
  if (pathname.includes(ADMIN_ROUTES.INVENTORY))
    return { title: "Inventory", subtitle: "Manage inventory" };

  if (pathname.includes(ADMIN_ROUTES.ROOM_BOARD))
    return { title: "Room Board", subtitle: "Room availability operations" };

  if (pathname.includes(ADMIN_ROUTES.BOOKINGS))
    return { title: "Bookings", subtitle: "Reservations overview" };

  if (pathname.includes(ADMIN_ROUTES.ENQUIRIES))
    return { title: "Enquiries", subtitle: "Manage inbound leads" };

  if (pathname.includes(ADMIN_ROUTES.QUOTES))
    return { title: "Quotes", subtitle: "Manage quote requests" };

  if (pathname.includes(ADMIN_ROUTES.SETTINGS))
    return { title: "Settings", subtitle: "Platform preferences" };

  return { title: "Admin", subtitle: "Administration panel" };
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const admin = {
    name: user?.fullName ?? "System Admin",
    email: user?.email ?? "",
    role: user?.role ?? "ADMIN",
    roleLabel:
      user?.role === "SUPER_ADMIN"
        ? "Super Admin"
        : user?.role === "MANAGER"
          ? "Manager"
          : "Admin",
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login", { replace: true }),
    });
  };

  const { title, subtitle } = getAdminPageMeta(location.pathname);

  return (
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar
        admin={admin}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 flex-col">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          variant="default"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
