import {
  useFormContext,
  type FieldErrors,
  type FieldError,
} from "react-hook-form";

export function ErrorSummary() {
  const {
    formState: { errors, isSubmitted },
  } = useFormContext();

  if (!isSubmitted) return null;

  const messages = collectErrorMessages(errors);
  if (messages.length === 0) return null;

  return (
    <div
      className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
      role="alert"
      aria-live="assertive"
    >
      <ul className="space-y-1">
        {messages.map((msg, idx) => (
          <li key={idx}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

function collectErrorMessages(errors: FieldErrors): string[] {
  const messages: string[] = [];

  for (const value of Object.values(errors)) {
    if (!value) continue;

    if (isFieldError(value) && typeof value.message === "string") {
      messages.push(value.message);
      continue;
    }

    if (typeof value === "object") {
      messages.push(...collectErrorMessages(value as FieldErrors));
    }
  }

  return messages;
}

function isFieldError(value: unknown): value is FieldError {
  return typeof value === "object" && value !== null && "message" in value;
}
