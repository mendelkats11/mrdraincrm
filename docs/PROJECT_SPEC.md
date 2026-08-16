# Mr. Drain — Product Specification

Version: 1.0
Status: V1 planning specification

## 1. Product overview

Mr. Drain is a plumbing business platform with two connected surfaces:

1. Public marketing/lead-generation website
2. Private business-management application

Public website:
`https://mrdrainsk.com`

Private application:
`https://app.mrdrainsk.com`

The owner is initially the only user.

The system must support future users/roles without requiring a fundamental rebuild.

---

# 2. Public website

## 2.1 Goals

The website should:

- generate phone calls
- generate free quote requests
- showcase actual completed plumbing work
- build trust
- present services
- present service areas
- support local SEO
- work extremely well on mobile

Primary CTA:
**CALL NOW**

Secondary CTA:
**GET A FREE QUOTE**

## 2.2 Pages

Initial structure:

- Home
- Services
- Service Areas
- Gallery
- Reviews
- About
- Contact

The exact navigation may be adapted for mobile.

## 2.3 Footer

The footer may contain a subtle:
**Log In**

It links to:
`https://app.mrdrainsk.com`

Do not place admin controls in the primary customer navigation.

## 2.4 Mobile CTAs

On mobile, display two clean floating buttons:

- Call Now
- Get a Free Quote

Call Now uses the appropriate CallRail tracking number for the page/service area.

Get a Free Quote opens the contact/quote form.

---

# 3. Public quote/contact form

Fields:

- Name
- Email
- Phone
- Service area
- Issue
- Photos (optional)
- Emergency checkbox

Behavior:

- A submission creates a lead.
- The person is saved as a contact when appropriate.
- The contact remains saved even if the lead does not become a job.
- Emergency is user-selected only.
- Phone calls are not automatically labeled emergency.

---

# 4. Service areas

Initial service areas:

- Brighton
- Rosewood
- College Park
- Stonebridge
- Martensville
- Warman

Service areas are editable from the dashboard.

Each area has:

- name
- slug
- unique copy
- images
- SEO title
- meta description
- CallRail tracking number
- active/hidden status

Area pages must not be simple duplicated city-name templates. They should support genuinely unique content and imagery.

---

# 5. Services

Initial core services:

- Drain snaking
- Hydro jetting
- Toilet replacement
- Hot water tank replacement
- Boiler replacement
- Sump pump
- Bathroom renovations
- Repiping

There should be 20 total editable plumbing services in the initial catalog, with the remaining 12 miscellaneous services chosen/entered during setup.

Services are editable from the dashboard:

- name
- description
- image
- active/hidden
- ordering
- SEO fields

A service can be used as a lead/job category.

Service defaults must not force pricing into invoices.

---

# 6. CRM

## 6.1 People / Contacts

A contact may exist independently of a lead or job.

Fields should support:

- first name
- last name
- display name
- phone numbers
- email addresses
- notes
- date added
- source
- properties
- organizations
- jobs
- leads
- invoices
- quotes
- payments
- reminders
- activity history
- photos/documents where appropriate
- archived state

The contact list includes:

- universal search
- filters
- date-added filtering
- status/archive filtering
- source filtering

## 6.2 Organizations

Organizations/companies are V1 entities.

Examples:

- property management company
- commercial business
- organization with multiple properties

Fields:

- organization name
- phone
- email
- address
- notes
- contacts
- properties
- jobs
- invoices
- quotes
- date added
- archived state

A person can belong to an organization while also having personal/residential properties.

## 6.3 Properties

A property is a distinct location record.

Fields:

- address
- city
- province
- postal code
- unit/suite
- property type
- business name where applicable
- notes
- contacts
- organization
- jobs
- photos
- date added
- archived state

Property types:

- Residential
- Commercial
- Multi-unit
- Industrial
- Other

A property may have multiple contacts.

Contact/property relationship roles may include:

- Primary Contact
- Owner
- Tenant
- Property Manager
- Spouse/Family
- Business Contact
- Other

Property notes are persistent location-level notes.

Job notes are specific to a job.

A property should have a history showing prior jobs and relevant activity.

## 6.4 Leads

Lead statuses:

- New
- Contacted
- Quoted
- Follow Up
- Won
- Lost

Lead source tracking:

- Original source
- Latest source
- Source details
- Landing page where applicable
- Created date
- Converted date

Original source must never be overwritten.

A lead can be converted to a job.

If converted:

- lead becomes Won
- job is linked
- conversion is recorded in activity history

Regardless of outcome, the associated contact remains in the CRM.

---

# 7. Global search

A universal search should be accessible throughout the private application.

Search:

- contacts
- organizations
- properties
- leads
- jobs
- invoices
- quotes
- calls
- messages
- reminders

Search by relevant identifiers such as:

- name
- phone
- email
- address
- job number
- invoice number
- quote number

---

# 8. Jobs

## 8.1 Creation

A job can be created:

- with an existing contact
- with a new contact
- without a contact

At the bottom of the job form, provide an option to create/add the contact during submission.

A job can also be created from:

- a lead
- a contact
- a property
- an incoming CallRail call

## 8.2 Job identifiers

Jobs use sequential permanent identifiers such as:
`JOB-0001`

Settings control:

- prefix
- starting number
- minimum digits

Numbers are never reused.

## 8.3 Job details

A job supports:

- customer/contact
- property
- organization
- service
- issue/description
- emergency toggle
- photos
- internal notes
- date
- time
- time TBD
- contractor
- status
- financial information
- activity timeline

## 8.4 Job statuses

- Draft
- Open
- Scheduled
- In Progress
- Completed
- Cancelled

Draft jobs are saved but should not clutter active operations views.

## 8.5 Separate statuses

Payment status:

- Not Applicable
- Unpaid
- Partially Paid
- Paid
- Refunded

Invoice status:

- Not Created
- Draft
- Sent
- Partially Paid
- Paid
- Void

Contractor status:

- Unassigned
- Assigned
- Completed
- Payout Pending
- Paid

These status systems are independent.

## 8.6 Job timeline

Every job has a chronological activity timeline.

Examples:

- created
- contact attached
- property attached
- contractor assigned
- scheduled
- photo uploaded
- status changed
- invoice created
- invoice emailed
- payment recorded
- notes added
- financial values changed

Important financial changes should show before/after values and who changed them.

---

# 9. Scheduling

Views:

- Day
- Week
- Month
- List

Job scheduling fields:

- date
- start time
- optional end time
- time TBD
- contractor
- customer
- property
- service
- notes

Contractor conflicts produce a warning, not a hard block.

---

# 10. Contractors

Each contractor has:

- name
- phone
- email
- notes
- active/inactive
- default payout arrangement
- date added
- jobs completed
- total job value
- total payout
- total paid
- outstanding payout
- payout history

Contractors do not have logins in V1.

The owner manually enters actual payout per job.

The common business arrangement is often 60/40, but the system must NOT automatically calculate the actual payout from that split.

---

# 11. Job financials

Each job contains internal financial fields:

Revenue-side:

- Job Amount
- Tax Amount
- Custom Charges

Each custom charge has:

- description/note
- amount

Cost-side:

- Materials
- Plumber Payout

All are manually entered except calculated totals.

Materials are one manual dollar amount in V1.

No inventory system.

## 11.1 Calculations

Customer total:
`Job Amount + Tax + Custom Charges`

Total costs:
`Materials + Plumber Payout`

Profit:
`Customer Total - Total Costs`

Profit margin:
`Profit / Customer Total`, where meaningful.

Tax inclusion in revenue/profit is configurable in Settings.

Original raw values must always remain stored.

Monetary arithmetic must use exact representation, not JavaScript floating point.

---

# 12. Payments

Payment methods:

- E-transfer
- Cash
- Cheque
- Other

Card processing is future functionality.

Payments support:

- amount
- date
- method
- reference/note
- job
- invoice
- created-by
- activity history

Partial payments are supported.

Outstanding balance is calculated from recorded payments.

Payments are never hard-deleted.

Default e-transfer address:
`payments@mrdrainsk.com`

---

# 13. Invoices

Not every job requires an invoice.

Invoices are PDF-based customer documents.

## 13.1 Invoice numbering

Sequential:
`INV-0001`

Settings:

- prefix
- starting number
- minimum digits

Numbers are never reused.

## 13.2 Invoice content

Every invoice is built from scratch.

Do NOT create automatic service packages or fixed-price bundles.

Line items support:

- description
- quantity
- unit price
- total

The owner may add unlimited line items.

Invoice content can differ completely from job to job.

## 13.3 Customer-facing information

May include:

- business information
- customer
- service address
- line items
- subtotal
- discounts if supported
- tax
- total
- payment instructions
- notes
- footer

Internal information must NEVER appear:

- materials cost
- contractor payout
- internal profit
- internal notes

## 13.4 Invoice template

The invoice design is customizable.

Customizable:

- logo
- business information
- invoice title
- colors/layout within the design system
- typography choices supported by the template
- numbering
- payment instructions
- notes
- footer
- thank-you message

The design template is saved; the invoice contents are not prefilled from packages.

---

# 14. Quotes

Formal quotes are optional.

Normal verbal quotes do not require a quote document.

When a formal quote is required, generate a PDF.

Quote supports:

- customer
- property
- organization
- description
- line items
- tax
- custom charges
- notes
- logo
- quote number
- date
- expiration if desired

Quote statuses:

- Draft
- Sent
- Accepted
- Declined
- Expired

Quotes may be converted into jobs.

Quote numbering is sequential and never reused.

---

# 15. Communications

## 15.1 Resend

Use Resend for application-generated email.

Possible emails:

- quote request acknowledgement
- appointment confirmation
- invoice
- quote
- payment receipt
- review request
- manual confirmation
- admin notification

Email templates should be editable.

Sent emails should appear in relevant activity history when technically possible.

Hostinger remains the domain/DNS and existing mailbox provider.

## 15.2 Review requests

Do not attempt to automatically determine whether a customer actually left a Google review.

The system may send a review-request email.

If customer chooses 5 stars, direct them toward the company's Google review page.

Lower ratings can instead invite private contact.

---

# 16. CallRail

CallRail is used for calls and tracking numbers.

Initial tracking numbers correspond to service areas:

- Brighton
- Rosewood
- College Park
- Stonebridge
- Martensville
- Warman

Tracking numbers are editable from the service-area configuration.

A service-area page's Call Now button uses its assigned tracking number.

General pages may use a default number.

## 16.1 Calls

Call records should include available CallRail information such as:

- caller number
- matched contact when known
- tracking number
- service area
- date/time
- duration
- answered/missed
- source
- other useful CallRail metadata

## 16.2 Unknown callers

Unknown callers do NOT automatically become contacts.

The dashboard should offer:

- Create Contact
- Create Lead
- Ignore

If a contact is later created, matching historical calls may be associated with the contact.

## 16.3 Existing callers

If the phone number matches a contact, show:

- contact name
- previous activity
- previous jobs

Quick actions:

- View Contact
- Create Lead
- Create Job

## 16.4 Incoming texts

Incoming CallRail texts are available in a dedicated Messages tab.

V1 supports receiving/viewing messages.

Outgoing SMS is intentionally excluded from V1.

The architecture should allow outbound messaging later.

---

# 17. Reminders

Reminders may be created from any relevant record.

Fields:

- title
- description
- date
- time
- priority
- contact
- organization
- property
- job
- completed state

Presets may include:

- Call customer
- Follow up
- Collect payment
- Send invoice
- Send quote
- Check job
- Contractor follow-up
- Custom

Recurring reminders may support:

- one time
- daily
- weekly
- monthly
- yearly
- custom

Completing a reminder preserves it in history.

Dashboard should show:

- due today
- upcoming
- overdue

Email reminder settings are configurable.

---

# 18. Photos and files

Job photos are private by default.

Photos may be categorized:

- Before
- During
- After
- Other

Photos can be:

- uploaded
- renamed/edited metadata
- moved between categories
- deleted with confirmation
- added to website gallery explicitly

Gallery photos are separate from private job photos in terms of publication state.

Uploaded invoices/quotes/documents must use appropriate access controls.

---

# 19. Website CMS

The private app manages public website content.

Sections:

- Homepage
- Services
- Service Areas
- Gallery
- Reviews
- About
- Contact
- SEO
- Branding

## 19.1 Structured homepage editor

Do not build an unrestricted visual page builder.

Use structured sections:

- Hero
- Services
- Gallery
- Service Areas
- Reviews
- Why Mr. Drain
- CTA

Allow editing of content, selected items, images, and ordering without allowing the owner to break the page structure.

## 19.2 Gallery

Support:

- upload
- delete
- edit metadata
- hide/show
- feature
- filter by service
- filter by area
- filter by date

Job photos may be explicitly published to the gallery.

## 19.3 Reviews

Manual review records:

- customer name
- review text
- rating
- date
- featured state

No automatic Google review verification.

---

# 20. SEO

Services, service areas, and major pages support:

- SEO title
- meta description
- URL slug
- Open Graph title
- Open Graph description
- social image
- image alt text

Generate sensible defaults.

Support appropriate structured data for a local plumbing business.

Do not generate thin duplicate city pages.

---

# 21. Dashboard

Main dashboard has a toggle:

**Operations | Financial**

## Operations

Show configurable widgets such as:

- new leads
- open jobs
- today's jobs
- emergency requests
- overdue reminders
- outstanding invoices
- contractor payouts pending
- recent activity

Today's schedule should be visible.

## Financial

Selected date range controls financial widgets.

Show:

- revenue
- profit
- materials
- contractor payouts
- outstanding
- revenue/profit trend
- breakdowns

## Date ranges

- Today
- Yesterday
- This week
- This month
- Last month
- This quarter
- This year
- Last year
- Custom

---

# 22. Reports

Reports:

- Revenue
- Profit
- Contractors
- Jobs
- Leads
- CallRail

Filters should support appropriate date/service/area/contractor/status/source dimensions.

Exports:

- CSV
- PDF where appropriate

---

# 23. Quick actions

Persistent `+ New` action:

- New Lead
- New Contact
- New Organization
- New Property
- New Job
- New Invoice
- New Quote
- New Reminder
- Record Payment
- Upload Photos

---

# 24. Notifications

Notifications may include:

- new quote request
- CallRail call
- incoming text
- emergency request
- overdue invoice
- payment received
- reminder due
- contractor payout pending
- system warning

Each notification links to the relevant record.

Notification settings control dashboard/email delivery.

---

# 25. Sidebar customization

The owner can:

- show/hide sections
- reorder sections
- collapse the sidebar
- customize dashboard widgets

Sensible defaults are provided.

---

# 26. Authentication

Private app:
`app.mrdrainsk.com`

Initial authentication:

- email/password
- password reset
- secure sessions
- remember-me behavior if implemented safely
- logout
- logout all devices
- optional 2FA architecture

Registration is invite-only.

Only the owner is required in V1.

---

# 27. Record deletion policy

Important business records are not hard-deleted.

Jobs:

- cancel/archive

Invoices:

- void

Payments:

- never hard-delete

Contacts:

- archive

Leads:

- archive

Quotes:

- void/archive

Services:

- hide/archive

Service areas:

- hide/archive

Photos:

- delete with confirmation

---

# 28. Audit/activity history

Important changes should be recorded.

Examples:

- job amount changed
- tax changed
- custom charge changed
- materials changed
- payout changed
- invoice created
- invoice voided
- payment recorded
- contact attached
- contractor assigned
- status changed

Where relevant, record:

- actor
- timestamp
- entity
- action
- old value
- new value

---

# 29. Financial reporting principle

The system must preserve raw financial inputs separately from derived totals.

Changing a reporting setting must not rewrite historical raw data.

The financial engine must be covered by automated tests.

---

# 30. V1 exclusions

Do not build:

- inventory management
- SKU tracking
- outgoing SMS
- card payments
- contractor logins
- customer portal
- automatic Google review verification
- payroll
- full accounting system
- advanced dispatch optimization
- AI customer communication

The architecture should allow future additions.

---

# 31. Future extensibility

Potential later additions:

- card payments
- outgoing SMS
- contractor accounts
- customer portal
- inventory
- more service areas
- more users
- roles/permissions
- advanced accounting
- automated dispatch
- richer CallRail analytics
