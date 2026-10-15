---
description: Build the Choirbook web pilot with a working demo (chorister and staff accounts) and a staff dashboard, on free tiers
---

# Choirbook web pilot

Build Choirbook as a working website that two real choirs can pilot, with a public demo that anyone can try as a **chorister** or as **staff/admin**. Choristers use the site in a browser; there is no phone app in this phase. Work through the phases in order. Each phase ends with acceptance checks; do not start the next phase until they pass.

$ARGUMENTS

## Who you are working with

Matthew Menard is the product owner. He is not a programmer, but he follows technical reasoning well. Explain decisions in plain language, briefly. He owns all accounts (Supabase, Vercel, Stripe, Resend, GitHub). Never create accounts, enter credentials or pay for anything yourself. When a step needs him, stop and give him a short numbered list of what to do and what to send back.

## Where things stand

- Repo: `bobthefrickingbuilder/choirbookrepo`. It holds a clickable prototype: static `.dc.html` screens built on a React runtime (`support.js`), a design system in `_ds/` (tokens, components, `styles.css`), shared styles in `choirbook.css` and fictional demo data in `choirbook-data.js`. It is deployed to Vercel as a static demo (`vercel.json`).
- Prototype screens: Login, Registration, Staff Home, Guardian Home, Chorister Home, Chorister Profile, Roster, Attendance, Calendar, Music Library, Communications (announcements), Messages (office inbox), Monthly Updates, Forms and Fees, Tickets, Reports, Board Report, Users and Permissions, and the app shell (`Choirbook.dc.html`: header, sidebar, drawer, bottom nav, choir switcher, theme, language).
- Every screen supports English and French and light and dark modes. Keep both everywhere.
- There is no backend, no authentication and no persistence.
- `prompts/2 - LATER - Native iPhone and Android apps.md` is the later plan for native iOS and Android apps. Do not start it. Build the backend in this phase so those apps can reuse it unchanged.

## Decisions (do not reopen them)

1. **Web app:** Next.js (App Router) + React + TypeScript, deployed on Vercel. Responsive: it must work well on a phone browser, a tablet and a laptop.
2. **Backend:** Supabase in **Canada (Central), `ca-central-1`**: Postgres with row-level security, Auth, Storage, Edge Functions. All business rules that a future native app would also need live in the database or in edge functions, not only in Next.js.
3. **Payments:** Stripe, **test mode only** during the pilot.
4. **Sign-in:** email + password and magic link. Passkeys if they work cleanly; not required.
5. **Two showcase accounts:** a chorister account and a staff/admin account (details in Phase 2). **Every chorister has their own login.** The youth pilot choir (ORYC) is ages 15–25, so no chorister is under 14 and nobody needs a guardian to sign in for them. Guardians have **no accounts**: for choristers under 18 they are contact records (name, email, phone, emergency contact) who receive copies of selected emails and sign guardian-required forms through a secure emailed link (see Phase 6).
6. **Multi-choir from day one:** the demo choir and the two pilot choirs are separate organizations in one database, fully isolated by row-level security.

## Budget rule: free tiers only

Matthew will not spend money during the pilot. Do not ask him to buy anything or upgrade a plan. If a step seems to need a paid service, find the free route or postpone it and tell him.

| Need | Free route |
| --- | --- |
| Hosting | Vercel Hobby (a `*.vercel.app` URL). Hobby is for non-commercial use: fine while the pilot is free; tell Matthew to move to Pro before charging any choir |
| Backend | Supabase Free (2 active projects, 500 MB database, 1 GB storage, pauses after 1 week of inactivity). Add a scheduled keep-alive (Vercel cron or GitHub Action) |
| Email | Resend Free: 3,000 emails a month and **100 a day**. Two choirs can exceed 100 in one announcement, so: send announcements in-app first, email as a daily digest per person, queue sends that would pass the daily cap and send them the next day, and show staff a counter of today's remaining emails |
| Payments | Stripe test mode |
| Error tracking | Sentry free tier, or Vercel's built-in logs if Matthew prefers not to add an account |
| Audio and score files | Supabase Storage (1 GB). Compress audio to AAC/MP3 at a sensible bitrate and show staff the storage used |

## Ground rules

- Move the current prototype files to `/prototype` unchanged and use them as the visual and behavioural reference. Match the screens closely; improve only where real data or real use needs it.
- Repo layout: `/web` (Next.js app), `/supabase` (migrations, seed, policies, tests, edge functions), `/packages/ui` (design system ported from `_ds`), `/packages/shared` (types, i18n strings, validation), `/prototype`.
- TypeScript strict mode. Generate database types from the schema; no `any` on data paths. Validate every form and server action with a schema (zod or similar).
- All user-facing strings through i18n, EN and FR, following the user's language with a switch in the account menu.
- Accessibility: WCAG 2.2 AA contrast in both themes, keyboard navigation, labels on every control, screen-reader-friendly tables and charts (every chart has a text or table alternative).
- Performance on a mid-range phone: server rendering for first paint, no layout jumps, images and audio loaded lazily.
- Tests: RLS policy tests for every table and role; unit tests for business rules; Playwright end-to-end tests for each role's main flows, run against the demo choir.
- Small, described commits on a branch per phase; a pull request at the end of each phase with a plain-language summary and screenshots for Matthew.
- Never commit secrets. `.env.local` ignored, `.env.example` checked in. The Supabase service role key lives only in server-side environment variables and edge function secrets.

---

## Phase 0: Matthew's free setup (stop and ask)

Ask Matthew for, or confirm, each of these, with exact steps, and confirm each is free:
- Supabase Free project in `ca-central-1`: project URL and anon key; service role key placed by him in Vercel environment variables.
- Vercel project connected to the repo (he already uses Vercel).
- Stripe account (Canada), test mode keys.
- Resend free account.
- Which two choirs will pilot, whether each is an adult or youth choir, and roughly how many members each has. Do not ask for member data yet.

## Phase 1: Foundations

- Next.js app with the design system ported to `/packages/ui`: tokens as CSS variables, typed React components, light and dark themes, EN/FR.
- App shell from the prototype: header with choir switcher and account menu, sidebar on tablet and laptop, bottom navigation on phones.
- Database schema in migrations: organizations (choirs), seasons and terms, people, choristers, guardians and guardian links, sections and voice parts, roles and permissions, events (rehearsals, concerts, sectionals, tours) and attendance, absence reports, availability replies, music library (pieces, score files, learning tracks, practice assignments, practice log), announcements and read receipts, conversations and messages, monthly updates, forms and responses, consents (who, when, wording version), fees, payments, waivers, tickets and orders, seating charts, volunteer jobs and sign-ups, staff notes, notifications and preferences, email queue, audit log, feedback.
- **Row-level security on every table.** Members only see their own choir. Choristers see themselves and choir-wide content. Staff notes are staff-only. Permissions are role-based and editable (Users and Permissions screen).
- Auth: sign in, magic link, password reset, invitations by email, sign out everywhere.

**Acceptance:** RLS tests pass, including a chorister trying to read another chorister's data and a staff member of one choir trying to read another choir; sign-in works on a phone browser.

## Phase 2: The public demo

- A demo landing page at `/demo` (EN/FR) with two clear choices: **Explore as a chorister** and **Explore as staff**. One click signs into a shared demo account; no email or password needed.
- A fictional demo choir seeded from the prototype data (keep everything fictional): a full season of rehearsals and concerts, sections, a music library with scores and learning tracks (generate short placeholder audio; no copyrighted recordings), attendance history, fees in several states, forms, announcements, messages, tickets, volunteer jobs.
- The demo choir is a youth choir aged 15–25, so minor handling shows up (a few 16- and 17-year-olds with guardian contacts and one tour form awaiting a guardian signature).
- **Demo chorister:** a 19-year-old chorister with realistic history (attendance, practice assignments, a fee partly paid, an unanswered availability request, a message thread with the office).
- **Demo staff/admin:** an administrator with every permission, so the whole management side and dashboard can be explored. Add a role switcher inside the demo staff account to preview what a section leader or a treasurer sees.
- A clear "Demo — changes reset every night" banner. A nightly job restores the demo choir to its seed state.
- Demo safety: demo accounts cannot send real emails (emails go to an in-app "would have sent" log), cannot change passwords or invite people, and Stripe stays in test mode with Stripe's test cards shown on screen.
- A short guided tour for each demo role (5–7 steps, skippable) pointing at the key features.

**Acceptance:** from a phone and a laptop, a first-time visitor reaches either demo role in one click, can complete the guided tour, and finds the data reset the next day.

## Phase 3: Chorister experience

Everything a chorister does, phone-first:
- **Home:** next rehearsal or concert with countdown, call time, location with map link, dress code and what to bring; this week's practice assignments; unread announcements; outstanding forms and fees; a one-tap "I'll be absent / late" for the next event.
- **Calendar:** season view and list view; event details; availability replies (yes / no / maybe + comment) for events staff request them on; add to Google, Apple or Outlook calendar (`.ics` file and a personal subscription link).
- **Music:** library of the pieces assigned to the chorister's choir and section; score viewer (PDF in the browser, zoom, page turn); **practice player** for learning tracks: loop a passage, change tempo without changing pitch, balance my part against the full choir, remember position; practice assignments with a "Done" check and a simple practice log.
- **Absences:** report an absence or lateness with a reason; see my attendance history and how many absences I have left under the choir's policy.
- **Messages:** conversations with the choir office by category (absence, music, fees, general); report a message.
- **Announcements:** feed with read state.
- **Forms and fees:** sign forms and consents; see which forms are waiting on a guardian's signature (minors only) and resend the guardian link; pay fees by card (Stripe test mode); see receipts; instalment schedule if the choir offers one.
- **Tickets:** my comp tickets and a personal sales link for concerts, so the choir can see sales per chorister if it wants.
- **Volunteering:** sign up for volunteer jobs (front of house, setup, refreshments) by time slot.
- **Seating:** my position on the riser chart for each concert.
- **Profile:** contact details, voice part, notification preferences (email digest, per category), language, theme, privacy controls (who can see my contact details), download my data, delete my account.
- **Notifications:** in-app notification centre; email digest; optional web push for people who add the site to their home screen (iOS 16.4+ needs the home-screen install; say so in the settings text).

**Acceptance:** the Playwright chorister suite covers each item above on a phone-sized viewport.

## Phase 4: Staff and admin management

Everything staff do, laptop-first and usable on a tablet:
- **Roster:** search and filter by section, status, fees, forms, attendance; chorister profiles with history; staff-only notes; bulk actions (message, remind, export); **CSV import** of an existing member list with a preview and error report; archive departed members.
- **Attendance:** take attendance by section on a tablet; **QR check-in** (a rotating code shown on a screen at the door, scanned with the chorister's phone camera through the browser); late and excused; absence limits per term with alerts; guardian or chorister absence reports already applied.
- **Calendar and events:** create rehearsals, concerts, sectionals, tours; recurring rehearsals; call times, dress, location, running order; request availability; cancel with automatic notification.
- **Music library:** upload scores and learning tracks by section; assign practice with due dates; release to choristers when ready; see who has completed assignments; repertoire per season and concert set lists.
- **Communications:** announcements to everyone, a section, or a custom group; schedule for later; read receipts; monthly family/member updates generated per person; email cap counter (see Budget rule).
- **Inbox:** shared office inbox; assign conversations; categories; resolve and reopen; response-time tracking.
- **Forms and fees:** form builder; fee schedules, instalments, sibling or family discounts, waivers and financial aid requests; record cash and cheque; reminders; Stripe test payments and refunds.
- **Tickets:** concerts, ticket types, sales windows, capacity, comps, refunds, QR tickets and door scanning, sales per chorister link.
- **Seating and risers:** drag-and-drop riser and seating charts per concert by section, printable.
- **Volunteers:** jobs with time slots and required counts; for youth choirs, chaperone police-check expiry dates with alerts.
- **Reports:** attendance, enrolment, fees and forms, ticket sales, practice completion, volunteer hours; CSV and PDF export; the **board report** builder from the prototype, filled from live data.
- **Users and permissions:** invite staff, built-in roles (administrator, conductor, section leader, office, treasurer) and custom roles with per-area permissions.
- **Choir settings:** name, logo, colours (applied to the choir's pages), seasons and terms, sections, absence policy, fee settings, consent wording versions.
- **Moderation:** reported messages queue, remove content, suspend a member's messaging.
- **Audit log:** who viewed or changed member records, exported data or changed permissions.

**Acceptance:** the Playwright staff suite covers each area; CSV import handles a messy real-world file (blank rows, mixed case, duplicate emails) with a clear error report.

## Phase 5: The staff dashboard

A single **Dashboard** is the staff landing page. It answers "how is the choir doing and what needs me today" at a glance, for the whole choir or one section, for any term or the season.

- **Global filters:** choir (for people with access to several), season or term or custom dates, section. Every widget respects them. Filters are kept in the URL so a view can be shared.
- **Needs attention (top of the page):** choristers at or near the absence limit, overdue fees, missing forms or consents, guardian signatures outstanding for minors, unanswered messages older than 48 hours, events in the next 7 days with low availability, practice assignments due with low completion, expiring chaperone checks. Each item links to the action that fixes it.
- **Widgets:**
  - Attendance: rate over time (line), by section (bars), present/late/excused/absent split, trend against last term.
  - Upcoming events: next 5 events with availability counts by section, and balance warnings (for example, only 2 tenors confirmed).
  - Membership: active members by section and voice part, new this season, departures, registration pipeline.
  - Fees: collected versus expected for the season, outstanding by age (0–30, 31–60, 60+ days), waivers granted, instalments due this month.
  - Forms and consents: completion per form.
  - Music readiness: practice assignment completion per piece and section ahead of the next concert.
  - Communications: announcement read rate, email digest opens if available, inbox volume and median response time.
  - Tickets: sales against capacity per concert, sales over time, top chorister sellers.
  - Volunteers: filled versus needed slots per event.
- **Drill-down:** clicking any chart opens the filtered list behind it (for example, the absent basses on a given date).
- **Customization:** staff can show, hide and reorder widgets; saved per user. Role-aware defaults: the treasurer sees fees first, the conductor sees attendance and music readiness first, section leaders see their section only.
- **Exports:** any widget to CSV; the whole dashboard to PDF; one click to start a board report from the current filters.
- **Data:** compute from database views or materialized views refreshed on change or every few minutes, so the dashboard loads fast. Charts must work in both themes and have accessible table alternatives.

**Acceptance:** the dashboard loads in under 2 seconds on the demo choir on a laptop; every number on it matches the corresponding report; every widget drills down correctly.

## Phase 6: Privacy, consent and safety

Real member data arrives in Phase 7, so this must be done first.
- **Consent:** registration and profile record each consent (participation, code of conduct, photo/video, medical information use) with who, when and the wording version. Choristers 14 and over can consent for themselves under PIPEDA (13) and Quebec Law 25 (14); keep a hard block on registering anyone under 14 without a guardian flow, which is not built in this phase.
- **Minors (15–17) in a youth choir:** date of birth on the profile; the app computes "minor" status and updates it automatically on the 18th birthday. For minors:
  - one or two guardian contacts are required at registration;
  - each choir chooses which emails guardians get copies of (for example fees, schedule changes, tour information);
  - forms marked "guardian signature required" (tours, travel, medical) are sent to the guardian as a secure single-use link that expires; the guardian signs without an account, and the signature, name, time and IP are stored with the form;
  - staff see guardian status on the roster and in the dashboard's Needs attention list.
  When a chorister turns 18, stop guardian copies and tell the chorister in-app.
- **Privacy-protective defaults:** member contact details and photos hidden from other members until the member turns them on.
- **Account deletion** inside the site (Settings → Delete account), explaining what is deleted and what is kept (payment records for tax law), with email confirmation.
- **Data export:** a member downloads their own data as JSON and CSV.
- **Privacy policy and terms** pages, EN and FR, drafted for Matthew to review and clearly marked as drafts needing his approval. Name Matthew as privacy contact for now.
- **Data processing note** for each pilot choir: what Choirbook stores, where (Canada), who can see it, how to get it deleted. Draft for Matthew.
- Messages: report and block, a profanity filter (EN and FR lists, configurable per choir) that holds flagged messages for staff review, run server-side.
- Security basics: rate limiting on sign-in, secure headers, signed URLs for files, no public storage buckets for member content, daily database backup to a place Matthew controls (free route: a scheduled export to his GitHub repo's private releases or to a storage bucket).
- Never send personal data to any third-party AI service.

**Acceptance:** deletion and export verified by tests; the audit log records views and edits of member records; a security checklist in `/docs/security.md` is complete.

## Phase 7: Pilot onboarding

- An onboarding flow for a new choir: create the choir, choose adult or youth (youth turns on minor handling and guardian contacts), set seasons, sections and policies, invite staff, import members by CSV, send invitations (respecting the email cap: spread invitations over days if needed and show the schedule).
- A **Send feedback** button on every page that creates a message in a Choirbook feedback inbox only Matthew sees, with page, role, browser and app version attached.
- Pilot guides, EN and FR, one page each: for staff (getting started, first week checklist) and for choristers (signing in, adding the site to the home screen, what to try).
- `/pilot/feedback.md`: a log of every issue reported and what changed.
- A simple status page or banner Matthew can turn on for maintenance notices.

**Acceptance:** Matthew can set up a pilot choir end to end from an empty account in under 30 minutes using the onboarding flow and a sample CSV.

## Phase 8: Hardening before the pilot starts

- Full end-to-end run of both roles on iPhone Safari, Android Chrome, and desktop Chrome, Safari, Firefox and Edge.
- Accessibility pass with axe and a manual screen reader check of the chorister home, calendar, music player and staff dashboard.
- Load the demo choir with three seasons of history and check every screen stays fast.
- Error monitoring on; a weekly summary of errors in `/pilot/feedback.md`.
- Confirm the Supabase keep-alive works and the nightly demo reset runs.

Then stop and hand over to Matthew with: the demo link, the two pilot onboarding links, the guides, and a list of anything still open.

---

## Later (do not build now)

- **Native apps:** follow `prompts/2 - LATER - Native iPhone and Android apps.md` (SwiftUI and Kotlin on this same backend) after the pilot.
- **Choir websites:** Choirbook as the content source for public choir websites on Vercel (multi-tenant Next.js, revalidated on publish).
- Store-related work (App Store and Google Play listings, reviewer accounts) waits for the native apps.

## When to stop and ask Matthew

- Anything that costs money, creates an account, or would send email to real people for the first time.
- Importing real member data.
- Any change to the decisions above.
- Any wording that will appear in a legal document (privacy policy, terms, consent text).
