import type { ReactNode } from "react";

type Props = {
  headers: string[];
  loading: boolean;
  empty: boolean;
  children: ReactNode;
};

export default function PricingTable({
  headers,
  loading,
  empty,
  children,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={loading ? "opacity-70" : ""}>
          {empty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                No records found.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
