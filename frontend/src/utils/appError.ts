export type AppErrorType = "FORM" | "AUTH" | "SYSTEM";

export interface AppError {
  type: AppErrorType;
  message: string;
}

export function createAppError(type: AppErrorType, message: string): AppError {
  return { type, message };
}
