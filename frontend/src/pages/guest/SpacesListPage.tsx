import { Link } from "react-router-dom";
import { useSpaces } from "@/features/spaces/hooks";

export default function SpacesListPage() {
  const query = useSpaces(true);

  if (query.status === "pending") {
    return (
      <div className="p-8">
        <div className="text-lg font-medium mb-4">Spaces</div>
        <div>Loading spaces…</div>
      </div>
    );
  }

  if (query.status === "error") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-3">Spaces</h1>
        <div className="text-danger">Error: {query.error?.message}</div>
      </div>
    );
  }

  const spaces = query.data ?? [];

  if (spaces.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-3">Spaces</h1>
        <div className="text-muted">No spaces available yet.</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Spaces</h1>
      <div className="grid gap-4">
        {spaces.map((s) => (
          <Link
            key={s.id}
            to={`/spaces/${s.id}`}
            className="block p-4 border rounded hover:shadow-sm bg-white/60"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted">{s.description}</p>
              </div>
              <div className="text-right">
                <div className="font-medium">${s.pricePerNight}</div>
                <div className="text-xs text-muted">per night</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
