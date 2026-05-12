import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function RouteError() {
  const error = useRouteError();

  let status: number | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
  } else if (error instanceof Response) {
    status = error.status;
  }

  const isForbidden = status === 403;

  const debugText = isForbidden
    ? null
    : error instanceof Error
      ? error.message
      : error instanceof Response
        ? `${error.status}`
        : typeof error === "string"
          ? error
          : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className={[
          "w-full max-w-2xl rounded-2xl p-8",
          isForbidden ? "bg-red-50 border border-red-200" : "bg-slate-100",
        ].join(" ")}
      >
        <h2
          className={[
            "text-2xl font-semibold mb-2",
            isForbidden ? "text-red-700" : "text-slate-900",
          ].join(" ")}
        >
          {isForbidden ? "403 — Forbidden" : "Oops — something went wrong"}
        </h2>

        <p
          className={[
            "mb-6",
            isForbidden ? "text-red-700" : "text-slate-600",
          ].join(" ")}
        >
          {isForbidden
            ? "You do not have permission to view this page."
            : "Sorry — we couldn't load the page. Try refreshing or come back later."}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="badge badge-secondary hover:opacity-90 cursor-pointer"
          >
            ← Go back
          </button>

          <Link
            to="/"
            className={[
              "badge hover:opacity-90",
              isForbidden ? "badge-danger" : "badge-primary",
            ].join(" ")}
          >
            Home
          </Link>
        </div>

        {debugText && (
          <div className="rounded-lg bg-white p-4 text-xs text-slate-700 overflow-auto">
            <pre className="whitespace-pre-wrap leading-snug">{debugText}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
