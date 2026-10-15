# Choirbook

The shared book for running a choir: rehearsals and attendance, music and learning
tracks, messages, forms, fees, tickets and a staff dashboard. Built for a two-choir
pilot in Canada, in English and French.

## What is where

| Folder | What it holds |
| --- | --- |
| `web/` | The website (Next.js 16, React 19, TypeScript). Deployed to Vercel. |
| `supabase/` | The database: migrations (tables and security rules), email templates, tests. |
| `packages/ui/` | The Choirbook design system as typed React components (from the prototype). |
| `packages/shared/` | Code shared by the website and, later, the native apps: EN/FR strings, validation, business rules, database types. |
| `prototype/` | The original clickable prototype. The visual and behavioural reference; not changed. |
| `prompts/` | The build plans. |
| `docs/` | Setup and operating notes. |

## Working on it

Needs Node.js 22 or newer.

```bash
npm install
npm run dev          # website on http://localhost:3000 (needs web/.env.local, see web/.env.example)
npm run test:db      # database security tests (in-memory Postgres, no Docker needed)
npm test             # unit tests
npm run typecheck
npm run lint
npm run db:types:local   # regenerate packages/shared/src/database.types.ts after changing a migration
```

## How security works

Every table has row-level security. A member only ever sees their own choir; choristers
see their own records and choir-wide content; staff see what their role allows, area by
area (none, view or edit); staff notes are staff-only. The rules live in the database, so
the future iPhone and Android apps get exactly the same protection. `supabase/tests`
checks them for every table and role on every change.

See `docs/setup.md` for connecting Supabase, Vercel, Stripe and Resend.
