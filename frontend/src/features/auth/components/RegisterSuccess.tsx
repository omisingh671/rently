import { Link } from "react-router-dom";
import { FiCheckCircle, FiLogIn, FiHome, FiClock } from "react-icons/fi";

import { ROUTES } from "@/configs/routePaths";

export default function RegisterSuccess() {
  return (
    <div className="text-center py-6">
      {/* Success icon */}
      <div className="flex justify-center mb-6">
        <div className="p-4 border border-green-200 rounded-full">
          <FiCheckCircle className="text-green-500 text-7xl" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-2">
        Welcome to <span className="text-amber-500">Sucasa</span>
      </h2>

      <p className="text-sm text-muted mb-10">
        Your account has been created successfully. Please log in to continue.
      </p>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        {/* Login */}
        <Link
          to={ROUTES.LOGIN}
          className="rounded-xl border border-gray-300 p-6 hover:border-primary transition text-center"
        >
          <div className="flex flex-col items-center gap-3 text-slate-700">
            <FiLogIn className="text-3xl" />
            <div className="font-semibold">Login Now</div>
            <div className="text-xs text-muted">Access your account</div>
          </div>
        </Link>

        {/* Rooms & Tariffs */}
        <Link
          to={ROUTES.ROOMS_TARIFFS}
          className="rounded-xl border border-gray-300 p-6 hover:border-primary transition text-center"
        >
          <div className="flex flex-col items-center gap-3 text-slate-700">
            <FiHome className="text-3xl" />
            <div className="font-semibold">Rooms &amp; Tariffs</div>
            <div className="text-xs text-muted">Explore rooms and pricing</div>
          </div>
        </Link>

        {/* Long stays */}
        <Link
          to={ROUTES.LONG_STAYS}
          className="rounded-xl border border-gray-300 p-6 hover:border-primary transition text-center"
        >
          <div className="flex flex-col items-center gap-3 text-slate-700">
            <FiClock className="text-3xl" />
            <div className="font-semibold">Long Stays</div>
            <div className="text-xs text-muted">Extended living options</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
