# Mr. Drain — Development Roadmap

## Rules

Build in phases.

Do not attempt to build the entire product in one pass.

At the end of each phase:
1. Run tests.
2. Run type checking.
3. Run linting.
4. Review the UI.
5. Verify mobile behavior.
6. Verify security.
7. Update documentation.
8. Commit the completed phase.

Do not begin the next major phase if the previous phase is broken.

---

# Phase 0 — Repository foundation

Build:
- Git repository
- Next.js project
- TypeScript
- styling/component foundation
- linting
- formatting
- testing
- environment variable structure
- basic README
- CLAUDE.md integration
- deployment skeleton

Acceptance:
- local development works
- production build works
- Netlify can deploy the project
- no secrets committed

---

# Phase 1 — Domain/database foundation

Build:
- PostgreSQL schema
- migrations
- core entities
- relationships
- sequences
- audit/activity model
- settings model

Acceptance:
- migrations run cleanly
- constraints work
- sequence allocation is concurrency-safe
- seed/development data is available

---

# Phase 2 — Authentication

Build:
- app subdomain structure
- login
- logout
- password reset
- protected routes
- invite-only registration
- secure sessions
- owner/admin role

Acceptance:
- unauthenticated users cannot access app
- public website remains public
- password reset works
- authorization is server-side

---

# Phase 3 — CRM

Build:
- contacts
- organizations
- properties
- relationships
- contact roles
- search
- filters
- archive
- duplicate detection suggestions
- merge workflow
- timelines

Acceptance:
- property can have multiple contacts
- organization can have multiple properties
- contact can exist without job
- property can exist without job
- duplicates are not automatically merged

---

# Phase 4 — Leads

Build:
- lead creation
- website quote form
- lead statuses
- source tracking
- original/latest source
- landing page tracking
- conversion to job

Acceptance:
- quote form creates lead
- contact remains after lost lead
- source attribution is preserved

---

# Phase 5 — Jobs

Build:
- job creation
- draft jobs
- statuses
- contact/property attachment
- job numbers
- service
- issue
- emergency toggle
- photos
- internal notes
- activity timeline

Acceptance:
- job can be created without contact
- contact can be added during creation
- numbering is sequential
- important changes are audited

---

# Phase 6 — Scheduling

Build:
- day/week/month/list views
- date/time
- time TBD
- contractor assignment
- conflict warnings
- schedule from job

Acceptance:
- contractor conflict warns but does not block
- mobile scheduling is usable

---

# Phase 7 — Contractors

Build:
- contractor records
- contractor details
- job assignments
- payout history
- completed jobs
- totals
- outstanding payouts

Acceptance:
- actual payout remains manually entered
- contractor statistics reconcile with jobs

---

# Phase 8 — Financial engine

Build:
- job amount
- manual tax
- custom charges
- materials
- manual contractor payout
- tax inclusion settings
- customer total
- costs
- profit
- margin
- financial dashboard

Acceptance:
- extensive automated calculation tests
- exact monetary arithmetic
- historical values remain stable when settings change

---

# Phase 9 — Payments

Build:
- payment records
- E-transfer
- cash
- cheque
- other
- partial payments
- balances
- mark paid
- payment activity

Acceptance:
- partial payment works
- balance is correct
- payments cannot be hard-deleted

---

# Phase 10 — Invoices

Build:
- invoice records
- sequential numbering
- from-scratch line items
- customizable invoice template
- PDF generation
- preview
- download
- email
- invoice status

Acceptance:
- internal costs never appear in PDFs
- invoice numbers never repeat
- PDF is professional and printable

---

# Phase 11 — Quotes

Build:
- quote records
- from-scratch line items
- PDF
- customizable template
- statuses
- email
- conversion to job

Acceptance:
- quote-to-job conversion preserves relevant information
- quote numbers never repeat

---

# Phase 12 — Reminders/notifications

Build:
- reminders
- due/upcoming/overdue
- recurring reminders
- dashboard notifications
- configurable email notifications

Acceptance:
- completed reminders remain in history

---

# Phase 13 — CallRail

Build:
- CallRail API abstraction
- webhook handling
- tracking number configuration
- call records
- unknown caller workflow
- existing caller matching
- incoming texts
- Messages tab

Acceptance:
- duplicate webhooks are safely ignored
- unknown callers are not auto-created
- known callers are matched
- outgoing SMS remains disabled

---

# Phase 14 — Resend/email

Build:
- email provider abstraction
- Resend integration
- templates
- invoice emails
- quote emails
- confirmation emails
- review requests
- notification emails

Acceptance:
- emails are sent server-side
- secrets never reach browser
- failures are handled gracefully

---

# Phase 15 — Website CMS

Build:
- services CMS
- service areas CMS
- gallery
- reviews
- homepage structured editor
- about/contact content
- SEO fields
- publishing state

Acceptance:
- owner can add/remove/edit services
- owner can add/remove gallery photos
- service-area content is unique/editable
- published content updates without code changes

---

# Phase 16 — Reports

Build:
- revenue
- profit
- contractor
- jobs
- leads
- CallRail reports
- date ranges
- filters
- CSV export
- PDF export where useful

Acceptance:
- reports reconcile with underlying records

---

# Phase 17 — Dashboard customization

Build:
- Operations/Financial toggle
- configurable widgets
- sidebar customization
- quick actions
- global search
- notifications

Acceptance:
- preferences persist per user

---

# Phase 18 — Security and production hardening

Review:
- authentication
- authorization
- rate limits
- webhook verification
- input validation
- file access
- audit logging
- secret handling
- headers
- CSRF protections where relevant
- database permissions
- error handling
- backups
- restore documentation

Perform:
- dependency audit
- production build
- end-to-end regression tests

---

# Phase 19 — Production launch

Configure:
- `mrdrainsk.com`
- `app.mrdrainsk.com`
- DNS
- SSL
- production environment variables
- Resend domain authentication
- CallRail webhooks
- storage
- database
- monitoring
- backups

Final acceptance:
- public website works
- app login works
- quote form works
- CRM works
- jobs work
- financials reconcile
- PDFs work
- email works
- CallRail works
- mobile experience works

---

# Explicitly defer

Do not implement unless separately approved:
- card payments
- outgoing SMS
- contractor accounts
- customer portal
- inventory
- payroll
- advanced accounting
- dispatch optimization
- AI communication

---

# Development principle

If a phase reveals that an earlier architectural decision is wrong, stop and document the issue before making a broad rewrite.

Prefer small migrations and backward-compatible changes.

Never silently destroy business data to make a feature easier to implement.
