import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/configs/routePaths";
import type { AvailabilityNavigationState } from "@/features/availability/types";

export default function AvailabilityResultPage() {
  const location = useLocation();
  const state = location.state as AvailabilityNavigationState | null;

  if (!state?.criteria) {
    return <Navigate to={ROUTES.SPACES} replace />;
  }

  const params = new URLSearchParams({
    from: state.criteria.checkIn,
    to: state.criteria.checkOut,
    guests: String(state.criteria.guests),
    comfort: state.criteria.comfortOption,
  });

  return <Navigate to={`${ROUTES.SPACES}?${params.toString()}`} replace />;
}
