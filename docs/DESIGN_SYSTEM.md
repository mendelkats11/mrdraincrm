# Mr. Drain — Design System

## 1. Overall direction

The visual identity should be:

- clean
- professional
- modern
- trustworthy
- local
- approachable
- confident

Avoid:

- generic SaaS-looking dashboards
- excessive gradients
- clutter
- gimmicky animations
- overly playful plumbing imagery
- huge amounts of text

The mascot may be used as a brand element in appropriate areas.

Actual job photography should be prioritized for trust-building.

---

# 2. Public website

The public website should feel like a premium local plumbing company rather than a software template.

Priorities:

1. Call conversion
2. Quote conversion
3. Trust
4. Service clarity
5. Local relevance
6. Speed

Use strong visual hierarchy.

Primary CTA:
**CALL NOW**

Secondary CTA:
**GET A FREE QUOTE**

---

# 3. Real photography

Use actual Mr. Drain job photos where available.

Do not invent fake "job" imagery.

The gallery should feel like evidence of real work.

Images should support:

- service
- service area
- before/after
- workmanship

---

# 4. Mascot

The mascot can appear throughout the website, but should be used intentionally.

Possible uses:

- hero
- service-area illustrations
- empty states
- calls to action
- marketing sections

Avoid putting the mascot everywhere.

---

# 5. App UI

The private application should feel like a professional operations tool.

Use:

- clean cards
- compact but readable tables
- clear status badges
- strong spacing
- obvious primary actions
- predictable forms

The app should prioritize information density without becoming visually noisy.

---

# 6. Navigation

Desktop:

- left sidebar
- top global search/action area

Mobile:

- compact top bar
- bottom navigation for primary actions
- slide-out navigation for secondary sections
- central `+ New` action

Sidebar is customizable:

- show/hide
- reorder
- collapse

---

# 7. Dashboard

Top:

- global search
- notifications
- account

Main:

- Operations / Financial toggle
- date range where relevant
- configurable widgets

Avoid filling the dashboard with every available statistic.

Advanced reporting belongs in Reports.

---

# 8. Colors

Use the existing Mr. Drain brand colors from the supplied logo/brand assets.

Do not invent a completely unrelated palette.

Define semantic tokens:

- background
- surface
- foreground
- muted
- border
- primary
- primary foreground
- success
- warning
- destructive
- info

Use semantic tokens rather than hard-coding colors throughout components.

---

# 9. Typography

Use a highly legible modern sans-serif.

Prioritize:

- clear headings
- readable body text
- compact table text
- strong numerical hierarchy

Avoid excessive font variation.

---

# 10. Buttons

Primary:

- high-contrast
- obvious
- used for main action

Secondary:

- quieter
- used for alternative action

Destructive:

- clearly separated
- requires confirmation for dangerous operations

Icon-only buttons must have accessible labels/tooltips.

---

# 11. Forms

Forms should be:

- short
- clearly grouped
- labeled
- keyboard accessible
- mobile friendly

Use:

- inline validation
- clear error messages
- sensible defaults
- progressive disclosure

Do not show advanced fields unless needed.

The New Job form should support Basic/Detailed presentation.

---

# 12. Tables

Tables should support:

- sorting where useful
- filtering
- search
- pagination for larger datasets
- responsive mobile treatment

On mobile, use cards or horizontally scrollable tables where appropriate.

---

# 13. Status colors

Status should not be communicated by color alone.

Use:

- text
- icon
- color

Examples:

- Draft
- Open
- Scheduled
- In Progress
- Completed
- Cancelled
- Paid
- Unpaid
- Emergency

---

# 14. Emergency UI

Emergency jobs/leads should be highly visible but not visually overwhelming.

Use a clear warning treatment:

- icon
- label
- appropriate semantic warning/destructive styling

Do not imply that a phone call is an emergency unless explicitly marked.

---

# 15. PDFs

Invoices and quotes should look professional when printed or emailed.

They should include:

- logo
- business information
- customer information
- service address
- line items
- totals
- payment instructions
- notes/footer

Internal costs never appear.

---

# 16. Accessibility

Target WCAG 2.2 AA principles where practical.

Requirements:

- keyboard navigation
- visible focus
- semantic HTML
- sufficient contrast
- accessible labels
- meaningful error messages
- reduced-motion consideration
- touch targets appropriate for mobile

---

# 17. Responsive behavior

Design for:

- desktop
- tablet
- mobile

Do not merely scale the desktop layout down.

Mobile is a first-class experience, especially for:

- dashboard
- jobs
- contacts
- calls
- reminders
- quick actions

---

# 18. Empty states

Empty states should be useful.

Example:

No jobs yet.

> Your jobs will appear here.
>
> `[ + New Job ]`

Use mascot imagery sparingly where appropriate.

---

# 19. Confirmation dialogs

Require confirmation for:

- voiding invoices
- deleting photos
- destructive settings
- irreversible actions

Archive/cancel actions should explain their effect.

---

# 20. Loading and errors

Every data-heavy view needs:

- loading state
- empty state
- error state
- retry option where appropriate

Do not leave blank screens.

---

# 21. UX philosophy

The owner should be able to:

- create a job quickly
- find a customer quickly
- see today's jobs quickly
- see money quickly
- create an invoice without fighting the UI
- record a payment quickly
- respond to leads quickly

The interface should reduce typing and duplicate data entry wherever the information already exists.
