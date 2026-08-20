import type { Config } from "@netlify/functions";
import { getDb } from "../../src/lib/db/client";
import { processReminders } from "../../src/lib/reminders/scheduler";

// Phase 10's first Netlify Scheduled Function — docs/IMPLEMENTATION_PLAN.md
// §12 anticipated this exact need. A plain Netlify Function (not a Next.js
// Route Handler run through the OpenNext adapter), since scheduled
// invocation isn't an HTTP request from a browser and shouldn't be routed
// through app-host proxy logic. All the actual logic lives in
// src/lib/reminders/scheduler.ts, which integration tests call directly
// against PGlite — this file is just the Netlify-facing wrapper.
//
// Every side effect processReminders performs is idempotent at the
// database level (see that file's own comment), so this being invoked more
// than once — retried by Netlify, or manually hit at its function URL — is
// safe by construction rather than by convention. That idempotency is the
// primary defense here; Netlify's own scheduled-function invocation is
// already restricted to Netlify's scheduler rather than being a normal
// public endpoint, so this deliberately doesn't layer a second CRON_SECRET
// header check on top — there's no way to make Netlify's own scheduler
// send a custom header, so a check here could only ever reject genuine
// scheduled runs, not add real protection beyond what's already true.
const handler = async () => {
  const db = getDb();
  const result = await processReminders(db);
  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  });
};

export default handler;

export const config: Config = {
  // Every 15 minutes — Phase 10 decision.
  schedule: "*/15 * * * *",
};
