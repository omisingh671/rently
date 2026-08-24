import { getRequestContext } from "./request-context.js";

const logEntry = (
  level: "info" | "error",
  message: string,
  context: Record<string, unknown>,
) => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  ...getRequestContext(),
  ...context,
});

export const logInfo = (
  message: string,
  context: Record<string, unknown> = {},
) => {
  console.info(JSON.stringify(logEntry("info", message, context)));
};

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
      ...logEntry("error", message, context),
      ...errorDetails(error),
    }),
  );
};
