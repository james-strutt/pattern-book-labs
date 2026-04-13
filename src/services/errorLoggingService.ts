import logger from "@/lib/logger";
import { isNonNullObject } from "@/utils/typeGuards";

export interface ErrorContext {
  action?: string;
  scope?: string;
  [key: string]: unknown;
}

const SENSITIVE_FIELD_PATTERNS = [
  "email",
  "password",
  "passwd",
  "pwd",
  "token",
  "apikey",
  "api_key",
  "secret",
  "secret_key",
  "credentials",
  "auth",
  "authorization",
  "cookie",
  "session",
  "session_id",
  "ssn",
  "social_security",
  "credit_card",
  "card_number",
  "cvv",
  "cvc",
  "pin",
  "phone",
  "phone_number",
  "mobile",
  "address",
  "full_address",
  "postcode",
  "zip_code",
  "date_of_birth",
  "dob",
  "national_id",
  "passport",
  "drivers_license",
  "license_number",
];

const SENSITIVE_FIELDS_LOWER = new Set(
  SENSITIVE_FIELD_PATTERNS.map((pattern) => pattern.toLowerCase())
);

function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();

  if (SENSITIVE_FIELDS_LOWER.has(lowerKey)) {
    return true;
  }

  return SENSITIVE_FIELD_PATTERNS.some((pattern) =>
    lowerKey.includes(pattern.toLowerCase())
  );
}

function sanitiseContext(context: ErrorContext): Record<string, unknown> {
  const sanitised: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveField(key)) {
      sanitised[key] = "[REDACTED]";
    } else if (
      isNonNullObject(value) &&
      !Array.isArray(value)
    ) {
      sanitised[key] = sanitiseContext(value as ErrorContext);
    } else if (Array.isArray(value)) {
      sanitised[key] = value.map((item) =>
        isNonNullObject(item)
          ? sanitiseContext(item as ErrorContext)
          : item
      );
    } else {
      sanitised[key] = value;
    }
  }

  return sanitised;
}

export function logError(error: unknown, context: ErrorContext = {}): void {
  const action = context.action ? ` during ${context.action}` : "";
  const scope = context.scope ? ` [${context.scope}]` : "";
  const message = error instanceof Error ? error.message : "Error occurred";

  const sanitisedContext = sanitiseContext(context);
  const { action: _, scope: __, ...restContext } = sanitisedContext;

  logger.error(`Error occurred${action}${scope}`, {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
    ...restContext,
  });
}

export default logError;
