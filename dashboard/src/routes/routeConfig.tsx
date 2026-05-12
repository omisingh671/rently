import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

import RouteError from "@/components/RouteError";
import { ROUTES } from "@/configs/routePaths";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";

import AdminLayout from "@/layouts/admin/AdminLayout";
import AuthLayout from "@/layouts/AuthLayout";

import { RequireAuth, RequireRole, RequireUnauthenticatedAdmin } from "./protected";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ForgotPasswordPage = lazy(
  () => import("@/pages/auth/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));

const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const TenantsPage = lazy(() => import("@/pages/admin/TenantsPage"));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const PropertiesPage = lazy(() => import("@/pages/admin/PropertiesPage"));
const CreatePropertyPage = lazy(() => import("@/pages/admin/CreatePropertyPage"));
const EditPropertyPage = lazy(() => import("@/pages/admin/EditPropertyPage"));
const AmenitiesPage = lazy(() => import("@/pages/admin/AmenitiesPage"));
const UnitsPage = lazy(() => import("@/pages/admin/UnitsPage"));
const RoomsPage = lazy(() => import("@/pages/admin/RoomsPage"));
const MaintenancePage = lazy(() => import("@/pages/admin/MaintenancePage"));
const PricingPage = lazy(() => import("@/pages/admin/PricingPage"));
const BookingsPage = lazy(() => import("@/pages/admin/BookingsPage"));
const EnquiriesPage = lazy(() => import("@/pages/admin/EnquiriesPage"));
const QuotesPage = lazy(() => import("@/pages/admin/QuotesPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const PropertyAssignmentsPage = lazy(
  () => import("@/pages/admin/PropertyAssignmentsPage"),
);
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const ChangePasswordPage = lazy(
  () => import("@/pages/profile/ChangePasswordPage"),
);

const routes: RouteObject[] = [
  {
    element: <RequireUnauthenticatedAdmin />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
          { path: ROUTES.RESET_PASSWORD(), element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
  {
    path: ROUTES.HOME,
    errorElement: <RouteError />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            element: (
              <RequireRole roles={["SUPER_ADMIN", "ADMIN", "MANAGER"]} />
            ),
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    index: true,
                    element: (
                      <Navigate
                        to={adminPath(ADMIN_ROUTES.DASHBOARD)}
                        replace
                      />
                    ),
                  },
                  {
                    path: ADMIN_ROUTES.DASHBOARD,
                    element: <DashboardPage />,
                  },
                  {
                    path: ADMIN_ROUTES.PROPERTIES,
                    element: <PropertiesPage />,
                  },
                  {
                    path: ADMIN_ROUTES.PROFILE,
                    element: <ProfilePage />,
                  },
                  {
                    path: ADMIN_ROUTES.CHANGE_PASSWORD,
                    element: <ChangePasswordPage />,
                  },
                  {
                    element: <RequireRole roles={["SUPER_ADMIN"]} />,
                    children: [
                      {
                        path: ADMIN_ROUTES.TENANTS,
                        element: <TenantsPage />,
                      },
                      {
                        path: ADMIN_ROUTES.ADMINS,
                        element: <UsersPage />,
                      },
                      {
                        path: ADMIN_ROUTES.PROPERTIES_CREATE,
                        element: <CreatePropertyPage />,
                      },
                      {
                        path: ADMIN_ROUTES.PROPERTY_EDIT(":id"),
                        element: <EditPropertyPage />,
                      },
                    ],
                  },
                  {
                    element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]} />,
                    children: [
                      {
                        path: ADMIN_ROUTES.PROPERTY_ASSIGNMENTS,
                        element: <PropertyAssignmentsPage />,
                      },
                      {
                        path: ADMIN_ROUTES.MANAGERS,
                        element: <UsersPage />,
                      },
                      {
                        path: adminPath(
                          ADMIN_ROUTES.INVENTORY,
                          ADMIN_ROUTES.INVENTORY_CHILDREN.AMENITIES,
                        ).slice(1),
                        element: <AmenitiesPage />,
                      },
                      {
                        path: adminPath(
                          ADMIN_ROUTES.INVENTORY,
                          ADMIN_ROUTES.INVENTORY_CHILDREN.UNITS,
                        ).slice(1),
                        element: <UnitsPage />,
                      },
                      {
                        path: adminPath(
                          ADMIN_ROUTES.INVENTORY,
                          ADMIN_ROUTES.INVENTORY_CHILDREN.ROOMS,
                        ).slice(1),
                        element: <RoomsPage />,
                      },
                      {
                        path: adminPath(
                          ADMIN_ROUTES.INVENTORY,
                          ADMIN_ROUTES.INVENTORY_CHILDREN.MAINTENANCE,
                        ).slice(1),
                        element: <MaintenancePage />,
                      },
                      {
                        path: adminPath(
                          ADMIN_ROUTES.INVENTORY,
                          ADMIN_ROUTES.INVENTORY_CHILDREN.PRICING,
                        ).slice(1),
                        element: <PricingPage />,
                      },
                    ],
                  },
                  {
                    path: ADMIN_ROUTES.BOOKINGS,
                    element: <BookingsPage />,
                  },
                  {
                    path: ADMIN_ROUTES.ENQUIRIES,
                    element: <EnquiriesPage />,
                  },
                  {
                    path: ADMIN_ROUTES.QUOTES,
                    element: <QuotesPage />,
                  },
                  {
                    path: ADMIN_ROUTES.SETTINGS,
                    element: <SettingsPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <RouteError />,
  },
];

export default routes;
