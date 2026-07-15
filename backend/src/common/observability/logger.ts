import { getRequestContext } from "./request-context.js";

const errorDetails = (error: unknown) =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
    : { errorValue: String(error) };

export const logError = (
  message: string,
  error: unknown,
  context: Record<string, unknown> = {},
) => {
  console.error(
    JSON.stringify({
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      ...getRequestContext(),
      ...context,
      ...errorDetails(error),
    }),
  );
};
