import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import RouteError from "@/components/RouteError";
import { ROUTES } from "@/configs/routePaths";

import UserLayout from "@/layouts/UserLayout";
import AuthLayout from "@/layouts/AuthLayout";

import { RequireAuth, RequireGuest } from "./protected";

const LoginPage = lazy(() => import("@/pages/guest/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/guest/RegisterPage"));
const ForgotPasswordPage = lazy(
  () => import("@/pages/guest/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(() => import("@/pages/guest/ResetPasswordPage"));

const HomePage = lazy(() => import("@/pages/guest/HomePage"));
const ApartmentsPage = lazy(() => import("@/pages/guest/ApartmentsPage"));
const RoomsTariffsPage = lazy(() => import("@/pages/guest/RoomsTariffsPage"));
const AmenitiesPage = lazy(() => import("@/pages/guest/AmenitiesPage"));
const GalleryPage = lazy(() => import("@/pages/guest/GalleryPage"));
const LocationPage = lazy(() => import("@/pages/guest/LocationPage"));
const LongStaysPage = lazy(() => import("@/pages/guest/LongStaysPage"));
const FaqPage = lazy(() => import("@/pages/guest/FaqPage"));
const ContactPage = lazy(() => import("@/pages/guest/ContactPage"));
const SpacesListPage = lazy(() => import("@/pages/guest/SpacesListPage"));
const SpaceDetailPage = lazy(() => import("@/pages/guest/SpaceDetailPage"));
const AvailabilityResultPage = lazy(
  () => import("@/pages/guest/AvailabilityResultPage"),
);
const BookingsPage = lazy(() => import("@/pages/guest/BookingsPage"));
const BookingCheckoutPage = lazy(
  () => import("@/pages/guest/BookingCheckoutPage"),
);
const BookingPaymentPage = lazy(
  () => import("@/pages/guest/BookingPaymentPage"),
);
const BookingDetailPage = lazy(
  () => import("@/pages/guest/BookingDetailPage"),
);
const AccountPage = lazy(() => import("@/pages/guest/account/AccountPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));

const routes: RouteObject[] = [
  {
    element: <RequireGuest />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.REGISTER, element: <RegisterPage /> },
          { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
          { path: ROUTES.RESET_PASSWORD(), element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
  {
    path: ROUTES.HOME,
    element: <UserLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.APARTMENTS, element: <ApartmentsPage /> },
      { path: ROUTES.ROOMS_TARIFFS, element: <RoomsTariffsPage /> },
      { path: ROUTES.AMENITIES, element: <AmenitiesPage /> },
      { path: ROUTES.GALLERY, element: <GalleryPage /> },
      { path: ROUTES.LOCATION, element: <LocationPage /> },
      { path: ROUTES.LONG_STAYS, element: <LongStaysPage /> },
      { path: ROUTES.FAQ, element: <FaqPage /> },
      { path: ROUTES.CONTACT, element: <ContactPage /> },
      { path: ROUTES.SPACES, element: <SpacesListPage /> },
      { path: ROUTES.SPACE_DETAIL(), element: <SpaceDetailPage /> },
      { path: ROUTES.AVAILABILITY_RESULT, element: <AvailabilityResultPage /> },
      { path: ROUTES.BOOKING_CHECKOUT, element: <BookingCheckoutPage /> },
      { path: ROUTES.BOOKING_PAYMENT(), element: <BookingPaymentPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: ROUTES.ACCOUNT, element: <AccountPage /> },
          { path: ROUTES.BOOKINGS, element: <BookingsPage /> },
          { path: ROUTES.BOOKING_DETAIL(), element: <BookingDetailPage /> },
        ],
      },
      { path: ROUTES.PRIVACY, element: <PrivacyPage /> },
      { path: ROUTES.TERMS, element: <TermsPage /> },
    ],
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <RouteError />,
  },
];

export default routes;
