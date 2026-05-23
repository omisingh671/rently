export type AppErrorType = "FORM" | "AUTH" | "SYSTEM";

export interface AppValidationIssue {
  path: string[];
  message: string;
}

export interface AppError {
  type: AppErrorType;
  message: string;
  validationIssues?: AppValidationIssue[];
}

export function createAppError(
  type: AppErrorType,
  message: string,
  validationIssues?: AppValidationIssue[],
): AppError {
  return {
    type,
    message,
    ...(validationIssues !== undefined && { validationIssues }),
  };
}
