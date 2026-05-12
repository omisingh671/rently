import { Outlet, Link } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface-3">
      {/* ================= MOBILE (single stacked layout) ================= */}
      <div
        className="relative lg:hidden min-h-screen px-4 pt-6 pb-10 text-white flex flex-col"
        style={{
          backgroundImage: "url(/assets/images/auth-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-slate-900/80" />

        <div className="relative z-10 flex flex-col flex-1">
          {/* Back link */}
          <Link
            to="/"
            className="text-sm text-white/90 hover:text-white inline-flex items-center gap-1"
          >
            ← Back to site
          </Link>

          {/* Brand */}
          <div className="mt-10 mb-8">
            <h1 className="text-3xl font-serif font-semibold leading-tight text-slate-100">
              Home Away From <span className="text-amber-400">Home</span>
            </h1>
          </div>

          {/* Auth card */}
          <div className="flex-1 flex items-start justify-center">
            <div className="w-full sm:max-w-xl">
              <div className="bg-white rounded-xl shadow-xl border border-default/10 p-6">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DESKTOP (split layout) ================= */}
      <div className="hidden lg:grid min-h-screen grid-cols-2">
        {/* Left: image + brand */}
        <div
          className="relative flex flex-col justify-between px-14 py-12 text-white"
          style={{
            backgroundImage: "url(/assets/images/auth-bg.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-slate-900/80" />

          <div className="relative z-10 flex flex-col h-full">
            <Link
              to="/"
              className="text-sm text-white/90 hover:text-white inline-flex items-center gap-1"
            >
              ← Back to site
            </Link>

            <div className="mt-auto mb-auto max-w-lg">
              <h1 className="text-5xl xl:text-6xl font-serif font-semibold leading-tight text-slate-100">
                Home Away From <span className="text-amber-400">Home</span>
              </h1>

              <p className="mt-6 text-lg text-white/80 leading-relaxed">
                Experience the warmth of home with the sophistication of a
                five-star stay.
              </p>
            </div>

            <div className="text-xs tracking-[0.2em] text-white/60">
              SUCASA HOMES
            </div>
          </div>
        </div>

        {/* Right: clean background + card */}
        <div className="flex items-center justify-center px-4">
          <div className="w-full max-w-max lg:max-w-xl">
            <div className="bg-white rounded-xl shadow-xl border border-default/10 p-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
