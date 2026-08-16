# Mr. Drain — Implementation Plan

Status: **APPROVED PLAN. All architectural decisions below are final.** No application code has been written, no dependencies installed, no database created, nothing deployed — implementation has not started. This document will be used as the reference for Phase 0 once you give the go-ahead.

Source documents reviewed in full: `CLAUDE.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `ROADMAP.md` (in `mr-drain-claude-blueprint/`). The local working directory currently contains only that blueprint folder — no Next.js project, no git repository, no other code exists yet.

---

## 0. How to read this document

- Section numbers below map to the 16 items originally requested for the audit.
- Every ambiguity or unstated technical decision identified during the audit has since been reviewed and decided. Decisions are marked **[DECIDED]** inline, with the resolution stated plainly. A small number of items are intentionally deferred to a later phase (not blocking) rather than decided now — those are marked **[DEFERRED]**.
- The full decision log, including what's still genuinely open, is in **Section 16 (Decision Log)** at the end.

---

## 1. Product understanding

Mr. Drain is one business, two connected but distinct surfaces:

|          | Public website — `mrdrainsk.com`                        | Private app — `app.mrdrainsk.com`                     |
| -------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Audience | Customers, prospects, Google                            | Owner (V1), future staff                              |
| Purpose  | Generate calls + quote requests, build trust, local SEO | Run the business: CRM, jobs, scheduling, money, comms |
| Auth     | None (public)                                           | Required, invite-only                                 |
| Data     | Published/curated content only                          | All private business data                             |

They share one Next.js codebase (per `ARCHITECTURE.md` §2) but are architecturally separated by hostname-based routing, not just folder convention — see §9 below for how that actually has to work.

The system is explicitly single-tenant/single-owner for V1 but every model (roles, contractor accounts, customer portal, outbound SMS, card payments) is meant to be extended later without a rewrite. I've designed the DB and auth layer with that in mind without building any of the deferred features now.

---

## 2–3. Spec review: contradictions, ambiguities, gaps, $0-infra risk

The five documents are unusually well-written and internally consistent — there are no outright contradictions between them. What follows are the real ambiguities, unstated technical decisions, and infra constraints I found.

### 2.1 Business-rule ambiguities — decided

**A. Job-level financials vs. invoice line items can legitimately diverge.**
`PROJECT_SPEC.md` §11 defines job-level revenue fields (Job Amount, Tax, Custom Charges) that drive profit reporting. §13 defines invoices as free-form, built-from-scratch line items with their own subtotal/tax/total. Nothing requires these two numbers to match, and §13.4 explicitly says invoice contents are _not_ prefilled from the job.
**[DECIDED]** Job-level financial fields are the authoritative source for internal revenue/profit reporting. Invoices remain customer-facing documents built independently from job financials, and invoice totals are allowed to differ from job totals. A non-blocking UI warning ("Invoice total differs from job total by $X") is shown when they diverge. Neither side is ever automatically changed to force a match.

**B. Tax-inclusion setting could otherwise rewrite the meaning of historical reports.**
§11.1 says tax inclusion in revenue/profit is "configurable in Settings," and §29 separately requires that "changing a reporting setting must not rewrite historical raw data." A single live global setting would mean a profit report run in January and the same report run again in August, after the setting changed, could show two different profit figures for the same closed job.
**[DECIDED]** The tax-inclusion setting is snapshotted onto each job at creation time. Historical jobs continue using their stored tax-inclusion mode permanently, even if the global setting changes later. The global setting only controls the default applied to newly created jobs.

**C. Custom charges: positive or negative?**
Jobs have no explicit "discount" field; invoices mention "discounts if supported" but don't define how. Custom charges are the only flexible revenue-side line on a job.
**[DECIDED]** Custom charges may be positive or negative. Negative custom charges represent discounts/credits. No separate discount field is built in V1.

**D. Payments: job-only, or job+invoice, and what's the balance computed against?**
§12 lists both `job` and `invoice` as payment associations. Given "not every job requires an invoice" (§13), a payment must be able to reference a job without an invoice.
**[DECIDED — revised model]** A payment always belongs to a **job**. A payment may optionally also be allocated to a specific **invoice**. These produce two independent balances, not one conditional balance:

- **Job balance** = job customer total − sum of all non-voided payments associated with that job (regardless of whether any of them are also allocated to an invoice).
- **Invoice balance** = invoice total − sum of non-voided payments specifically allocated to that invoice.

The existence of an invoice never changes how the job balance is computed. This keeps a payment's meaning stable even if invoices are added, edited, or voided later, and — since `invoices.job_id` already allows multiple invoices per job structurally (§6.2) — a future job with several invoices simply has several independent invoice balances alongside its one job balance, with no schema change required. Full detail in §7.

**E. Payments "never hard-deleted" — correction mechanism.**
If the owner fat-fingers a payment amount, the record can't be deleted, but the spec gives no path to correct it.
**[DECIDED]** `payments` gets a `voided_at` / `void_reason` pair (mirroring the archive-not-delete pattern used everywhere else). A voided payment is excluded from both job-balance and invoice-balance calculations but remains permanently visible in history.

**F. Refunds.** Job payment status includes "Refunded" (§8.5) but there's no refund record type.
**[DECIDED]** A refund is represented explicitly as its own payment row with a negative amount, rather than by silently modifying an existing payment. This is documented here specifically so it isn't mistaken for a bug: a negative `amount_cents` on a `payments` row means "refund," and both the financial engine and its test suite (Phase 8/9) treat it as a first-class case, not an edge case that happens to work.

### 2.2 Technical decisions the spec leaves open — decided

These aren't contradictions — `ARCHITECTURE.md` deliberately leaves some choices to be resolved "after inspecting current conventions" (§2) or doesn't name a specific library. Concrete answers, with reasoning, are in §5 (Stack) and §8–9 (DB/Auth) below.

- **Where does Postgres actually live?** Not specified. **[DECIDED]** Neon, direct — not through Netlify's own managed database product.
- **Which storage provider for photos?** "Netlify Blob or another $0-compatible object store" (§11) is explicitly left open. **[DECIDED]** Cloudflare R2, kept behind the `StorageProvider` abstraction. Reasoning in §5.
- **Which PDF engine?** Unspecified. Puppeteer-style headless-Chrome PDF generation is genuinely painful on Netlify serverless functions (large bundles, no persistent Chromium binary, tight memory/time budgets). **[DECIDED]** `@react-pdf/renderer`, reasoning in §5 and §11.
- **Which auth library, if any?** "Mature authentication approach... do not build password hashing or session cryptography from scratch" (§9) names no library. **[DECIDED]** Custom session layer on vetted cryptographic primitives, not Auth.js — used unless a concrete implementation issue during Phase 2 makes it unsafe or impractical, in which case Auth.js is the fallback. Full reasoning in §8.
- **How does one Next.js app actually serve two different hostnames with different route trees?** `ARCHITECTURE.md` §2 says route groups "may" separate them but doesn't explain the mechanism. → hostname-aware middleware rewrite, detailed in §9.6.

### 2.3 Requirements that are hard or impossible to fully satisfy at $0

| Requirement                                                     | Reality at $0                                                                                                                                                                                                                                                                           | Recommendation                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Automated backups" with real retention (`ARCHITECTURE.md` §25) | Neon's free tier point-in-time-restore window is short (roughly 24 hours) — Netlify's own managed Postgres (built on Neon) had a free storage grace period that **ended July 1, 2026**, i.e. already in the past as of today. Free-tier Postgres backup depth is genuinely limited.     | Use Neon free tier directly, and supplement with a weekly Netlify Scheduled Function that exports a logical dump to R2 (cheap, effectively free at this data volume) for longer retention. Document this explicitly as the backup strategy rather than implying enterprise-grade backups exist — per `ARCHITECTURE.md` §25's own instruction to document limitations honestly. |
| CallRail                                                        | CallRail is a **paid third-party service** (tracking numbers + minutes). It is not part of "our $0 infrastructure" — it's an existing business subscription. **[DECIDED]** Confirmed: you already have a CallRail account and will use its API/webhook integration as designed in §9.2. | No action needed — proceeding with the CallRail architecture as proposed. Exact account/webhook details to be supplied when Phase 13 is reached.                                                                                                                                                                                                                               |
| Netlify free plan's 300 credits/month hard cap                  | Bandwidth, function compute, and (if used) Netlify's own Blob/DB storage all draw from one shared 300-credit pool. A photo-heavy job-photo workflow plus public gallery traffic could plausibly exhaust it.                                                                             | Route photo/gallery bytes through R2 (which has its own free egress) instead of proxying everything through Netlify, to keep Netlify's credit pool mostly for page/function compute.                                                                                                                                                                                           |
| Resend free tier: 100 emails/day cap                            | For a single-location plumbing company this is very likely fine at launch (quote acks, invoices, review requests, notifications), but it's a real ceiling, not a soft one.                                                                                                              | Build the `EmailProvider` abstraction (already required by `ARCHITECTURE.md` §13) so swapping to a paid Resend tier later is a config change, not a rewrite. Just something to watch post-launch.                                                                                                                                                                              |
| Netlify Function execution limits (~10s on the free/entry tier) | PDF generation and large CSV exports must fit inside this.                                                                                                                                                                                                                              | `@react-pdf/renderer` generates typical invoices in well under a second, so this is fine. Large report CSV exports should be paginated/streamed rather than built as one giant in-memory job.                                                                                                                                                                                  |

### 2.4 Missing input — deferred, not blocking

- **Brand assets.** `DESIGN_SYSTEM.md` repeatedly says to use "the existing Mr. Drain brand colors from the supplied logo/brand assets" and to use "actual Mr. Drain job photos." None of that exists in the repository — only the five markdown spec files are present. **[DEFERRED]** Confirmed: real logo, brand colors, mascot artwork, and job photography will be supplied before the final public website design phase. Until then, the app is built with a neutral placeholder theme (semantic color tokens, no invented brand identity). CRM/backend work does not wait on this — only Phase 15 (Website CMS) and any pixel-level public-site polish do.
- **The 12 "miscellaneous" services and final service-area copy** (`PROJECT_SPEC.md` §5). **[DEFERRED]** Confirmed: to be decided later, at Phase 15 seeding time. Not a blocker for earlier phases.

---

## 4. Verifying technology choices against what's current right now (Aug 2026)

Quick findings from checking current state rather than trusting stale defaults:

- **Netlify's Next.js support**: current via the OpenNext-based adapter, actively maintained, supports Next.js from 13.5 through current 15.x/16.x, App Router, Server Actions, SSR/ISR, middleware, image optimization. Netlify explicitly recommends _not_ pinning the adapter version — confirms `ARCHITECTURE.md` §21's instruction. Use latest stable Next.js (15.5.x or 16.x) at project init.
- **Netlify's own "Netlify Database" (Neon-managed-by-Netlify)** reached GA in April 2026. Its free storage grace period explicitly ended **July 1, 2026** — before today's date. This directly affects the "$0 initial cost" goal if we go through Netlify's managed layer. → Recommendation: connect to **Neon directly** (its own free tier: 0.5GB storage, 100 CU-hours/month compute, autoscale to 8GB RAM, 10 branches/project, no credit card) using a plain `DATABASE_URL`, bypassing Netlify's own DB product entirely. Functionally identical (same underlying engine), but keeps billing, quota, and portability fully in our control instead of tied to Netlify's credit system.
- **Supabase** (the obvious alternative) free tier pauses projects after 7 days of inactivity — bad for a business app that has to reliably receive CallRail webhooks and serve customers at all hours, even during a quiet week. Ruled out for that reason alone.
- **Auth.js v5 (NextAuth)** is still shipping as `next-auth@beta` after a long beta period. Usable, but for the single most security-sensitive layer of the app, an extended beta tag plus an OAuth-shaped data model (Account/Session/User/VerificationToken tables we don't need, since there's no OAuth) is enough reason to prefer a smaller, fully-owned session layer built on the same class of vetted primitives Auth.js itself uses. Full reasoning in §9.
- **Drizzle vs Prisma**: for a serverless/edge-adjacent Netlify deployment, Drizzle's small bundle size and lack of a bundled query-engine binary give meaningfully faster cold starts than Prisma, with full TypeScript type inference and first-class Postgres support. Recommended.
- **PDF**: confirmed headless-Chrome approaches (Puppeteer/Playwright) are a poor fit for Netlify Functions specifically (large Chromium binaries, no persistent filesystem, subprocess restrictions). `@react-pdf/renderer` (JSX-based, ~2MB, no browser binary, sub-second render) is the right fit and lets us build invoice/quote layouts as React components, matching the rest of the stack.

---

## 5. Recommended V1 technical stack

| Technology                                                                                      | What it is                                              | Why here                                                                                                                                               | Free?                                                                         | Limitations                                                                                      | Lock-in                                                                            |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Next.js 15/16 + TypeScript**                                                                  | React meta-framework, App Router                        | Required by spec; current, well-supported on Netlify                                                                                                   | Yes, OSS                                                                      | —                                                                                                | Low — standard React/Node underneath                                               |
| **Netlify**                                                                                     | Hosting/CI/CD, serverless functions                     | Required by spec                                                                                                                                       | Free tier: 300 credits/mo shared pool                                         | Hard credit cap, no auto-recharge on free plan                                                   | Low if we avoid Netlify-proprietary DB/Blob and keep an `.env`-driven config       |
| **Neon (direct, not via Netlify DB)**                                                           | Serverless Postgres                                     | Real Postgres, generous free tier, branching = free instant "snapshots" (useful for manual backups)                                                    | 0.5GB storage, 100 CU-hrs/mo, 10 branches/project                             | Free-tier PITR window is short (~24h) — needs supplemental backup job                            | Very low — it's a standard `DATABASE_URL`, portable to any Postgres host           |
| **Drizzle ORM**                                                                                 | TypeScript-first SQL query builder + migrations         | Small bundle, fast cold starts, explicit SQL-like queries suit financial-integrity requirements                                                        | Yes, OSS                                                                      | Less "batteries included" than Prisma; more manual migration review                              | Low — plain SQL/Postgres underneath                                                |
| **Custom session auth** (argon2id hashing + sealed session cookies + Postgres `sessions` table) | Hand-assembled from audited primitives, not a framework | Fully revocable sessions (needed for "logout all devices"), no unused OAuth data model, avoids beta-tagged auth framework for the most sensitive layer | Yes, OSS libraries only                                                       | More code to own than a framework; must be tested carefully (mandated anyway by `CLAUDE.md` §10) | None — no external auth service                                                    |
| **Tailwind CSS + shadcn/ui (Radix primitives)**                                                 | Utility CSS + accessible unstyled component library     | Matches "accessible component system" requirement, semantic-token friendly for the design system                                                       | Yes, OSS                                                                      | —                                                                                                | Low — code lives in our repo, not a hosted service                                 |
| **Cloudflare R2**                                                                               | S3-compatible object storage                            | 10GB free, **zero egress fees** (unlike AWS S3), keeps photo bandwidth off Netlify's shared credit pool                                                | 10GB storage free                                                             | Separate account/credentials to manage                                                           | Low — standard S3 API, swappable behind `StorageProvider` interface                |
| **Resend**                                                                                      | Transactional email API                                 | Required by spec                                                                                                                                       | 3,000 emails/mo, 100/day, 1 verified domain                                   | Daily cap is the practical ceiling to watch                                                      | Low — abstracted behind `EmailProvider` interface                                  |
| **React Email**                                                                                 | React components → email HTML                           | Pairs naturally with Resend, keeps templates in code with DB-editable content fields                                                                   | Yes, OSS                                                                      | —                                                                                                | Low                                                                                |
| **`@react-pdf/renderer`**                                                                       | JSX-based PDF rendering, no browser binary              | Fast, small, serverless-friendly, unlike Puppeteer/headless Chrome                                                                                     | Yes, OSS                                                                      | Constrained CSS subset (flexbox, no grid) — fine for invoice/quote layouts                       | Low                                                                                |
| **CallRail API v3 + webhooks**                                                                  | Call tracking/telephony                                 | Required by spec                                                                                                                                       | **Not free** — existing paid business tool, external to this app's infra cost | Webhook signing mechanism needs confirming against your actual CallRail plan during Phase 13     | Medium — CallRail-specific data model, isolated behind `CallRailService` interface |
| **Zod**                                                                                         | Runtime schema validation                               | Server-side validation boundary for every mutation, pairs with Server Actions                                                                          | Yes, OSS                                                                      | —                                                                                                | Low                                                                                |
| **Vitest**                                                                                      | Unit/integration test runner                            | Fast, first-class TS support; used for the mandatory financial-engine tests                                                                            | Yes, OSS                                                                      | —                                                                                                | Low                                                                                |
| **Playwright**                                                                                  | E2E test runner                                         | Covers the critical flows listed in `ARCHITECTURE.md` §26                                                                                              | Yes, OSS                                                                      | —                                                                                                | Low                                                                                |
| **`libphonenumber-js`**                                                                         | Phone normalization                                     | Needed for CRM phone matching and CallRail caller matching                                                                                             | Yes, OSS                                                                      | —                                                                                                | Low                                                                                |

Everything provider-specific (DB, storage, email, CallRail, PDF) sits behind an interface per `ARCHITECTURE.md` §27, so swapping any one of these later is a contained change, not an architecture change.

---

## 6. Database architecture

### 6.1 Core tables (grouped)

**Auth**
`users`, `invites`, `sessions`, `password_reset_tokens`

**CRM**
`contacts`, `contact_phones`, `contact_emails`, `organizations`, `organization_contacts`, `properties`, `property_contacts`

**Leads/Jobs**
`leads`, `jobs`, `job_custom_charges`, `job_photos`, `contractors`, `job_contractor_assignments`

**Money**
`invoices`, `invoice_line_items`, `quotes`, `quote_line_items`, `quote_custom_charges`, `payments`, `sequences`

**Comms**
`calls`, `messages`, `webhook_log`, `reminders`, `notifications`, `email_events`

**Website CMS**
`services`, `service_areas`, `gallery_items`, `reviews`, `homepage_sections`

**System**
`app_settings`, `email_templates`, `activities`

### 6.2 Key relationships

- `jobs.contact_id`, `jobs.property_id`, `jobs.organization_id`, `jobs.lead_id` — all **nullable** FKs (jobs may be created orphaned, per `PROJECT_SPEC.md` §8.1 and `ARCHITECTURE.md` §4).
- `property_contacts` is a join table with a `role` enum (Primary Contact/Owner/Tenant/Property Manager/Spouse-Family/Business Contact/Other) — many-to-many, since a property can have multiple contacts and a contact can relate to multiple properties.
- `organization_contacts` — many-to-many join (a person can belong to an org while separately having personal properties, per §6.2/6.3).
- `job_contractor_assignments` — join table, not a single FK on `jobs`, because `ARCHITECTURE.md` §4 explicitly allows "one or more contractors over its lifecycle." V1 UI can still present a single "current contractor" as the latest active assignment.
- `payments.job_id` (required) + `payments.invoice_id` (nullable) — a payment always belongs to a job and may optionally also be allocated to one specific invoice; see §2.1.D above for the resulting two-independent-balances model.
- `invoices.job_id` — one job → many invoices structurally allowed (future-proofing per `ARCHITECTURE.md` §4: "default to one"), V1 UI defaults to a single invoice per job. Because `payments.invoice_id` targets one specific invoice rather than "the" invoice, this already supports multiple invoices per job with no further schema change when that becomes a real requirement.
- `leads.converted_job_id` and `jobs.lead_id` — bidirectional link recorded at conversion time, both preserved permanently.
- `job_photos.gallery_item_id` (nullable) — set when a job photo is explicitly published to the gallery; publishing performs an explicit **copy** into `gallery_items` (own storage prefix, own row) rather than just flipping a flag, so the private-photo access-control path never has to double as the public path. See §11.3.

### 6.3 Important indexes

- Unique: `users.email`, `jobs.job_number`, `invoices.invoice_number`, `quotes.quote_number`, `services.slug`, `service_areas.slug`, `sequences.name`, `calls.callrail_call_id`, `messages.callrail_message_id`, `webhook_log.external_event_id`.
- B-tree: `contact_phones.phone_normalized`, `contact_emails.email` (lowercased) — non-unique, since two people can legitimately share a phone (spouses).
- `pg_trgm` GIN indexes on `contacts.display_name`, `organizations.name`, `properties.address_line1` — enables the partial/fuzzy matching `ARCHITECTURE.md` §18 calls for, using Postgres alone (Neon supports the extension) before any dedicated search provider is needed.
- `(entity_type, entity_id, created_at desc)` on `activities` — powers per-record timelines efficiently.
- `created_at` on `jobs`, `leads`, `invoices`, `payments` — for dashboard date-range queries.
- Status-field indexes on `jobs.status`, `leads.status`, `invoices.status`, `contractors.active` — used directly in filtered list views.
- `calls.tracking_number`, `calls.caller_number` — CallRail matching path.

### 6.4 Constraints

- `reviews.rating` — `CHECK (rating BETWEEN 1 AND 5)`.
- Foreign keys default to `ON DELETE RESTRICT` — consistent with "nothing important is hard-deleted," this prevents accidental orphaning rather than silently cascading. `job_photos` is the one table where actual hard delete is allowed by spec (§18), and its FK can safely cascade.
- Monetary columns: `integer` (not `numeric`, not floating point), suffixed `_cents` — e.g. `job_amount_cents`. A 4-byte integer caps at ~$21M, comfortably enough headroom for this business; if that's ever a concern, moving to `bigint` is a one-line migration.
- `sequences` table: `(name, prefix, next_number, min_digits)`; allocation is `UPDATE sequences SET next_number = next_number + 1 WHERE name = $1 RETURNING next_number` inside the same transaction as the record insert — Postgres's row-level lock on that `UPDATE` makes concurrent allocation safe without extra locking logic, and numbers are only ever consumed, never freed, so gaps from abandoned Drafts are expected and fine (matches "never reused," not "never skipped").

### 6.5 Monetary values

Integer cents everywhere in the database and in all calculation code, per `ARCHITECTURE.md` §5. A single pure `lib/financials` module owns every formula (customer total, total costs, profit, margin, outstanding balance) so — per `CLAUDE.md` §8 — no UI component ever re-derives these independently. Display formatting (adding the `$`, decimal point, thousands separator) happens only at the UI boundary, never before.

### 6.6 Sequential numbers

Covered in §6.4 — one `sequences` table drives job/invoice/quote numbering, each with independently configurable prefix/starting number/minimum digits per `PROJECT_SPEC.md` §8.2/§13.1/§14, transactional allocation, never reused.

### 6.7 Audit history

One append-only `activities` table (`actor_user_id` nullable for system-generated events, `entity_type`, `entity_id`, `action`, `old_value`/`new_value` as JSON, `metadata`, `created_at`). Every server-side mutation that changes something meaningful (financial values, status changes, attachments, invoice lifecycle, payments) writes to `activities` in the **same database transaction** as the underlying change, so audit history can never drift out of sync with the record it describes. Financial-value changes store explicit before/after values as required by `PROJECT_SPEC.md` §8.6.

---

## 7. Financial model review

Walking through each item you asked me to verify:

- **Job Amount, Tax, Custom Charges (revenue side)** — all manually entered, stored as raw integers, never recalculated from anything else. ✅ consistent with spec.
- **Materials, Contractor Payout (cost side)** — same: single manual dollar figures, no inventory system. ✅ consistent.
- **Customer Total** = Job Amount + Tax + Custom Charges. **Total Costs** = Materials + Payout. **Profit** = Customer Total − Total Costs. **Margin** = Profit / Customer Total, undefined (`null`, rendered as "—") when Customer Total ≤ 0 rather than dividing by zero or showing a misleading 0%. This needs to be explicit in the engine and tested, since the spec only says "where meaningful" without defining the edge case.
- **Tax inclusion setting** — resolved in §2.1.B via a per-job snapshot rather than a live global toggle, keeping historical reports stable. This was the single highest-priority financial-integrity fix relative to the literal spec text.
- **Payments / partial payments — finalized balance model** (§2.1.D): a payment always belongs to a job, and may optionally be allocated to one invoice.
  - **Job balance** = job customer total − Σ(non-voided payments on that job).
  - **Invoice balance** = invoice total − Σ(non-voided payments allocated to that invoice).
  - These are computed independently. An invoice existing, being edited, or being voided never alters the job balance calculation — the job side of the ledger is self-contained regardless of what invoicing happens on top of it. This deliberately keeps the meaning of a recorded payment stable over time: allocating (or later re-allocating) a payment to an invoice is a presentational/reconciliation detail, not something that can retroactively change what the job's own balance was.
  - Refunds are negative-amount payment rows (§2.1.F); voided payments (§2.1.E) are excluded from both balances but retained in history.

No other accounting integrity problems found — the spec's insistence on manual entry everywhere (no auto-calculated tax rates, no auto-generated service pricing, no inventory) is actually what keeps this financial model simple and hard to get subtly wrong, compared to a system that tries to be "smart" about money.

---

## 8. Authentication architecture

**Login**: email + password against `users`. Password hashed with **argon2id** via a vetted library (`@node-rs/argon2`, prebuilt Linux binaries compatible with Netlify's Node runtime; fallback to pure-JS `bcryptjs` only if a native-binary compatibility issue turns up during Phase 2). Rate-limit login attempts per IP/email at the application layer.

**Sessions**: on successful login, generate a cryptographically random session ID (`crypto.randomBytes`), store a row in a Postgres `sessions` table (`user_id`, hashed session ID, `created_at`, `expires_at`, `user_agent`, `ip`, `revoked_at`), and set an httpOnly, secure, `SameSite=Lax` cookie containing the sealed session ID (sealed with a vetted primitive, e.g. `@oslojs/crypto` — not Auth.js's full framework, but the same class of audited building blocks it itself relies on, so this doesn't violate the "don't build session cryptography from scratch" instruction). Every protected request calls a shared `requireUser()` helper that validates the cookie signature _and_ checks the DB row is unrevoked/unexpired — this two-step (cheap cookie check + authoritative DB check) is what makes "logout all devices" possible: it's just `UPDATE sessions SET revoked_at = now() WHERE user_id = $1`.

**Why not Auth.js — decided**: Auth.js v5 is still shipping as a long-running `next-auth@beta`, and its data model (Account/Session/User/VerificationToken) is built around OAuth providers we don't use. For the single most security-critical part of a one-user (soon few-user) internal business app, a small, fully-owned, test-covered session layer built on the same category of audited primitives is more auditable and has fewer moving parts than adopting a beta-tagged framework for functionality we'd only use a slice of. **[DECIDED]** Build the custom session layer described above. Auth.js is not used unless a concrete implementation issue during Phase 2 makes the custom approach genuinely unsafe or impractical — security takes priority over minimizing code, so this bar is intentionally high, not "whichever is less work."

**Password reset**: single-use, hashed, short-expiry (~1 hour) token in `password_reset_tokens`, emailed via Resend, invalidates on use, and (recommended) revokes all existing sessions for that user when a reset completes.

**Invite-only registration**: owner generates an invite (`invites` table: email, hashed token, expiry ~7 days, single-use), Resend sends the link, `/accept-invite/[token]` lets the invitee set their own password and creates their `users` row at that point — no self-serve signup route exists anywhere in the app.

**Protecting `app.mrdrainsk.com`**: two-layer defense. Middleware does a fast, DB-free cookie-signature check to redirect obviously-unauthenticated requests to `/login` before rendering anything. Every server component/Server Action/Route Handler on a protected path independently calls `requireUser()` (full DB session check) before doing anything — so authorization never depends on middleware alone, consistent with `ARCHITECTURE.md` §10's "do not rely on hidden UI elements for authorization" and its general defense-in-depth intent.

**Adding roles/users later**: `users.role` column (starts as `owner`), plus a small `can(user, action, resource)` policy function that today just returns true for `owner` on everything. Later roles (staff, dispatcher, read-only, eventual contractor logins) plug into that same function without any schema migration to the core tables — this is exactly the "policy/service layer" `ARCHITECTURE.md` §10 asks for.

---

## 9. Integration architecture

### 9.1 Resend (email)

`lib/email/EmailProvider` interface, one Resend-backed implementation. `RESEND_API_KEY` lives only in Netlify server environment variables, never reaches browser code. Templates are React Email components in code (structure/layout), with editable _content_ (subject lines, intro copy, footer text) pulled from an `email_templates` table and passed in as props — this satisfies "templates should be editable" from the dashboard without building an open-ended visual email builder, mirroring the same "structured, not unrestricted" philosophy `DESIGN_SYSTEM.md` §19.1 applies to the homepage editor.

**[DECIDED]** Sending subdomain: **`mail.mrdrainsk.com`**. SPF/DKIM/DMARC records for Resend get added at Hostinger scoped to this subdomain only — the existing business mailbox/domain's MX setup stays untouched, since subdomain DNS records don't affect root-domain mail routing. The exact record values (Resend generates them per-domain at verification time) will be provided to you to paste into Hostinger's DNS panel when Phase 14 (Resend/email) is reached — they can't be finalized until the domain is actually added in the Resend dashboard.

### 9.2 CallRail

`lib/callrail/CallRailService` interface. Outbound calls to the CallRail API (fetching call/message metadata) use `CALLRAIL_API_KEY` server-side only. Inbound webhook: `app.mrdrainsk.com/api/webhooks/callrail`, POST-only. Every incoming event is first inserted into a `webhook_log` table keyed on CallRail's own event/call ID with a unique constraint (`ON CONFLICT DO NOTHING`) — if no row is inserted, it's a duplicate delivery and processing stops there, satisfying the idempotency requirement independent of whatever business logic runs next. Payload is then normalized (phone numbers to E.164 via `libphonenumber-js`) and matched against `contact_phones`; unknown numbers never auto-create a contact (§16.2), they just populate `calls`/`messages` and surface the Create Contact / Create Lead / Ignore actions.

**[DECIDED]** Proceeding with this architecture as designed — you have an existing CallRail account. **[DEFERRED]** The exact webhook-authentication mechanism your specific CallRail plan supports (shared secret header vs. query token vs. account-level signing) and the account/tracking-number details will be supplied when Phase 13 is reached; the `webhook_log` idempotency design above works regardless of which auth mechanism CallRail's plan ends up using.

### 9.3 File/photo storage

`lib/storage/StorageProvider` interface (`upload/download/delete/getSignedUrl`), Cloudflare R2 implementation via the S3-compatible SDK. R2 credentials as Netlify server env vars. Private job photos live under a private-only prefix and are only ever served via short-lived signed URLs generated server-side, per-request — never a stable public URL. This satisfies "photos are private by default" (§18) at the storage layer, not just the UI layer.

### 9.4 Publishing to the public gallery

"Publish to gallery" is an explicit copy operation into a separate public-read prefix with its own `gallery_items` row (see §6.2) — not a flag flip on the private object. This means the private bucket policy never has to reason about "is this specific object secretly public," which is a much easier security property to verify and test.

### 9.5 PDF generation

`lib/pdf/InvoicePdfRenderer` / `QuotePdfRenderer`, pure functions built on `@react-pdf/renderer`, taking a `CustomerFacingInvoiceDocument` TypeScript type that **structurally cannot contain** materials cost, payout, or internal profit fields — the internal/customer-facing boundary `ARCHITECTURE.md` §12 requires is enforced at compile time, not just by convention. Rendered server-side in an authenticated Route Handler, streamed as a download.

### 9.6 Hostname-based routing (the mechanism `ARCHITECTURE.md` §2 leaves unstated)

One Netlify site, two custom domains attached (`mrdrainsk.com` and `app.mrdrainsk.com`), one build. Next.js middleware reads `request.headers.get('host')` and rewrites requests to either the `(public)` or `(app)` route group accordingly. The session cookie is scoped to `app.mrdrainsk.com` specifically (not the shared `.mrdrainsk.com` apex), so a session can never leak into or be readable by the public site.

---

## 10. Proposed route structure

### `mrdrainsk.com` (public)

```
/                          Home
/services                  Services index
/services/[slug]           Individual service page
/service-areas             Service areas index
/service-areas/[slug]      Individual area page (unique content, own CallRail number)
/gallery                   Public gallery (filter by service/area/date)
/reviews                   Reviews
/about
/contact                   Quote/contact form (also used by mobile "Get a Free Quote" CTA)
/sitemap.xml, /robots.xml
```

API: `POST /api/leads` (public quote-form submission, rate-limited, creates a `leads` row). Footer contains the subtle "Log In" link to `https://app.mrdrainsk.com`.

### `app.mrdrainsk.com` (private)

```
/login  /logout  /forgot-password  /reset-password/[token]  /accept-invite/[token]

/                          Dashboard (Operations | Financial toggle)
/search                    Global search results

/leads  /leads/[id]
/contacts  /contacts/[id]
/organizations  /organizations/[id]
/properties  /properties/[id]
/jobs  /jobs/new  /jobs/[id]
/schedule                  Day/Week/Month/List views
/contractors  /contractors/[id]
/invoices  /invoices/[id]
/quotes  /quotes/[id]
/reminders
/calls                     CallRail call log
/messages                  CallRail incoming texts
/reports                   Revenue / Profit / Contractors / Jobs / Leads / CallRail

/website                   CMS: homepage, services, service-areas, gallery, reviews, about/contact, SEO, branding
/settings                  Business info, sequences, tax-inclusion default, users/invites,
                           notifications, email templates, invoice template designer,
                           sidebar/dashboard widget config, integration status

/api/webhooks/callrail                POST — CallRail inbound
/api/invoices/[id]/pdf                GET — authenticated PDF stream
/api/quotes/[id]/pdf                  GET
/api/reports/export                   GET — CSV export
```

Everything else that mutates data (creating a job, recording a payment, etc.) is a Next.js **Server Action**, not a REST endpoint — Route Handlers are reserved for webhooks, file/PDF streaming, and exports where raw HTTP semantics are actually needed.

---

## 11. Codebase/module structure

Adopting `ARCHITECTURE.md` §2's suggested layout essentially as-is, since it already matches current Next.js App Router convention well:

```
src/
  app/
    (public)/           marketing site routes
    (app)/               private app routes (further gated by middleware + requireUser())
    api/                webhooks, PDF/export streaming
    middleware.ts        hostname routing + fast auth gate
  components/            shared UI (shadcn/ui-based)
  features/
    crm/                 contacts, organizations, properties
    leads/
    jobs/
    scheduling/
    financials/           the one pure calculation module — customer total/costs/profit/margin
    invoices/
    quotes/
    payments/
    contractors/
    communications/       reminders, notifications, CallRail, messages
    website/              CMS: services, areas, gallery, reviews, homepage sections
    reports/
  lib/
    auth/                 session issuance/validation, argon2, invites, password reset
    db/                   Drizzle schema + client
    storage/               StorageProvider + R2 implementation
    email/                 EmailProvider + Resend implementation, React Email templates
    callrail/               CallRailService, webhook normalization, idempotency
    pdf/                    react-pdf renderers, customer-facing document types
    audit/                  activity-log writer
    sequences/              transactional number allocation
  tests/
    unit/                  financial engine, sequence allocation, phone normalization
    integration/            DB-backed service tests
    e2e/                    Playwright — flows listed in ARCHITECTURE.md §26
```

---

## 12–14. Phase 0 → Phase N implementation plan

Directly expanding `ROADMAP.md`'s 20 phases with concrete DB/UI/backend/integration/test breakdowns. Ordering is unchanged from the roadmap — it's already sequenced correctly (foundation → auth → CRM → jobs → money → integrations → polish → launch), and I agree with that order for the reason in §15 below.

**Phase 0 — Repository foundation**

- Init Next.js 15/16 + TypeScript at the working-directory root (move `CLAUDE.md` to repo root so tooling picks it up automatically; keep the rest of the blueprint as a reference doc, e.g. under `docs/`).
- Tailwind + shadcn/ui base setup, semantic color tokens as CSS variables (placeholder palette until real brand assets arrive).
- ESLint + Prettier, Vitest + Playwright scaffolding, `.env.example` documenting every variable from §9's list.
- Netlify site created, connected to GitHub, OpenNext adapter auto-detected, preview deploys working.
- **Acceptance**: `next build` succeeds locally and on Netlify; `next dev` works; no secrets in git history; empty test suite runs green.

**Phase 1 — Domain/database foundation**

- Neon project created (direct, not Netlify DB), Drizzle schema for every table in §6, `drizzle-kit` migrations.
- `sequences`, `activities`, `app_settings` implemented first since almost everything else depends on them.
- Seed script for local dev data.
- **Acceptance**: migrations run clean on a fresh DB; unique/check constraints verified with negative tests; concurrent sequence allocation tested with parallel transactions and shown not to duplicate.

**Phase 2 — Authentication**

- `users`, `sessions`, `invites`, `password_reset_tokens` tables (already created in Phase 1, wired up here).
- Login/logout, `requireUser()`, middleware hostname+cookie gate, invite flow, password reset flow, "logout all devices."
- **Acceptance**: unauthenticated requests to any `app.mrdrainsk.com` route redirect to `/login`; `mrdrainsk.com` unaffected; password reset round-trips via Resend in a test inbox; session revocation actually invalidates other active sessions.

**Phase 3 — CRM**

- Contacts, organizations, properties, join tables with roles, archive (not delete) flows, universal search using `pg_trgm`.
- Duplicate-detection _suggestions_ only (never auto-merge) + a manual merge workflow.
- **Acceptance**: property with multiple contacts; org with multiple properties; contact/property existing with zero jobs; archived records excluded from default lists but reachable via filter.

**Phase 4 — Leads**

- Lead creation (manual + from public quote form), statuses, source tracking (`original_source` immutable once set), conversion-to-job.
- **Acceptance**: quote-form submission creates a lead + contact; a Lost lead's contact remains fully intact and browsable; original source is provably never overwritten by a later touch.

**Phase 5 — Jobs**

- Creation with/without contact, inline contact creation at the bottom of the form, job numbering via `sequences`, statuses, photos (uploaded to R2), activity timeline.
- **Acceptance**: job created with zero associated records at all; number assigned atomically; every status/attachment change appears in the job's timeline with actor+timestamp.

**Phase 6 — Scheduling**

- Day/Week/Month/List calendar views, contractor assignment, conflict _warnings_ (never hard blocks).
- **Acceptance**: double-booking a contractor warns but still saves; calendar usable on a phone-width viewport.

**Phase 7 — Contractors**

- Contractor records, assignment history, manually-entered payout per job, rollups (completed jobs, total value, total payout, outstanding).
- **Acceptance**: payout is never auto-computed from any percentage split; rollups reconcile against underlying job rows in a test.

**Phase 8 — Financial engine**

- The pure `features/financials` module: customer total, total costs, profit, margin (with the null-when-zero edge case from §7), tax-inclusion snapshot per job.
- **Acceptance**: this phase has the heaviest test-count requirement in the whole project per `CLAUDE.md` §10 — exhaustive Vitest coverage of every calculation and edge case (zero customer total, negative custom charges, tax-inclusion snapshot stability under a later settings change) before moving on.

**Phase 9 — Payments**

- Payment recording against a job with optional allocation to a specific invoice, independent job-balance and invoice-balance calculations (§2.1.D/§7), partial payments, refunds as negative-amount payments, void-instead-of-delete correction path.
- **Acceptance**: partial payment leaves correct remaining balance on both the job and (if allocated) the invoice; voiding/editing an invoice never changes the job balance; a voided payment is excluded from both balances but still visible in history; no code path can hard-delete a payment row.

**Phase 10 — Invoices**

- From-scratch line items, sequential numbering, customizable template (logo/colors/typography within the design system, payment instructions, notes, footer), PDF via `@react-pdf/renderer`, preview/download/email, mismatch warning from §2.1.A.
- **Acceptance**: internal fields provably absent from the rendered PDF (type-level guarantee tested); invoice numbers never repeat under concurrent creation; PDF renders correctly for a representative fixture set (zero line items edge case, many line items, long descriptions).

**Phase 11 — Quotes**

- Same pattern as invoices: from-scratch line items, PDF, statuses, expiration, quote→job conversion.
- **Acceptance**: conversion carries over customer/property/description without duplicating or losing data; quote numbers never repeat.

**Phase 12 — Reminders/notifications**

- Reminders with recurrence, due/upcoming/overdue dashboard sections, in-app notifications, configurable email notifications.
- Introduces the project's first **Netlify Scheduled Function** (checking due reminders and firing notification emails) — not explicitly named in the spec but required to make "due today" and recurring reminders actually work server-side rather than only client-side.
- **Acceptance**: completing a reminder preserves it in history rather than deleting it; a daily/weekly/monthly recurrence correctly generates the next occurrence.

**Phase 13 — CallRail**

- `CallRailService`, webhook endpoint + idempotency (`webhook_log`), tracking-number configuration per service area, unknown/known caller workflows, Messages tab.
- **Acceptance**: the same webhook payload delivered twice produces one call record, not two; unknown callers never silently become contacts; outgoing SMS remains entirely absent from the UI (not just unimplemented — no affordance suggesting it exists).

**Phase 14 — Resend/email**

- `EmailProvider`, editable-content templates, invoice/quote/confirmation/review-request/notification emails.
- **Acceptance**: sending only ever happens server-side (verified by checking no Resend key or send call exists in any client bundle); a simulated Resend failure degrades gracefully (user sees a clear error, doesn't lose the underlying record).

**Phase 15 — Website CMS**
_(Requires your brand assets — see §2.4 — before this phase can produce final visual output; the CMS mechanics themselves don't.)_

- Services/areas/gallery/reviews CRUD, structured (not free-form) homepage section editor, SEO fields, publish/draft state.
- **Acceptance**: adding/editing a service or gallery photo requires no code deploy; unpublished content never appears on the public site; area pages demonstrably have unique content, not templated city-name swaps.

**Phase 16 — Reports**

- Revenue/Profit/Contractor/Jobs/Leads/CallRail reports, date-range + dimension filters, CSV export, PDF export where useful.
- **Acceptance**: every report figure reconciles exactly against a manual sum of the underlying records in a test fixture.

**Phase 17 — Dashboard customization**

- Operations/Financial toggle, configurable widgets, sidebar customization, quick actions (`+ New`), notifications, global search polish.
- **Acceptance**: layout/widget preferences persist per user across sessions.

**Phase 18 — Security and production hardening**

- Full pass over auth, authorization, rate limits (including the public lead-submission endpoint, which is the one truly public write path in the whole system), webhook verification, input validation, file access, audit logging, secret handling, security headers, DB permissions, error handling, backup/restore rehearsal (actually restore a Neon branch/backup once, don't just assume it works).
- Dependency audit, production build, full E2E regression pass.

**Phase 19 — Production launch**

- DNS at Hostinger for both subdomains, SSL, production env vars, Resend domain auth on the dedicated sending subdomain, CallRail webhook pointed at production, R2 production bucket, Neon production branch, monitoring, backup job scheduled and verified running.

---

## 15. Build order rationale (what must come first to avoid rework)

The roadmap's own ordering is correct and I'd keep it exactly:

1. **DB schema + sequences + audit (Phase 1) before anything else** — job/invoice/quote numbering and the activity log are load-bearing for nearly every later feature; retrofitting them after CRM/Jobs exist would mean touching every write path twice.
2. **Auth (Phase 2) before any real data entry work** — every later phase's acceptance criteria assume `requireUser()` exists.
3. **Financial engine as one pure module (Phase 8) before Invoices/Payments consume it** — this is explicitly required by `ARCHITECTURE.md` §6 ("do not calculate financial values differently in different UI components"), and building Invoices first would create exactly that risk.
4. **Storage/PDF/Email abstractions (introduced progressively in Phases 5, 10, 14) behind interfaces from day one** — even though CallRail/Resend/R2 aren't wired to real accounts until their respective phases, the interfaces should exist from whichever phase first needs them so no feature code ever imports a provider SDK directly.
5. **Website CMS (Phase 15) deliberately late** — it depends on brand assets you haven't provided yet, and nothing else in the system depends on it, so it's correctly sequenced to not block anything.

---

## 16. What exists in the repository today, and what to do with it

_(As of the original audit.)_ The local working directory (`C:\Users\mende\Desktop\mrdraincrm`) contained only `mr-drain-claude-blueprint/` with the five spec files — no git repo, no application code, no assets.

- **Preserve**: the five spec files, as the ongoing source of truth. Recommend moving `CLAUDE.md` to the eventual project root in Phase 0 (Claude Code reads it automatically from there); the other four can live at the root or under `docs/` as reference material — either works, your call.
- **Nothing to remove** — there is no existing code to audit for cruft.
- **Nothing has been touched**: no files created outside this document, no `git init`, no `npm install`, no database, no deployment, no API keys.

**Phase 0 status: done.** `CLAUDE.md` now lives at the project root; `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `ROADMAP.md`, and this file now live under `docs/`. The `mr-drain-claude-blueprint/` folder no longer exists — its contents were moved, not copied. Next.js 16 + TypeScript, Tailwind + shadcn/ui (Radix), ESLint/Prettier, Vitest/Playwright, `.env.example`, and `netlify.toml` are in place. See the Phase 0 completion report delivered alongside this update for full detail.

---

## Decision log

All items below were open questions in the original audit and are now finalized.

| #   | Decision                               | Resolution                                                                                                                                                                                                           |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Job vs. invoice financials (§2.1.A)    | Job-level fields are the internal source of truth; invoices are independent customer documents; non-blocking mismatch warning; nothing auto-forced to match.                                                         |
| 2   | Tax-inclusion setting (§2.1.B)         | Snapshotted per job at creation; global setting only affects new jobs.                                                                                                                                               |
| 3   | Custom charges (§2.1.C)                | May be positive or negative; negative = discount/credit; no separate discount field in V1.                                                                                                                           |
| 4   | Payment/balance model (§2.1.D, §7)     | Payment belongs to a job, optionally allocated to one invoice; job balance and invoice balance are computed independently; invoice existence never changes job balance; extensible to multiple invoices per job.     |
| 5   | Payment corrections/refunds (§2.1.E/F) | `voided_at`/`void_reason` for corrections; refunds are explicit negative-amount payment rows, documented and tested as a first-class case.                                                                           |
| 6   | CallRail (§2.3, §9.2)                  | Existing CallRail account confirmed; proceeding with the proposed architecture; account/webhook specifics supplied at Phase 13.                                                                                      |
| 7   | Resend sending domain (§9.1)           | `mail.mrdrainsk.com`; existing Hostinger MX setup untouched; exact SPF/DKIM/DMARC record values to be provided at Phase 14.                                                                                          |
| 8   | Auth approach (§8)                     | Custom session layer on vetted primitives (argon2id + sealed cookies + Postgres sessions table). Auth.js only as a fallback if a concrete Phase 2 implementation issue makes the custom approach unsafe/impractical. |
| 9   | Database (§4)                          | Neon, direct. Netlify's managed Postgres product is not used.                                                                                                                                                        |
| 10  | Storage (§9.3)                         | Cloudflare R2, behind the `StorageProvider` abstraction.                                                                                                                                                             |
| 11  | Brand assets (§2.4)                    | To be supplied before the final public website design phase; neutral placeholder theme used until then; does not block CRM/backend work.                                                                             |
| 12  | 12 miscellaneous services (§2.4)       | Deferred to Phase 15 seeding; does not block earlier development.                                                                                                                                                    |

Nothing remains genuinely unresolved at the architecture level. The only items still open are content/asset deliverables from you (brand assets, final service list, CallRail account specifics, Resend DNS record values) — each is explicitly scheduled to the phase that actually needs it and does not block earlier work.

---

**This document is the finalized audit + plan. All architectural decisions are approved. No implementation has begun — awaiting your go-ahead to start Phase 0.**
