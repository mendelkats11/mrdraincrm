// Reminder processing and CallRail polling both depended on a live
// database (Sep 2026: the business no longer runs the private CRM/admin
// app, and the Neon Postgres project behind it is no longer kept running —
// see docs/CLAUDE.md's project overview). Both were already defensively
// try/caught (a DB or CallRail outage couldn't crash the site), but running
// them on a timer against a database that no longer exists would just
// generate a permanent stream of error logs every couple of minutes for no
// benefit, so the scheduler itself is disabled rather than left to fail
// forever. The underlying logic (src/lib/reminders/scheduler.ts,
// src/lib/callrail/poll.ts) is left in place, not deleted, in case the CRM
// is ever brought back.
export function register() {}
