import { getDb } from "@/lib/db/client";
import { processReminders } from "@/lib/reminders/scheduler";

// Same cadence as the old Netlify Scheduled Function this replaces
// (netlify/functions/process-reminders.mts, "*/15 * * * *") — that function
// stopped running entirely when the app moved off Netlify to Hostinger
// (Hostinger's Node.js Web App is a persistent process with no scheduled-
// function equivalent), so reminder due-notifications/emails silently
// stopped firing. Hostinger's persistent-process model is actually a better
// fit for a plain in-process interval than trying to reintroduce a
// Netlify-style scheduled function elsewhere.
const INTERVAL_MS = 15 * 60 * 1000;

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
 * handled.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  async function tick() {
    try {
      const db = getDb();
      await processReminders(db);
    } catch (error) {
      console.error("Reminder scheduler tick failed:", error);
    }
  }

  // First run shortly after boot (not instantly — let startup finish)
  // rather than waiting a full 15 minutes for the first check.
  setTimeout(tick, 10_000);
  setInterval(tick, INTERVAL_MS);
}
