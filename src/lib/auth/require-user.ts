import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { SESSION_COOKIE_NAME } from "./session-token";
import { type ValidatedSession, validateSessionCookie } from "./session-store";

/**
 * No-side-effect session read. Returns null if there is no session, an
 * expired/revoked one, or a tampered cookie — callers decide what to do.
 */
export async function getCurrentSession(): Promise<ValidatedSession | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return validateSessionCookie(getDb(), cookieValue);
}

/**
 * Authoritative guard for protected server components/actions — the
 * second half of the two-layer defense described in
 * docs/IMPLEMENTATION_PLAN.md §8. Middleware's cookie-signature check is
 * only a fast, DB-free pre-filter; this is what every protected page and
 * mutation must actually call, since authorization must never depend on
 * middleware alone (docs/ARCHITECTURE.md §10).
 */
export async function requireUser(): Promise<ValidatedSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
