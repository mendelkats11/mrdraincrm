import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Pure, DB-free session token/cookie primitives, built on Node's built-in
 * `crypto` module only (no new crypto dependency) — see
 * docs/IMPLEMENTATION_PLAN.md §8.
 *
 * Design: the raw token is a 256-bit random value. Only its SHA-256 hash is
 * ever stored in the database (`sessions.session_token_hash`), so a
 * database leak alone cannot be used to forge a valid session. The cookie
 * carries `token.signature`, where `signature = HMAC-SHA256(SESSION_SECRET,
 * token)`. This lets middleware reject an obviously forged/tampered cookie
 * with zero database calls (docs/IMPLEMENTATION_PLAN.md §8's "fast,
 * DB-free cookie-signature check"); it is a cheap first filter only —
 * the database row (expiry, revocation) remains the sole source of truth,
 * checked by requireUser() on every protected request.
 */

// Scoped to app.mrdrainsk.com specifically (no explicit `domain` attribute
// set anywhere this cookie is issued) — never shared with the public
// mrdrainsk.com apex/host, per docs/IMPLEMENTATION_PLAN.md §9.6.
export const SESSION_COOKIE_NAME = "mrdrain_session";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.local and fill it in.");
  }
  return secret;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sign(token: string): string {
  return createHmac("sha256", getSessionSecret()).update(token).digest("base64url");
}

export function createSessionCookieValue(token: string): string {
  return `${token}.${sign(token)}`;
}

/**
 * Verifies the cookie's HMAC signature and returns the raw token if valid,
 * or null if the cookie is malformed or tampered with. Does NOT check
 * expiry/revocation — that requires the database (see
 * src/lib/auth/session-store.ts's validateSessionToken).
 */
export function verifySessionCookieValue(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const token = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = sign(token);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  return token;
}
