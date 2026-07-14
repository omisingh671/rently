import { useState } from "react";
import Button from "@/components/ui/Button";
import { useEmailDeliveryJobs } from "../hooks";
import { normalizeApiError } from "@/utils/errors";

export default function EmailDeliveryFailuresPanel() {
  const { data = [], isPending, isError, retryDelivery, retryingId } =
    useEmailDeliveryJobs();
  const [actionError, setActionError] = useState<string | null>(null);
  const recoverable = data.filter((job) => job.status !== "SUCCEEDED");

  const retry = async (jobId: string) => {
    setActionError(null);
    try {
      await retryDelivery(jobId);
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  if (isPending) {
    return <div className="rounded-lg border bg-white p-4 text-sm">Loading email delivery status...</div>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Email delivery status could not be loaded. Refresh to retry.
      </div>
    );
  }

  if (recoverable.length === 0) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="font-semibold text-slate-900">Email delivery needs attention</h2>
        <p className="text-sm text-slate-600">
          Failed password-reset emails can be retried safely without creating duplicate jobs.
        </p>
      </div>

      {actionError && <p className="mb-3 text-sm text-red-700">{actionError}</p>}

      <div className="space-y-2">
        {recoverable.map((job) => (
          <div
            key={job.id}
            className="flex flex-col gap-3 rounded-md border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-slate-900">{job.recipient}</p>
              <p className="text-slate-600">
                {job.status} · attempt {job.attemptCount}/{job.maxAttempts}
              </p>
              {job.lastError && <p className="text-red-700">{job.lastError}</p>}
              {job.correlationId && (
                <p className="break-all text-xs text-slate-500">
                  Correlation: {job.correlationId}
                </p>
              )}
            </div>
            {job.status !== "SUCCEEDED" && (
              <Button
                type="button"
                size="sm"
                variant="warning"
                disabled={retryingId === job.id}
                onClick={() => void retry(job.id)}
              >
                {retryingId === job.id
                  ? "Retrying..."
                  : job.status === "PENDING"
                    ? "Process email"
                    : "Retry email"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
