# Mr. Drain — Claude Code Instructions

## 1. Project

Mr. Drain Plumber is a plumbing company's public website and private business-management application.

- Public website: `https://mrdrainsk.com`
- Private business app: `https://app.mrdrainsk.com`

The public website is customer-facing. The app is authenticated and private.

Read `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, and `ROADMAP.md` when relevant. These files are the product and technical source of truth.

## 2. Priorities

Optimize for:

1. Correct business behavior
2. Data integrity
3. Security and privacy
4. Simple, fast UX
5. Accessibility
6. Maintainability
7. $0 initial operating cost
8. Portability / low vendor lock-in

Do not invent business rules. If a requirement is ambiguous, identify the ambiguity and choose the safest reversible implementation rather than silently inventing behavior.

## 3. Stack

Use the best current stable stack compatible with the project specification.

Target:
- Next.js + TypeScript
- PostgreSQL-compatible relational database
- Tailwind CSS
- Accessible component system
- Netlify deployment
- GitHub source control
- Netlify-compatible server-side functionality
- Blob/object storage for uploaded files
- Resend for application email
- CallRail API/webhooks for calls and incoming texts

Do not add paid infrastructure unless explicitly approved.

Keep persistence and external integrations behind clear interfaces so providers can be changed later.

## 4. Domains

Public:
- `mrdrainsk.com`

Private:
- `app.mrdrainsk.com`

The public footer may contain a subtle `Log In` link to the app. Do not expose admin controls in the public navigation.

## 5. Security

Never commit secrets.

Use environment variables/secrets for:
- database credentials
- authentication secrets
- CallRail credentials
- Resend credentials
- storage credentials
- other private API credentials

Never expose private API credentials to browser code.

All admin routes require authentication.

Registration is invite-only.

Validate and authorize every server-side mutation. Do not rely on client-side checks for security.

## 6. Critical business rules

- Jobs may be created without a contact.
- A contact may exist without a job.
- A property may have multiple contacts.
- People and organizations are separate CRM entities.
- A property may be associated with an organization.
- Contractor payout is manually entered per job.
- Materials cost is one manually entered internal dollar amount in V1.
- Tax is a manually entered dollar amount; never force a percentage.
- Custom charges may have descriptions and amounts.
- Internal costs and profit must never appear on customer-facing documents.
- Invoice/quote line items are entered from scratch; do not create automatic service packages.
- Invoice design is customizable, but invoice contents are created per invoice.
- Important business records are archived/cancelled/voided instead of hard-deleted.
- Payments are never hard-deleted.
- Job, invoice, and quote numbers are sequential and never reused.
- Tax inclusion in revenue/profit is controlled by settings.
- Unknown CallRail callers do not automatically become contacts.
- Outgoing SMS is not part of V1.
- Card processing is not part of V1.

## 7. UX

The app should be clean, professional, responsive, and quick to operate.

Prefer simple/basic forms with detailed functionality available on detail pages or secondary controls.

Do not overwhelm the main dashboard. Advanced reports and configuration belong in their own areas.

Common actions should be accessible through a global `+ New` action.

The sidebar and dashboard widgets are customizable.

## 8. Data integrity

Use database constraints and server-side validation wherever appropriate.

Financial calculations must be deterministic and tested.

Do not use floating-point arithmetic for stored monetary values. Use integer minor units (e.g. cents) or an appropriate exact decimal database type.

Keep source values separate from calculated values.

Use transactions for multi-record financial operations.

Record important mutations in an audit/activity history.

## 9. Development workflow

Before substantial implementation:
1. Read the relevant specification.
2. Inspect existing code.
3. Make a plan.
4. Implement the smallest coherent change.
5. Add/update tests.
6. Run type checking, linting, unit tests, and relevant end-to-end tests.
7. Review the diff for regressions and secrets.
8. Update documentation when behavior or architecture changes.

Prefer focused commits and feature branches for substantial work.

Do not rewrite working features without a clear reason.

## 10. Testing

Financial tests are mandatory for:
- job totals
- tax
- custom charges
- materials
- contractor payout
- profit
- profit margin
- tax inclusion settings
- full/partial payments
- invoice totals
- quote totals

Also test:
- authentication
- authorization
- contact/property relationships
- duplicate detection
- job creation without a contact
- sequential numbering
- archive/void behavior
- CallRail webhook handling
- email sending
- file access controls

## 11. V1 exclusions

Do not implement unless explicitly requested:
- inventory/SKU management
- outgoing SMS
- card payments
- contractor logins
- customer portal
- automatic Google review verification
- payroll
- full accounting software
- dispatch optimization
- AI customer messaging

Build clean extension points where practical.

## 12. Completion standard

A feature is not complete merely because its UI exists. It must have:
- working persistence
- validation
- authorization
- loading/error/empty states
- mobile behavior
- tests appropriate to its risk
- accessible UI
- audit/history behavior where applicable
- no secrets in source
- documentation if architecture or behavior changed
