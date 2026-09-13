export interface LogContext {
  route?: string;
  method?: string;
  walletAddress?: string;
  requestId?: string;
  ip?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "privatekey",
  "secret",
  "token",
  "authorization",
  "x-cadence-internal-key",
  "x-admin-key",
  "cookie",
]);

/**
 * Recursively redacts sensitive values from log context to prevent credential leakage.
 */
export function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Redact 64-char hex private keys if found in strings
    if (/0x[a-fA-F0-9]{64}/.test(obj)) {
      return "[REDACTED_PRIVATE_KEY]";
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        cleaned[key] = "[REDACTED]";
      } else {
        cleaned[key] = redactSensitive(value, depth + 1);
      }
    }
    return cleaned;
  }

  return obj;
}

class StructuredLogger {
  private formatLog(
    level: "INFO" | "WARN" | "ERROR",
    message: string,
    context?: LogContext,
    err?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const redactedContext = context ? redactSensitive(context) : undefined;
    const errorDetails =
      err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
        : err;

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(redactedContext ? { context: redactedContext } : {}),
      ...(errorDetails ? { error: errorDetails } : {}),
    });
  }

  public info(message: string, context?: LogContext): void {
    console.log(this.formatLog("INFO", message, context));
  }

  public warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog("WARN", message, context));
  }

  public error(message: string, err?: unknown, context?: LogContext): void {
    console.error(this.formatLog("ERROR", message, context, err));

    // Optional Sentry / production monitoring hook
    if (process.env.SENTRY_DSN && err) {
      // In production with Sentry configured, capture exception
      // Sentry.captureException(err, { extra: context });
    }
  }
}

export const logger = new StructuredLogger();
