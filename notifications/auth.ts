import crypto from "crypto";

/**
 * Constant-time comparison to prevent timing attacks when comparing
 * API keys, secrets, or authentication tokens.
 */
export function safeCompare(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates JWT Secret strength per security policy (minimum 32 characters / 256 bits).
 */
export function validateJwtSecret(secret?: string): { valid: boolean; error?: string } {
  if (!secret) {
    return { valid: false, error: "JWT_SECRET is required" };
  }
  if (secret.length < 32) {
    return { valid: false, error: "JWT_SECRET must be at least 32 characters long" };
  }
  return { valid: true };
}

interface AttemptRecord {
  failedAttempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

/**
 * In-memory Authentication Lockout Manager.
 * Locks out identity or IP after repeated failed attempts (e.g. 5 failures within 15 min -> 15 min lockout).
 */
export class AuthLockoutManager {
  private records: Map<string, AttemptRecord> = new Map();
  private maxAttempts: number;
  private lockoutDurationMs: number;
  private windowMs: number;

  constructor(
    maxAttempts = 5,
    lockoutDurationMinutes = 15,
    windowMinutes = 15
  ) {
    this.maxAttempts = maxAttempts;
    this.lockoutDurationMs = lockoutDurationMinutes * 60 * 1000;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  /**
   * Checks if an identity/IP is currently locked out.
   */
  public isLocked(identifier: string): { locked: boolean; retryAfter: number } {
    const now = Date.now();
    const record = this.records.get(identifier.toLowerCase());
    if (!record) {
      return { locked: false, retryAfter: 0 };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { locked: true, retryAfter: remainingSeconds };
    }

    // Lockout expired
    if (record.lockedUntil && record.lockedUntil <= now) {
      this.records.delete(identifier.toLowerCase());
      return { locked: false, retryAfter: 0 };
    }

    return { locked: false, retryAfter: 0 };
  }

  /**
   * Records a failed authentication attempt. Returns lockout status.
   */
  public recordFailure(identifier: string): {
    locked: boolean;
    attemptsLeft: number;
    retryAfter: number;
  } {
    const key = identifier.toLowerCase();
    const now = Date.now();
    let record = this.records.get(key);

    if (!record || (now - record.firstAttemptAt > this.windowMs && !record.lockedUntil)) {
      record = {
        failedAttempts: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      };
      this.records.set(key, record);
      return {
        locked: false,
        attemptsLeft: this.maxAttempts - 1,
        retryAfter: 0,
      };
    }

    // If currently locked, return remaining time
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        locked: true,
        attemptsLeft: 0,
        retryAfter: remainingSeconds,
      };
    }

    record.failedAttempts += 1;

    if (record.failedAttempts >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutDurationMs;
      const retryAfter = Math.ceil(this.lockoutDurationMs / 1000);
      console.warn(
        `[AuthLockout] Identity ${key} locked out for ${retryAfter}s after ${record.failedAttempts} failed attempts`
      );
      return {
        locked: true,
        attemptsLeft: 0,
        retryAfter,
      };
    }

    return {
      locked: false,
      attemptsLeft: this.maxAttempts - record.failedAttempts,
      retryAfter: 0,
    };
  }

  /**
   * Resets failed attempts after successful authentication.
   */
  public recordSuccess(identifier: string): void {
    this.records.delete(identifier.toLowerCase());
  }

  /**
   * Clears all lockout states (used for test isolation).
   */
  public clear(): void {
    this.records.clear();
  }
}

export const authLockout = new AuthLockoutManager(5, 15, 15);
