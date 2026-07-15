import { Prisma } from "@/generated/prisma/client.js";

const transientDatabaseCodes = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "P2034",
]);
const transientNetworkCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

export const isTransientDatabaseError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  transientDatabaseCodes.has(error.code);

export const isTransientNetworkError = (error: unknown) => {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return transientNetworkCodes.has(String(error.code));
};

export const runWithBoundedRetry = async <T>(input: {
  operation: () => Promise<T>;
  isRetryable: (error: unknown) => boolean;
  maxAttempts?: number;
  mapExhaustedError?: (error: unknown) => Error;
}): Promise<T> => {
  const maxAttempts = input.maxAttempts ?? 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await input.operation();
    } catch (error) {
      if (!input.isRetryable(error)) throw error;
      if (attempt === maxAttempts) {
        throw input.mapExhaustedError?.(error) ?? error;
      }
    }
  }
  throw new Error("Retry attempts exhausted");
};
