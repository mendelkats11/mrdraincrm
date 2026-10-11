# Mr. Drain — Claude Code Instructions

## 1. Project

Mr. Drain Plumber's public marketing website: `https://mrdrainsk.com`.

It is a fully static Next.js site. There is no database, no login, and no admin area. The private business app that used to live at `app.mrdrainsk.com` (CRM, invoicing, CallRail polling, reminders) was retired in Oct 2026 and deleted from the codebase; it is recoverable from git history at commit `f8d58ed` if ever needed.

## 2. Priorities

1. Correct, honest content (never fabricate licences, insurance, years in business, reviews, or review counts)
2. Security and privacy
3. Local SEO and page speed
4. Accessibility and mobile behavior
5. Simplicity and low operating cost ($0 added infrastructure)

## 3. Stack and hosting

- Next.js (App Router) + TypeScript + Tailwind CSS 4
- Deployed on Hostinger as a persistent Node.js web app; it auto-pulls from GitHub on push to `main` and runs `npm run build`
- The build script uses `next build --webpack`. Turbopack's PostCSS child-process pool crashed on Hostinger's builds, so do not switch it back without testing there
- Cloudflare R2 holds the site's photos (served same-origin through `/api/public-assets/`)
- Resend sends the contact-form email
- Do not add paid infrastructure unless explicitly approved

## 4. Content

All site content lives in `src/lib/website/site-data.ts` (services, areas, portfolio jobs, gallery, settings) and `src/lib/website/legal-content.ts` (terms, privacy). Editing those files is the CMS. Pages are prerendered at build time with `generateStaticParams`.

- Photo keys in `site-data.ts` must be real R2 object keys. Verify against the bucket; never guess or reuse another ID
- Services with no genuinely matching photo use `imageKey: null` and render a clean fallback header
- The business is a lead-generation / referral business. Terms and privacy copy was supplied by the owner; do not rewrite it

## 5. Contact form

`POST /api/leads` validates input with zod, rate-limits per IP in memory, and emails the result to `LEAD_NOTIFICATION_EMAILS` through Resend. Nothing is stored, so a failed send means a lost lead; it returns 500 rather than pretending success. All visitor text is HTML-escaped in the email body.

## 6. Environment variables

See `.env.example`. Never commit `.env.local` or any secret, and never expose them to browser code.

## 7. Workflow

1. Read the relevant code before changing it
2. Make the smallest coherent change
3. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`
4. Check the result in a browser for anything visible
5. Review the diff for secrets before committing
6. Pushing to `main` deploys to production

## 8. Dependencies

Run `npm audit --omit=dev`; production dependencies should stay at zero known vulnerabilities. Check `node_modules/next/dist/docs/` before upgrading Next.js.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
