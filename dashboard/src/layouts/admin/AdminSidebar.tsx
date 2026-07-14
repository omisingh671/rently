import { NavLink, useNavigate } from "react-router-dom";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import type { ElementType } from "react";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import AdminUserDropdown from "./AdminUserDropdown";

const {
  FiGrid,
  FiUsers,
  FiLink,
  FiHome,
  FiCalendar,
  FiSettings,
  FiLogOut,
  FiX,
  FiLayers,
  FiKey,
  FiTool,
  FiDollarSign,
  FiMessageSquare,
  FiFileText,
  FiBriefcase,
  FiClipboard,
  FiImage,
  FiClock,
  MdMeetingRoom,
  FiInfo,
  FiActivity,
  FiCoffee,
} = ICON_REGISTRY;

interface AdminSidebarProps {
  admin: {
    name: string;
    email: string;
    role: string;
    roleLabel?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const navBase =
  "group relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200";
const navActive = "bg-[#3b82f6]/15 text-blue-50 shadow-sm";
const navInactive = "text-slate-400 hover:bg-white/5 hover:text-white";
const sectionLabel =
  "px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-[#7a7daa]";

type SidebarIcon = ElementType<{ className?: string }>;

interface SidebarLinkProps {
  to: string;
  icon: SidebarIcon;
  label: string;
}

function SidebarLink({ to, icon: Icon, label }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${navBase} ${isActive ? navActive : navInactive}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 h-5 w-1 rounded-r-full bg-[#3b82f6]" />
          )}
          <Icon
            className={isActive ? "text-[#3b82f6]" : "group-hover:text-white"}
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function AdminSidebar({
  admin,
  isOpen,
  onClose,
  onLogout,
}: AdminSidebarProps) {
  const navigate = useNavigate();

  const initials = admin.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const closeAndNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-50 flex h-screen w-64 flex-col bg-[#0f172a] text-white transition-transform md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <img
            src="/assets/images/logo.png"
            alt="Rently"
            className="h-11 w-full max-w-45 object-contain object-left"
          />
          <button
            onClick={onClose}
            className="rounded-md p-2 text-[#c7c9f1] hover:bg-[#3f4270] md:hidden"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-2">
          <SidebarLink
            to={adminPath(ADMIN_ROUTES.DASHBOARD)}
            icon={FiGrid}
            label="Dashboard"
          />

          <p className={sectionLabel}>Operations</p>

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.FRONT_DESK)}
            icon={FiCoffee}
            label="Front Desk"
          />

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.BOOKINGS)}
            icon={FiCalendar}
            label="Bookings"
          />

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
            icon={FiClipboard}
            label="Room Board"
          />

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.BILLING)}
            icon={FiFileText}
            label="Billing"
          />

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.REPORTS)}
            icon={FiActivity}
            label="Reports"
          />

          <p className={sectionLabel}>Leads</p>

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.ENQUIRIES)}
            icon={FiMessageSquare}
            label="Enquiries"
          />

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.QUOTES)}
            icon={FiFileText}
            label="Quotes"
          />

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <p className={sectionLabel}>Inventory</p>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.UNITS,
              )}
              icon={FiKey}
              label="Units"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.ROOMS,
              )}
              icon={MdMeetingRoom}
              label="Rooms"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.MAINTENANCE,
              )}
              icon={FiTool}
              label="Maintenance"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.PRICING,
              )}
              icon={FiDollarSign}
              label="Pricing"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.GALLERY,
              )}
              icon={FiImage}
              label="Gallery"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <p className={sectionLabel}>Admin</p>
          )}

          {admin.role === "SUPER_ADMIN" && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.TENANTS)}
              icon={FiBriefcase}
              label="Tenants"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.PROPERTIES)}
              icon={FiHome}
              label="Properties"
            />
          )}

          {admin.role === "SUPER_ADMIN" && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.USERS)}
              icon={FiUsers}
              label="Users"
            />
          )}

          {admin.role === "ADMIN" && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.MANAGERS)}
              icon={FiUsers}
              label="Managers"
            />
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.PROPERTY_ASSIGNMENTS)}
              icon={FiLink}
              label="Assignments"
            />
          )}

          {admin.role === "SUPER_ADMIN" && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.AMENITIES)}
              icon={FiLayers}
              label="Amenities"
            />
          )}

          {admin.role === "SUPER_ADMIN" && (
            <SidebarLink
              to={adminPath(ADMIN_ROUTES.SESSIONS)}
              icon={FiClock}
              label="Sessions"
            />
          )}

          <p className={sectionLabel}>Settings</p>

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.BOOKING_POLICY)}
            icon={FiClipboard}
            label="Booking Policy"
          />

          <SidebarLink
            to={adminPath(ADMIN_ROUTES.SETTINGS)}
            icon={FiSettings}
            label="Settings"
          />

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <>
              <p className={sectionLabel}>Support</p>
              <SidebarLink
                to={adminPath(ADMIN_ROUTES.SYSTEM_GUIDE)}
                icon={FiInfo}
                label="System Guide"
              />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-6 mt-auto">
          <AdminUserDropdown
            name={admin.name}
            initials={initials}
            onSettings={() =>
              closeAndNavigate(adminPath(ADMIN_ROUTES.SETTINGS))
            }
            onViewProfile={() =>
              closeAndNavigate(adminPath(ADMIN_ROUTES.PROFILE))
            }
            onChangePassword={() =>
              closeAndNavigate(adminPath(ADMIN_ROUTES.CHANGE_PASSWORD))
            }
          />

          <button
            onClick={onLogout}
            className="mt-4 flex w-full items-center gap-2 px-3 text-base text-[#c7c9f1] hover:text-rose-200"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
