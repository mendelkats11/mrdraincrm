# Mr. Drain

Plumbing business platform: a public marketing website (`mrdrainsk.com`) and a
private business-management application (`app.mrdrainsk.com`), sharing one
Next.js codebase.

**Status: Phase 0 (repository foundation) complete.** No business features
exist yet. See `docs/ROADMAP.md` for the phase plan.

## Documentation

Read in this order before making changes:

1. [`CLAUDE.md`](./CLAUDE.md) — priorities, critical business rules, and
   working conventions. Source of truth for how this project is built.
2. [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md) — product requirements.
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — technical architecture.
4. [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — visual/UX system.
5. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phase-by-phase build plan.
6. [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — the
   finalized architecture decisions, database design, and detailed phase
   breakdown this project is being built against.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS + shadcn/ui (Radix) ·
Neon Postgres + Drizzle ORM (from Phase 1) · Cloudflare R2 (from Phase 5) ·
Resend (from Phase 14) · CallRail API (from Phase 13) · Vitest + Playwright ·
deployed on Netlify.

Full reasoning for every choice is in `docs/IMPLEMENTATION_PLAN.md` §4–5.

## Local development

Requires Node 24 (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # fill in local values as later phases need them
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

| Command                           | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Start the local dev server                |
| `npm run build`                   | Production build                          |
| `npm run start`                   | Run the production build locally          |
| `npm run lint`                    | ESLint                                    |
| `npm run typecheck`               | TypeScript type checking (`tsc --noEmit`) |
| `npm run format` / `format:check` | Prettier write / check                    |
| `npm test`                        | Unit tests (Vitest)                       |
| `npm run test:watch`              | Unit tests in watch mode                  |
| `npm run e2e`                     | End-to-end tests (Playwright)             |

## Environment variables

See [`.env.example`](./.env.example) for the full list with explanations.
Copy it to `.env.local` for local development — never commit real secrets.
`.env.local` and `.env` are gitignored.

## Deployment

Deployed on Hostinger as a Node.js Web App (a persistent `next start`
process, not serverless) — the project originally targeted Netlify, hence
references to it elsewhere in these docs; it has since moved. Hostinger
auto-pulls and rebuilds from GitHub on every push to `main`. Because there's
no serverless scheduled-function equivalent on Hostinger, recurring work
(CallRail polling, reminder processing) runs as a plain in-process
`setInterval` in `src/instrumentation.ts` instead.

## Project structure

```
src/
  app/            Next.js App Router routes
    api/health/   Basic health-check endpoint
  components/ui/  shadcn/ui components
  lib/            Shared utilities (grows into auth/db/storage/email/... per phase)
  tests/
    unit/         Vitest
    e2e/          Playwright
docs/             Product spec, architecture, design system, roadmap, implementation plan
```

The fuller target module structure (`features/`, `lib/auth`, `lib/db`, etc.)
is documented in `docs/IMPLEMENTATION_PLAN.md` §11 and is introduced
incrementally as each phase actually needs it, rather than stubbed out empty
ahead of time.
