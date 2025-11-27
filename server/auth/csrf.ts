// server/auth/csrf.ts
import { nanoid } from "nanoid";
import crypto from "crypto";

export function generateCSRFToken(): string {
  // 32 chars from nanoid is fine for CSRF tokens
  return nanoid(32);
}

export function validateCSRFToken(
  headerToken: string | undefined,
  cookieToken: string | undefined
): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }

  const a = headerToken.trim();
  const b = cookieToken.trim();

  // Length must match for timingSafeEqual
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    // If anything goes wrong, fail closed
    return false;
  }
}
