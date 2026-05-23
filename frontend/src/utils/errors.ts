import type { AxiosError } from "axios";
import type { AppError, AppValidationIssue } from "./appError";
import { createAppError } from "./appError";

type BackendErrorResponse = {
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

const isValidationIssue = (value: unknown): value is AppValidationIssue => {
  if (typeof value !== "object" || value === null) return false;

  const issue = value as Record<string, unknown>;
  return (
    Array.isArray(issue.path) &&
    issue.path.every((part) => typeof part === "string") &&
    typeof issue.message === "string"
  );
};

const getValidationIssues = (
  response: BackendErrorResponse | undefined,
): AppValidationIssue[] | undefined => {
  const details = response?.error?.details;
  if (!Array.isArray(details)) return undefined;

  const issues = details.filter(isValidationIssue);
  return issues.length > 0 ? issues : undefined;
};

export function normalizeApiError(err: unknown): AppError {
  if (typeof err === "object" && err !== null && "isAxiosError" in err) {
    const axiosErr = err as AxiosError<BackendErrorResponse>;
    const status = axiosErr.response?.status;
    const validationIssues = getValidationIssues(axiosErr.response?.data);

    const backendMessage =
      axiosErr.response?.data?.error?.message ||
      axiosErr.response?.data?.message ||
      axiosErr.message ||
      "Request failed";

    // FORM errors (user-fixable)
    if (status === 400 || status === 401 || status === 409 || status === 422) {
      return createAppError("FORM", backendMessage, validationIssues);
    }

    // AUTH errors (preserve backend message)
    if (status === 403) {
      return createAppError("AUTH", backendMessage);
    }

    // SYSTEM errors
    if (status && status >= 500) {
      return createAppError("SYSTEM", "Server error. Please try again.");
    }

    return createAppError("SYSTEM", backendMessage);
  }

  if (err instanceof Error) {
    return createAppError("SYSTEM", err.message);
  }

  return createAppError("SYSTEM", "Something went wrong.");
}
