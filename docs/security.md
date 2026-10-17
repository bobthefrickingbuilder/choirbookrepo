# Security and privacy checklist

The state of Choirbook's privacy, consent and safety work (Phase 6), checked
before any real member data arrives in Phase 7. ✅ done and tested, 🟡 done with
a caveat, ⏳ needs Matthew.

## Access to data

- ✅ **Row-level security on every table.** Members see only their own choir;
  choristers see themselves and choir-wide content; staff see what their role
  allows. Tested for every table and role (`supabase/tests/rls.test.ts`,
  `staff.test.ts`, `dashboard.test.ts`, `privacy.test.ts`), including a chorister
  reading another chorister and staff of one choir reading another choir.
- ✅ **Staff notes** are staff-only; **care and medical notes** need the "care"
  permission; members never see either about others.
- ✅ **Privacy-protective defaults.** Members' email, phone and photo are hidden
  from other members (`people.contact_visibility = 'private'`) until the member
  turns sharing on in their profile. Other members see names and sections only,
  through `member_directory`.
- ✅ **The secret (service role) key** lives only in Vercel's server environment
  and is used only in server code (`web/src/lib/supabase/admin.ts` is
  `server-only`). It is never sent to the browser or committed.
- ✅ **Secrets** are never committed: `.env.local` is ignored and
  `web/.env.example` lists names only.
- ✅ **No personal data goes to any third-party AI service.** There is no AI
  integration in the app.

## Audit log

- ✅ Every insert, update and delete on member records is logged by database
  triggers, with the column names changed (never the values): people,
  choristers, guardians and guardian links, care notes, staff notes, consents,
  payments, fee adjustments, roles and permissions.
- ✅ Views are logged by the server: opening a chorister profile, reading the
  responses to a form, and every export (member data download, reports, CSVs).
- ✅ Account deletions leave one "account deleted" line per choir.
- ✅ The log is append-only: there is no update or delete policy, and only
  staff with the "audit" permission can read it.

## Sign-in and sessions

- ✅ Invitation only: the sign-in page never creates accounts.
- ✅ **Rate limiting** on password sign-in, magic links and password reset:
  8 tries per email address and 30 per network address every 15 minutes
  (`public.rate_limit_hit`, keyed on a hash of the address, never the address
  itself), on top of Supabase Auth's own limits.
- ✅ Sign out on this device or everywhere; the shared demo accounts cannot sign
  out "everywhere", change passwords, invite people, or be deleted.
- 🟡 Session cookies are set by Supabase's SSR library and readable by the page's
  own scripts (needed by the browser client). The Content-Security-Policy below
  is the protection against injected scripts.

## Browser security headers

- ✅ **Content-Security-Policy with a per-request nonce** (`web/src/proxy.ts`):
  only Next.js's own scripts run; no inline or third-party scripts; images,
  media and connections only to this site and the Supabase project; no framing
  (`frame-ancestors 'none'`); forms post only here or to Stripe Checkout.
- ✅ HSTS (2 years), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` (guardian and deletion links
  use `no-referrer`), `Cross-Origin-Opener-Policy: same-origin`, a strict
  `Permissions-Policy`, and `noindex` during the pilot (`web/next.config.ts`).

## Files

- ✅ Member content is in **private buckets** (`scores`, `tracks`, `photos`).
  Files are served through **signed URLs that expire after 10 minutes**, created
  by the server after checking the database rules.
- ✅ Only `choir-logos` is public: choir logos, no personal data.
- ✅ Photos are removed from storage when an account is deleted.

## Consent and minors

- ✅ Each consent (participation, code of conduct, photo/video, medical
  information) is recorded as a new row with who, when, how (self, guardian or
  staff), the IP address, and the exact wording version. Every choir starts with
  version 1 of each wording; staff publish new versions, and members are asked
  again when the wording changes.
- ✅ Choristers 14 and over consent for themselves (PIPEDA, Quebec Law 25).
  **Hard block on under 14** in the database (`app.guard_min_age`) and in the
  roster forms.
- ✅ Minor status is computed from the date of birth on Toronto days
  (`public.is_minor`, matching `packages/shared/src/rules/age.ts`), so it
  changes by itself on the 18th birthday.
- ✅ New choristers under 18 are registered with a guardian contact; minors
  without one are flagged on the roster and in the dashboard's Needs attention.
- ✅ **Guardian copies** of the email types each choir chooses, for minors only,
  skipping guardians who opted out. They stop on the 18th birthday, and a
  nightly job tells the chorister in the app.
- ✅ **Guardian signatures** by single-use link: only a SHA-256 hash of the
  token is stored; it expires after 14 days; a newer link or another guardian's
  signature revokes it; the signature, name, time, IP address and browser are
  stored with the form; lookups and signing happen only on the server and are
  rate limited.

## Members' rights

- ✅ **Data export**: a member downloads everything about them in a choir as
  JSON or CSV (Profile → Your data). Logged.
- ✅ **Account deletion** (Account settings → Delete my account): explains what
  is deleted and what is kept, emails a single-use link valid 24 hours (hashed,
  like guardian links), and erases the account only when the link is confirmed.
  Payment records are kept for tax law under "Deleted member"; attendance stays
  without a name. The last administrator of a choir cannot delete their account
  until another administrator exists. Tested in `privacy.test.ts`.

## Messages

- ✅ Members can report a message; reports go to the moderation queue.
- ✅ **Profanity filter**, server-side (`app.filter_message` trigger), with
  built-in English and French lists that are not readable from the browser,
  plus per-choir extra and allowed words and an off switch. Matching messages
  from members are held for staff review (Communications → Moderation), where
  staff release or hide them. Staff messages are not filtered.
- ✅ Staff with moderation rights can pause a member's messaging. Members can
  only message the choir office, never each other, so there is no member-to-member
  contact to block.

## Email

- ✅ The public demo never sends email: its queue rows are marked "suppressed"
  and shown in a "would have sent" log.
- ✅ Staff can see the email queue's status but not message contents, which can
  hold single-use links.
- ⏳ Real sending (Resend) is set up in Phase 7. Until then, invitations, guardian
  signature requests and deletion confirmations wait in the queue.

## Backups and availability

- ⏳ **Nightly encrypted database backup** to this GitHub repository's private
  releases (`.github/workflows/backup.yml`, `docs/backups.md`). Built; Matthew
  adds two repository secrets to turn it on.
- ✅ A nightly job keeps the free Supabase project from pausing.
- ✅ Errors are visible in Vercel's logs (no extra tracking service).

## Where data lives

- ✅ Database and files: Supabase, `ca-central-1` (Montreal, Canada).
- 🟡 Web servers: Vercel functions run in `iad1` (Washington, United States).
  Data passes through them while people use the site but is not stored there.
  Email (Resend) and card payments (Stripe) may also process data outside
  Canada. The draft privacy policy says so; see `docs/legal-review.md`.

## Legal texts

- ⏳ Privacy policy (`/privacy`), terms (`/terms`) and the per-choir data
  processing note (`docs/pilot/data-processing-note.*.md`) are **drafts** shown
  with a "Draft" banner, waiting for Matthew's approval.
