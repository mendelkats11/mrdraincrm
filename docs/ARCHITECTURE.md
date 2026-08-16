# Mr. Drain — Technical Architecture

## 1. Principles

The system should be:

- secure
- modular
- testable
- provider-portable
- inexpensive initially
- suitable for a small business
- scalable without premature complexity

Prefer simple architecture over microservices.

Use one primary Next.js application with clear domain modules.

---

# 2. Applications

The repository should support:

Public website:
`mrdrainsk.com`

Private app:
`app.mrdrainsk.com`

They may share the same Next.js codebase while using separate route/layout boundaries.

Recommended logical structure:

```text
src/
  app/
    (public)/
    (app)/
    api/
  components/
  features/
    crm/
    leads/
    jobs/
    scheduling/
    financials/
    invoices/
    quotes/
    contractors/
    communications/
    website/
    reports/
  lib/
    auth/
    db/
    storage/
    email/
    callrail/
    audit/
  tests/
```

Exact structure may be adjusted by Claude after inspecting the current Next.js conventions.

---

# 3. Domain model

Core entities:

- User
- Person/Contact
- Organization
- Property
- ContactProperty
- OrganizationProperty
- Lead
- Job
- JobPhoto
- Contractor
- ContractorPayout
- Invoice
- InvoiceLineItem
- Quote
- QuoteLineItem
- Payment
- Reminder
- Call
- Message
- Service
- ServiceArea
- Review
- GalleryItem
- EmailEvent
- Activity
- Notification
- Setting
- Sequence

---

# 4. Relationships

## Person

A person may:

- have many properties
- belong to many organizations if needed
- have many leads
- have many jobs
- have many invoices/quotes/payments
- have many reminders
- have many calls/messages

## Organization

An organization may:

- have many people
- have many properties
- have many jobs
- have many invoices/quotes

## Property

A property may:

- have many people
- belong to an organization
- have many jobs
- have many photos
- have persistent property notes

## Job

A job may:

- optionally belong to a person
- optionally belong to a property
- optionally belong to an organization
- optionally originate from a lead
- have one or more contractors over its lifecycle if needed
- have many photos
- have one or more invoices if future requirements demand it, but default to one
- have many payments
- have many activities
- have one set of internal financial inputs

Use nullable foreign keys where the product explicitly allows orphan/unattached creation.

---

# 5. Monetary representation

Use integer minor units or exact decimal types.

Preferred application representation:

- integer cents for monetary calculations

Database monetary fields should not use floating point.

Example:
`$1,675.00` → `167500`

Display formatting occurs at the UI boundary.

---

# 6. Financial engine

Keep financial calculations in a dedicated pure domain module.

Inputs:

- job amount
- tax
- custom charges
- materials
- contractor payout
- tax inclusion settings

Outputs:

- customer total
- total costs
- profit
- profit margin
- outstanding balance where payments are included

The engine must be deterministic and unit tested.

Do not calculate financial values differently in different UI components.

---

# 7. Number sequences

Use a dedicated sequence mechanism.

Sequences:

- jobs
- invoices
- quotes

Properties:

- prefix
- current/next number
- minimum digits

Allocation must be transactional so concurrent creation cannot produce duplicate numbers.

Never recycle a number.

---

# 8. Database

Use PostgreSQL-compatible relational persistence.

Requirements:

- migrations
- foreign keys
- indexes
- unique constraints where appropriate
- check constraints where practical
- transaction support

Important indexes include:

- normalized phone
- normalized email
- job number
- invoice number
- quote number
- property address/search fields
- created_at
- status fields
- foreign keys used in timelines/search

Search architecture may begin with PostgreSQL indexes and evolve later if volume requires it.

---

# 9. Authentication

Use a mature authentication approach compatible with Next.js and the selected database.

Requirements:

- password hashing using a modern password hashing algorithm
- secure session handling
- password reset
- invite-only registration
- secure cookies
- CSRF protection where applicable
- authorization on every protected server mutation
- optional 2FA-ready design

Do not build password hashing or session cryptography from scratch.

---

# 10. Authorization

V1 has one owner/admin role.

Still model authorization as a service/policy layer so future roles can be introduced.

Every server-side operation should verify:

1. authenticated user
2. permission
3. record access

Do not rely on hidden UI elements for authorization.

---

# 11. File storage

Store large files outside PostgreSQL.

Use a storage abstraction:

```text
StorageProvider
  upload()
  download()
  delete()
  getSignedUrl()
```

Initial provider may be Netlify Blob or another $0-compatible object store.

Private job files must not be publicly accessible by default.

Use signed/authorized access where supported.

Gallery assets may be public.

---

# 12. PDF generation

PDF generation should be server-side.

Invoice and quote PDFs should be generated from structured document data.

The renderer must distinguish:

- customer-facing fields
- internal-only fields

Never pass internal cost fields into customer document templates unless explicitly required for an internal report.

PDF generation should be testable with representative fixtures.

---

# 13. Email

Create an email abstraction:

```text
EmailProvider
  send()
```

Initial provider:
Resend.

Email templates should be versionable and editable.

Email sending should happen server-side.

Record appropriate email activity/events without storing unnecessary sensitive content.

---

# 14. CallRail integration

Create a CallRail service abstraction.

Responsibilities:

- API authentication
- retrieving relevant call/message data when needed
- webhook validation
- normalization of incoming events
- contact matching
- activity creation

Do not automatically create contacts for unknown callers.

Normalize phone numbers before matching.

Webhook handling must be idempotent.

Store external event IDs to prevent duplicate processing.

Tracking numbers should be stored in service-area configuration, not hard-coded in components.

---

# 15. Webhooks

Webhook handlers must:

- authenticate/verify where supported
- validate payloads
- normalize data
- be idempotent
- log failures safely
- avoid exposing secrets
- return appropriate HTTP status codes

CallRail events should not create duplicate records if delivered multiple times.

---

# 16. Activity system

Create a generic activity/event model for relevant business history.

Fields may include:

- id
- actor
- entity type
- entity id
- action
- metadata
- created_at

Sensitive information should not be blindly copied into metadata.

Activity records should be append-oriented.

---

# 17. Notifications

Use an internal notification model.

A notification can reference:

- recipient
- type
- title
- body
- entity
- read state
- created_at

Email notification delivery should be separate from dashboard notification creation.

---

# 18. Search

Start with PostgreSQL-backed search.

Normalize:

- phone
- email
- names

Search should support partial matching where practical.

A future search abstraction may allow a dedicated search provider if needed.

---

# 19. Website CMS

Website content should be data-driven.

Services, service areas, gallery items, reviews, and structured homepage sections should live in the database rather than being hard-coded.

The public website reads published/active content.

Draft/unpublished CMS content should remain private.

---

# 20. Caching and revalidation

Public website content can be cached aggressively.

When CMS content changes, trigger targeted revalidation rather than requiring a full redeploy.

Do not cache private app data publicly.

---

# 21. Netlify

Target deployment:
Netlify.

Netlify's current Next.js integration supports the App Router, route handlers/API routes, server actions, SSR/ISR, middleware, and image optimization through its OpenNext-based runtime.

Avoid unnecessary platform-specific code.

Do not pin the Netlify Next.js adapter unless there is a documented reason.

---

# 22. Environment variables

Expected categories:

```text
DATABASE_URL
AUTH_SECRET
RESEND_API_KEY
CALLRAIL_API_KEY
CALLRAIL_WEBHOOK_SECRET
STORAGE credentials if required
APP_URL
PUBLIC_SITE_URL
```

Use placeholders/documentation only.

Never commit real values.

---

# 23. DNS

Target:

- `mrdrainsk.com` → public site
- `app.mrdrainsk.com` → private app

DNS is managed through the existing domain provider.

The exact DNS records should be documented during deployment rather than guessed.

---

# 24. Error handling

All user-facing operations need:

- loading state
- empty state
- validation errors
- recoverable error message
- retry where appropriate

Do not leak stack traces, database errors, API keys, or internal implementation details to users.

Server logs should contain enough diagnostic context without unnecessarily storing personal data.

---

# 25. Backups

Business data must have an automated backup strategy.

Requirements:

- database backups
- file backups
- retention policy
- manual backup option
- documented restore process

If the initial $0 provider cannot satisfy all backup requirements, implement the strongest free option and document the limitation rather than pretending the system has enterprise-grade backups.

---

# 26. Testing architecture

Use:

- unit tests for pure business logic
- integration tests for database/service behavior
- end-to-end tests for critical user flows

Critical E2E flows:

- login
- create contact
- create property
- create job without contact
- attach contact to job
- create completed job
- calculate financials
- create invoice
- generate PDF
- record payment
- view balance
- CallRail webhook processing
- public quote submission

---

# 27. Portability

Avoid putting business logic inside provider-specific code.

Use interfaces for:

- database access where practical
- storage
- email
- CallRail
- payment providers
- notifications

Netlify is the initial deployment target, not a permanent architectural dependency.

---

# 28. Privacy

Customer information is private business data.

Do not:

- expose customer data in public pages
- expose internal financials to customers
- expose private job photos publicly without explicit publication
- put personal information into URLs unnecessarily
- log sensitive data casually

Follow least-privilege principles.
