import {
  FiHome,
  FiCamera,
  FiMapPin,
  FiBookOpen,
  FiHelpCircle,
  FiPhone,
  FiCalendar,
  FiKey,
  FiShield,
  FiFileText,
} from "react-icons/fi";

import { ROUTES } from "./routePaths";

export const MAIN_NAV = [
  { label: "Home", to: ROUTES.HOME, icon: FiHome },
  { label: "Apartments", to: ROUTES.APARTMENTS, icon: FiKey },
  { label: "Rooms & Tariffs", to: ROUTES.ROOMS_TARIFFS, icon: FiBookOpen },
  { label: "Amenities", to: ROUTES.AMENITIES, icon: FiMapPin },
  { label: "Gallery", to: ROUTES.GALLERY, icon: FiCamera },
  { label: "Location", to: ROUTES.LOCATION, icon: FiMapPin },
  { label: "Long Stays / Corporate", to: ROUTES.LONG_STAYS, icon: FiBookOpen },
  { label: "FAQ", to: ROUTES.FAQ, icon: FiHelpCircle },
];

export const CTA_NAV = [
  { label: "Contact", to: ROUTES.CONTACT, icon: FiPhone },
  { label: "Book Now", to: ROUTES.SPACES, icon: FiCalendar },
];

export const ACCOUNT_NAV = [
  { label: "Profile", to: ROUTES.ACCOUNT, icon: FiHome },
  { label: "My Bookings", to: ROUTES.BOOKINGS, icon: FiCalendar },
];

export const FOOTER_NAV = [
  { label: "Home", to: ROUTES.HOME },
  { label: "Apartments", to: ROUTES.APARTMENTS },
  { label: "Rooms & Tariffs", to: ROUTES.ROOMS_TARIFFS },
  { label: "Amenities", to: ROUTES.AMENITIES },
  { label: "Gallery", to: ROUTES.GALLERY },
];

export const LEGAL_NAV = [
  { label: "Privacy Policy", to: ROUTES.PRIVACY, icon: FiShield },
  { label: "Terms of Service", to: ROUTES.TERMS, icon: FiFileText },
];
