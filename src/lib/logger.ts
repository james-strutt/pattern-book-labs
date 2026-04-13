export enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>, context?: string): void;
  info(message: string, meta?: Record<string, unknown>, context?: string): void;
  warn(message: string, meta?: Record<string, unknown>, context?: string): void;
  error(message: string, error?: Error | Record<string, unknown>, context?: string): void;
  sanitizeErrorMessage(error: string | Error): string;
}

type ConsoleMethods = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

const consoleMethods: ConsoleMethods = {
  info: (...args: unknown[]): void => globalThis.console?.info(...args),
  warn: (...args: unknown[]): void => globalThis.console?.warn(...args),
  error: (...args: unknown[]): void => globalThis.console?.error(...args),
  debug: (...args: unknown[]): void => globalThis.console?.debug(...args),
};

function isPngBinaryData(value: string): boolean {
  return value.length > 4 && value.codePointAt(0) === 0x89 && value.substring(1, 4) === "PNG";
}

function isJpegBinaryData(value: string): boolean {
  return value.codePointAt(0) === 0xff && value.codePointAt(1) === 0xd8;
}

function sanitizeUrlValue(urlValue: unknown): string {
  if (typeof urlValue !== "string" || urlValue.length === 0) {
    return "[INVALID_URL]";
  }

  if (isPngBinaryData(urlValue)) {
    return "[BINARY_PNG_DATA]";
  }

  if (isJpegBinaryData(urlValue)) {
    return "[BINARY_JPEG_DATA]";
  }

  if (urlValue.startsWith("blob:") || urlValue.startsWith("data:")) {
    return urlValue.substring(0, 50) + (urlValue.length > 50 ? "..." : "");
  }

  try {
    const urlObj = new URL(urlValue);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (urlError) {
    if (import.meta.env.DEV) {
      consoleMethods.warn("[sanitizeSensitiveData] Failed to parse URL:", (urlError as Error).message);
    }
    return "[INVALID_URL]";
  }
}

function sanitizeSensitiveKey(key: string, value: unknown): unknown {
  if (key === "url") {
    return sanitizeUrlValue(value);
  }
  return "[REDACTED]";
}

function sanitizeSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = { ...(data as Record<string, unknown>) };
  const sensitiveKeys = ["url", "email", "password", "token", "apiKey", "secret", "stack"];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = sanitizeSensitiveKey(key, sanitized[key]);
    }
  }

  for (const key in sanitized) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}

function sanitizeErrorMessage(error: string | Error, isProduction = false): string {
  if (isProduction) {
    return "An error occurred. Please try again or contact support.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const logger: Logger = {
  info: (message: string, metadata: Record<string, unknown> = {}, callerInfo = ""): void => {
    const timestamp = new Date().toISOString();
    const logPrefix = callerInfo ? `[INFO][${callerInfo}]` : "[INFO]";

    const sanitizedMetadata = import.meta.env.PROD
      ? (sanitizeSensitiveData(metadata) as Record<string, unknown>)
      : metadata;

    consoleMethods.info(`${logPrefix} ${timestamp}: ${message}`, sanitizedMetadata);
  },

  warn: (message: string, metadata: Record<string, unknown> = {}, callerInfo = ""): void => {
    const timestamp = new Date().toISOString();
    const logPrefix = callerInfo ? `[WARN][${callerInfo}]` : "[WARN]";

    const sanitizedMetadata = import.meta.env.PROD
      ? (sanitizeSensitiveData(metadata) as Record<string, unknown>)
      : metadata;

    consoleMethods.warn(`${logPrefix} ${timestamp}: ${message}`, sanitizedMetadata);
  },

  error: (message: string, error: Error | Record<string, unknown> = {}, callerInfo = ""): void => {
    const timestamp = new Date().toISOString();
    const logPrefix = callerInfo ? `[ERROR][${callerInfo}]` : "[ERROR]";

    let errorDetails: Record<string, unknown> | { message: string; stack?: string };
    if (import.meta.env.PROD) {
      if (error instanceof Error) {
        errorDetails = { message: "Error occurred" };
      } else {
        errorDetails = sanitizeSensitiveData(error) as Record<string, unknown>;
      }
    } else {
      errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    }

    consoleMethods.error(`${logPrefix} ${timestamp}: ${message}`, errorDetails);
  },

  debug: (message: string, metadata: Record<string, unknown> = {}, callerInfo = ""): void => {
    if (import.meta.env.DEV) {
      const timestamp = new Date().toISOString();
      const logPrefix = callerInfo ? `[DEBUG][${callerInfo}]` : "[DEBUG]";
      consoleMethods.info(`${logPrefix} ${timestamp}: ${message}`, metadata);
    }
  },

  sanitizeErrorMessage: (error: string | Error): string => sanitizeErrorMessage(error, import.meta.env.PROD),
};

export default logger;
