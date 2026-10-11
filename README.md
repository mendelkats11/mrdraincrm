# Mr. Drain Plumber website

The public marketing site for Mr. Drain Plumber (`https://mrdrainsk.com`): a fully static Next.js site with a contact form that emails leads to the business.

There is no database and no admin app. The private CRM that used to run at `app.mrdrainsk.com` was retired in Oct 2026; see `CLAUDE.md` for how to recover it from git history.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev                  # http://localhost:3000
```

| Command             | What it does               |
| ------------------- | -------------------------- |
| `npm run dev`       | Development server         |
| `npm run build`     | Production build (webpack) |
| `npm start`         | Serve the production build |
| `npm run typecheck` | TypeScript check           |
| `npm run lint`      | ESLint                     |
| `npm test`          | Unit tests (Vitest)        |
| `npm run format`    | Prettier                   |

## Editing content

Services, service areas, portfolio jobs, gallery photos and business settings are plain TypeScript in `src/lib/website/site-data.ts`. Terms and privacy text is in `src/lib/website/legal-content.ts`. Push to `main` and Hostinger rebuilds and deploys.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Cloudflare R2 (photos) · Resend (contact-form email) · hosted on Hostinger.
