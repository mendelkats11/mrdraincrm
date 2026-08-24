import { getDb } from "@/lib/db/client";
import { processReminders } from "@/lib/reminders/scheduler";
import { pollCallRail } from "@/lib/callrail/poll";

// Originally matched the old Netlify Scheduled Function this replaces
// (netlify/functions/process-reminders.mts, "*/15 * * * *") — that function
// stopped running entirely when the app moved off Netlify to Hostinger
// (Hostinger's Node.js Web App is a persistent process with no scheduled-
// function equivalent), so reminder due-notifications/emails silently
// stopped firing. Hostinger's persistent-process model is actually a better
// fit for a plain in-process interval than trying to reintroduce a
// Netlify-style scheduled function elsewhere.
//
// Tightened to 2 minutes (owner decision) so CallRail calls/texts show up
// close to real-time via polling. Both Hostinger instances run this
// independently, so CallRail's API sees roughly 2x this rate — accepted
// tradeoff, not a rate limit CallRail is known to enforce.
const INTERVAL_MS = 2 * 60 * 1000;

/**
 * Next.js's documented "run once when a new server instance starts" hook
 * (see node_modules/next/dist/docs/.../instrumentation.md — this file's
 * `register` export). Deliberately does no DB work itself; it only arms a
 * timer, so server startup is never blocked on a database round-trip.
 *
 * Both Hostinger app instances (mrdrainsk.com and app.mrdrainsk.com) run
 * this identical codebase, so both will independently tick this timer —
 * that's safe by construction, not by convention: processReminders'
 * idempotency comes entirely from a DB-level unique constraint
 * (notifications_reminder_dedupe_idx, see src/lib/reminders/scheduler.ts),
 * so two processes ticking at once just means the second's INSERT ...
 * ON CONFLICT DO NOTHING inserts zero rows for anything the first already
 * handled. The same reasoning covers pollCallRail below (see
 * src/lib/callrail/poll.ts) — it reuses the exact same idempotent
 * processCallWebhook/processMessageWebhook the CallRail webhook route
 * uses, so redundant polls (from two instances, or overlapping lookback
 * windows) are no-ops rather than duplicates.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  async function tick() {
    const db = getDb();
    // Independent try/catch per task — a CallRail API outage must never
    // block reminder notifications from firing, and vice versa.
    try {
      await processReminders(db);
    } catch (error) {
      console.error("Reminder scheduler tick failed:", error);
    }
    try {
      await pollCallRail(db);
    } catch (error) {
      console.error("CallRail poll tick failed:", error);
    }
  }

  // First run shortly after boot (not instantly — let startup finish)
  // rather than waiting a full 15 minutes for the first check.
  setTimeout(tick, 10_000);
  setInterval(tick, INTERVAL_MS);
}
