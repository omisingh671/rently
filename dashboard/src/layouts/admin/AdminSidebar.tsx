import { NavLink, useNavigate } from "react-router-dom";
import {
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
} from "react-icons/fi";
import { MdMeetingRoom } from "react-icons/md";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import AdminUserDropdown from "./AdminUserDropdown";

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
const navActive = "bg-white/10 text-white shadow-sm";
const navInactive = "text-slate-400 hover:bg-white/5 hover:text-white";
const sectionLabel =
  "px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-[#7a7daa]";

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
            src="/assets/images/logo-rently.png"
            alt="Rently"
            className="h-11 w-full max-w-[180px] object-contain object-left"
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
          <NavLink
            to={adminPath(ADMIN_ROUTES.DASHBOARD)}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 h-5 w-1 rounded-r-full bg-indigo-500" />
                )}
                <FiGrid className={isActive ? "text-indigo-400" : "group-hover:text-white"} /> Dashboard
              </>
            )}
          </NavLink>

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <>
              {admin.role === "SUPER_ADMIN" && (
                <>
                  <NavLink
                    to={adminPath(ADMIN_ROUTES.TENANTS)}
                    className={({ isActive }) =>
                      `${navBase} ${isActive ? navActive : navInactive}`
                    }
                  >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 h-5 w-1 rounded-r-full bg-indigo-500" />
                )}
                <FiBriefcase className={isActive ? "text-indigo-400" : "group-hover:text-white"} /> Tenants
              </>
            )}
                  </NavLink>
                  <NavLink
                    to={adminPath(ADMIN_ROUTES.ADMINS)}
                    className={({ isActive }) =>
                      `${navBase} ${isActive ? navActive : navInactive}`
                    }
                  >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 h-5 w-1 rounded-r-full bg-indigo-500" />
                )}
                <FiUsers className={isActive ? "text-indigo-400" : "group-hover:text-white"} /> Admins
              </>
            )}
                  </NavLink>
                </>
              )}

            </>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(ADMIN_ROUTES.PROPERTIES)}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiHome /> Properties
            </NavLink>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(ADMIN_ROUTES.PROPERTY_ASSIGNMENTS)}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiLink /> Assignments
            </NavLink>
          )}

          {admin.role === "ADMIN" && (
            <NavLink
              to={adminPath(ADMIN_ROUTES.MANAGERS)}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiUsers /> Managers
            </NavLink>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <p className={sectionLabel}>Inventory</p>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.AMENITIES,
              )}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiLayers /> Amenities
            </NavLink>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.UNITS,
              )}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiKey /> Units
            </NavLink>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.ROOMS,
              )}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <MdMeetingRoom /> Rooms
            </NavLink>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.MAINTENANCE,
              )}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiTool /> Maintenance
            </NavLink>
          )}

          {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
            <NavLink
              to={adminPath(
                ADMIN_ROUTES.INVENTORY,
                ADMIN_ROUTES.INVENTORY_CHILDREN.PRICING,
              )}
              className={({ isActive }) =>
                `${navBase} ${isActive ? navActive : navInactive}`
              }
            >
              <FiDollarSign /> Pricing
            </NavLink>
          )}

          <p className={sectionLabel}>Leads</p>

          <NavLink
            to={adminPath(ADMIN_ROUTES.ENQUIRIES)}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            <FiMessageSquare /> Enquiries
          </NavLink>

          <NavLink
            to={adminPath(ADMIN_ROUTES.QUOTES)}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            <FiFileText /> Quotes
          </NavLink>

          <p className={sectionLabel}>Operations</p>

          <NavLink
            to={adminPath(ADMIN_ROUTES.BOOKINGS)}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            <FiCalendar /> Bookings
          </NavLink>

          <NavLink
            to={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            <FiClipboard /> Room Board
          </NavLink>

          <NavLink
            to={adminPath(ADMIN_ROUTES.SETTINGS)}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            <FiSettings /> Settings
          </NavLink>
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
