# Choirbook: native iOS and Android apps

You are turning the Choirbook prototype into two dedicated native apps, one for Apple devices and one for Android, on a shared backend. There is no web app. Work through the phases in order. Each phase ends with acceptance checks; do not start the next phase until they pass.

## Who you are working with

Matthew Menard is the product owner. He is not a programmer, but he follows technical reasoning well. Explain decisions in plain language, briefly. He owns all accounts (Apple, Google, Supabase, Stripe, Firebase, domains). Never create accounts, enter credentials, pay for anything or submit to a store yourself. When a step needs him, stop and give him a short numbered list of what to do and what to send back.

## Where things stand

- Repo: `bobthefrickingbuilder/choirbookrepo`. Today it holds static `.dc.html` screens built on a React runtime (`support.js`), a design system in `_ds/` (tokens, components, `styles.css`), shared styles in `choirbook.css` and fictional demo data in `choirbook-data.js`. It is a clickable prototype deployed to Vercel.
- Screens: Login, Registration, Staff Home, Guardian Home, Chorister Home, Chorister Profile, Roster, Attendance, Calendar, Music Library, Communications (announcements), Messages (office inbox), Monthly Updates, Forms and Fees, Tickets, Reports, Board Report, Users and Permissions, and the app shell (`Choirbook.dc.html`: header, sidebar, drawer, bottom nav, choir switcher, theme and language).
- Every screen supports English and French and light and dark modes. Keep both everywhere.
- There is no backend, no authentication and no persistence.

## Decisions already made (do not reopen them)

1. **Two native apps, no web app.**
   - **Apple:** Swift 6 and SwiftUI, one universal app for iPhone and iPad. Minimum iOS/iPadOS 17. Built with Xcode 26 or later on the iOS 26 SDK (required for App Store uploads since April 28, 2026).
   - **Android:** Kotlin and Jetpack Compose with Material 3, themed to Choirbook's design tokens, for phones and tablets. minSdk 26, compileSdk and targetSdk 36 (required on Google Play since August 31, 2026).
   - No cross-platform UI frameworks (no React Native, Flutter, Capacitor or Kotlin Multiplatform UI). Each app uses its platform's own patterns.
2. **Backend: Supabase** in region **Canada (Central), `ca-central-1`**: Postgres with row-level security, Auth, Storage, Edge Functions. iOS uses the official `supabase-swift` client. Android uses `supabase-kt` (community-maintained); wrap it behind a repository layer so it could be swapped for direct REST calls.
3. **Payments: Stripe** native SDKs (PaymentSheet on both platforms, with Apple Pay and Google Pay) for choir fees and tickets. **No Apple in-app purchase or Google Play Billing anywhere.** Choirs subscribe to Choirbook outside the apps; the apps contain no subscription purchase screen and no link to one.
4. **No donations inside the apps** (Apple guideline 3.2.2(iv)). Donations happen on choir websites.
5. **Sign-in:** Choirbook's own email + password, magic link and passkeys. No Google/Facebook sign-in (that would force Sign in with Apple, guideline 4.8).
6. **Launch market: Canada only** on both stores.
7. **Publisher:** Matthew's individual developer accounts on both stores.
8. **The only web pieces** are a static public account-deletion request page and static privacy/terms/support pages (both stores require public URLs), plus the choir websites in Phase 9. None of these is an app.

## Budget rule: build and test for free first

Matthew will not spend money until the apps are built and tested with real users. Phases 0–7 must run on free tiers. Do not ask him to buy anything, register a domain, or enroll in a paid program before Phase 8. If a step seems to need a paid service, find the free route or postpone the step and tell him.

| Need | Free route during Phases 0–7 |
| --- | --- |
| Backend | Supabase Free plan (2 active projects, 500 MB database, 1 GB storage; pauses after 1 week of inactivity, so set up a weekly keep-alive or tell Matthew how to unpause) |
| Payments | Stripe test mode |
| Email | Resend free tier, sending from its test domain until a real domain exists |
| Android testing | Signed APKs built in Android Studio on Windows, installed directly on testers' phones. No Play Console needed |
| Android push | Firebase Cloud Messaging (free) |
| iPhone/iPad testing | Requires a Mac with Xcode 26. With a free Apple ID, Xcode can install the app on Matthew's own devices; it stops opening after 7 days and must be reinstalled. Testing on other people's iPhones (TestFlight) needs the paid program and waits for Phase 8 |
| iOS push and Apple Pay | Need the paid program; code them, verify in Phase 8 |
| Static pages | GitHub Pages or Vercel Hobby, testing only |

## Ground rules

- Keep the prototype: move the current files to `/prototype` unchanged and use them as the visual and behavioural reference. Match the screens' content, flows and visual identity; adapt layout and controls to each platform's conventions (iOS tab bar and navigation stacks, Android navigation bar and Material components, iPad and Android tablet split views).
- Repo layout:
  - `/supabase`: migrations, seed, RLS policies and tests, edge functions
  - `/design`: the single source of design tokens (JSON) and all EN/FR strings (one file per language), with a script that generates Swift (`Color`/`Font` extensions, `Localizable.xcstrings`) and Kotlin (Compose theme, `strings.xml` in `values` and `values-fr`). Never hand-edit generated files.
  - `/ios`: Xcode project, Swift Package Manager dependencies
  - `/android`: Gradle project with version catalog
  - `/web-static`: deletion request page, privacy, terms, support
  - `/prototype`: the original files
- Same architecture on both platforms so features map one to one: UI layer (SwiftUI views / Compose screens), view models, repositories, a remote data source (Supabase) and a local store (SwiftData on iOS, Room on Android) for offline use.
- Keep a **feature parity checklist** in `/docs/parity.md`: every screen and action, with iOS and Android status. A feature is done only when both platforms have it, unless Matthew says otherwise.
- Generate Swift and Kotlin model types from the database schema, or keep them in one place and test that they match the schema.
- Accessibility: Dynamic Type and Android font scaling, VoiceOver and TalkBack labels and order, WCAG 2.2 AA contrast in both themes.
- Tests: RLS policy tests for every table and role; unit tests for view models and repositories on both platforms; UI tests for each role's main flows (XCUITest, Compose UI tests).
- Commit in small, described steps on a feature branch per phase and open a pull request at the end of each phase with a plain-language summary for Matthew.
- Never commit secrets. Use ignored config files plus checked-in examples (`Secrets.example.xcconfig`, `local.properties.example`). The Supabase service role key lives only in edge function secrets, never in an app.

---

## Phase 0: Matthew's free setup (stop and ask)

Before Phase 1, ask Matthew for, or confirm, the following. Give him the exact steps for each, and confirm each one is free.

- Supabase Free project in `ca-central-1`; project URL and anon key.
- Stripe account (Canada) in test mode only; publishable test key.
- Resend free account.
- Firebase project (free) with an Android app registered, for push.
- Android Studio installed on his Windows PC; an Android phone with developer options and USB debugging on.
- **Mac access for the Apple app.** SwiftUI apps can only be built on macOS with Xcode. If Matthew has no Mac, build and test the Android app first (Phases 2–4 Android parts) and hold the iOS work until a Mac is available. Tell him this plainly at the start.
- Working app identifiers (for example `ca.choirbook.ios` and `ca.choirbook.android`). They cost nothing and can change before launch.

## Phase 1: Backend, data model and design source

- Design the schema in migrations: organizations (choirs, with multiple choirs per organization), seasons and terms, people, choristers, guardians and guardian links, sections and placement, roles and permissions, events and attendance, absence reports, music library (pieces, files, learning tracks, practice assignments), announcements and read receipts, conversations and messages, monthly updates, forms and form responses, consents (with timestamp, who consented, version of the text), fees, payments, waivers, tickets and orders, staff notes, audit log, device push tokens.
- **Row-level security on every table.** A user only sees rows for choirs they belong to, filtered by role. Guardians see only their own children. Choristers see only themselves and choir-wide content. Staff notes are staff-only.
- RLS tests for every table and role, including attempts to read another choir's data.
- Storage buckets for scores and audio with the same access rules (signed URLs, no public buckets for member content).
- Edge functions: push fan-out (APNs and FCM), transactional email, Stripe webhooks, monthly update generation, account deletion.
- Seed script: one fictional demo choir that mirrors the prototype data.
- `/design`: extract tokens from `_ds` and every string from the prototype screens (EN and FR) into the single source, with the generator for both platforms.

**Acceptance:** RLS tests pass; a guardian account cannot fetch another family's data through the API; seed loads cleanly; the generator produces Swift and Kotlin theme and string files.

## Phase 2: App foundations on both platforms

For each platform:
- Project setup, dependency management, build variants (debug, release), secrets handling.
- Theme from generated tokens, light and dark; EN/FR switching that follows the system language with an in-app override, matching the prototype's language menu.
- Navigation shell per role (staff, guardian, chorister) with the choir switcher; iPhone and Android phone use a bottom tab/navigation bar; iPad and Android tablets use a sidebar split view.
- Authentication: email + password, magic link (universal links on iOS, App Links on Android), passkeys, password reset, keep signed in, secure token storage (Keychain, Android Keystore-backed storage).
- Repository and local-store layers in place, with offline reads for cached data.

**Acceptance:** a user signs in on both platforms, sees the correct shell for their role, switches language and theme, and stays signed in after restart.

## Phase 3: Consent, privacy and account rights

- **Age rule:** choristers under 14 have no login of their own. Their guardian registers them and gives consent. Choristers 14+ may have their own login, linked to their guardian. (This covers PIPEDA, which sets 13, and Quebec Law 25, which sets 14.)
- Registration flow records each consent (participation, code of conduct, photo/video, medical info use) with who, when and the version of the wording.
- **Privacy-protective defaults:** member contact details and photos hidden from other members until the member turns them on.
- **Account deletion inside both apps** (Settings → Delete account): explains what is deleted and what is kept (for example, payment records kept for tax law), confirms, deletes the auth user and personal data, and emails a confirmation. Guardians can delete a child's record.
- **Public deletion request page** in `/web-static` (no login, works without the app), naming the app and developer as on the store listings. Requests go to a staff queue and are completed within 30 days.
- **Data export:** a member can request their own data as JSON and CSV, shared through the system share sheet.
- Audit log of who viewed or changed a child's record, viewable by the choir administrator.
- Privacy policy and terms in Settings and at public URLs. Draft both in EN and FR for Matthew to review; mark them as drafts that need his approval.
- Never send personal data to any third-party AI service.

**Acceptance:** deletion removes the data on both platforms (verified with a test); the public deletion page works without signing in; the export contains that member's data and nothing else.

## Phase 4: Every screen, on both platforms

Build each prototype screen natively, updating `/docs/parity.md` as you go:
- Home screens for staff, guardian and chorister.
- Roster and chorister profile, staff notes (staff only).
- Attendance: check-in, late, excused, absence reports from guardians, absence limits and alerts. Works offline and syncs later.
- Calendar: events, call times, dress, location, cancellation; add to the device calendar (EventKit, Android Calendar provider); per-user `.ics` subscription link.
- Music library: scores (PDFKit on iOS, PdfRenderer on Android), learning tracks, practice assignments, hidden-until-released items; staff upload scores and tracks from Files.
- Announcements (schedule, audience, read receipts), office inbox (assign, categories, resolve), monthly updates (per-family).
- Forms builder and responses; fees with Stripe PaymentSheet (card, Apple Pay, Google Pay), cash and cheque recorded by staff, waivers; tickets (types, sales windows, refunds, QR tickets in the app).
- Reports and the board report from live data; export CSV and PDF through the share sheet.
- Users and permissions: invite by email, roles, custom roles.
- Transactional emails in the recipient's language.

**Acceptance:** UI tests per role cover that role's main flows on both platforms; parity checklist shows no gaps.

## Phase 5: Messaging safety (Apple 1.2)

Announcements and messages are user-generated content. On both platforms add:
- **Report** on any message or announcement, with a reason; reports go to a staff moderation queue with a response deadline.
- **Block** a user (they can no longer message you; staff are notified).
- **Filter:** a profanity/abuse filter on outgoing messages (EN and FR word lists, configurable per choir), holding flagged messages for staff review. Run it server-side so both apps share it.
- **Contact information** for Choirbook support in Settings.
- Staff tools to remove content and suspend a member's messaging.

**Acceptance:** report, block and filter work end to end on both platforms and are covered by tests.

## Phase 6: Platform features

- **Push notifications:** schedule changes, cancellations, new messages, new music, fee reminders, with per-category preferences in Settings matching the prototype's toggles. FCM on Android now; APNs on iOS coded now, verified in Phase 8.
- **Offline mode:** calendar, the user's music and learning tracks, and for staff the roster with emergency contacts and medical notes for the next event. Clear offline indicator.
- **Biometric unlock** option (Face ID / Touch ID, Android BiometricPrompt).
- **QR check-in:** staff show a rotating rehearsal code; choristers 14+ or guardians scan it (AVFoundation / CameraX with ML Kit barcode scanning).
- **Practice player:** loop a passage, change tempo without changing pitch, balance own part against the full choir, background playback and lock-screen controls (AVAudioEngine / Media3 ExoPlayer with a media session).
- **Widgets:** next rehearsal on the home screen (WidgetKit, Glance).
- Platform polish: haptics, pull to refresh, Android predictive back, iPad keyboard shortcuts and pointer support, app icons and launch screens.
- iOS config: `PrivacyInfo.xcprivacy` with required-reason APIs for the app and every package; purpose strings for camera, notifications and Face ID in EN and FR; `ITSAppUsesNonExemptEncryption = NO`; associated domains.
- Android config: only the permissions used (notifications, camera), denial handled gracefully; Android App Bundle and signed APK outputs.

**Acceptance:** on a real Android phone, push arrives, airplane mode keeps calendar, music and roster working, and offline attendance syncs on reconnect. If a Mac is available, the same checks pass on Matthew's own iPhone via Xcode (except APNs push).

## Phase 7: Free pilot (Matthew runs it)

Help Matthew run a pilot with one choir before any spending:
- Pilot guide for staff and families (EN/FR, one page each): how to install the Android APK, what to try, how to report problems. iPhone users in the pilot are limited to devices Matthew can install on through Xcode.
- An in-app "Send feedback" button that creates a message in a Choirbook feedback inbox, with device, OS and app version attached.
- `/pilot/feedback.md`: every issue reported and what changed. This later feeds Google's production application.
- Fix what the pilot finds. Matthew decides when the apps are ready to spend money on.

## Phase 8: Paid accounts and store readiness

Start only when Matthew says the pilot is done and he is ready to pay. First, walk him through: Apple Developer Program (individual, $99 USD a year), Google Play Console (personal, $25 USD once, identity verification), and the product domain. Then:
- Verify APNs push, Apple Pay and Face ID on real devices through TestFlight; widen the iOS beta to the pilot choir.
- **Reviewer access:** three reviewer logins (staff, guardian, chorister 14+) in a fictional review choir with realistic data, for App Store Connect "App Review Information" and Play Console "App access". The backend must stay running during review.
- Remove every placeholder, "coming soon" item, dead button and unused screen from release builds (Apple 2.1 and 2.3.1).
- Draft, for Matthew to review, in `/store`:
  - App Store: name, subtitle, keywords, description (EN/FR), promotional text, review notes (roles, demo logins, and a note that payments are for real-world choir services under guideline 3.1.3(e)).
  - Apple App Privacy answers and Google Data safety answers, built from an inventory of every data type collected, why, whether it is linked to the user, and deletion options. Generate the inventory from the schema.
  - Apple age rating questionnaire and Google IARC content rating answers (user-to-user messaging is present).
  - Google target audience: 13–15, 16–17, 18+. No childish imagery in the listing.
  - Google production application answers (testing summary, feedback and changes, audience, value).
- Store screenshots from the real apps with seeded data: current required iPhone and iPad sizes, Android phone and tablet, EN and FR.
- Release scripts: version and build numbers, signed `.aab` for Google, archive and upload for TestFlight.

Then stop. Matthew runs Google's closed test (at least 12 testers opted in for 14 days in a row) and submits both apps. Fix review feedback as it arrives.

---

## Phase 9 (after launch): Website module

Choirbook becomes the content source for choir websites that Matthew designs and hosts on Vercel. The websites are public marketing sites, not a Choirbook web app.

- In both apps: a **Website** section for staff with "Show on website" flags on calendar events, announcements, repertoire, ticketed concerts and auditions; new content types Pages (bilingual rich text), Media (gallery that only includes photos where every pictured chorister has photo consent) and Sponsors. A "Website editor" permission. Preview before publish. Every publish logged.
- Donations live only on the websites: Stripe Checkout with CRA official receipts.
- Public read-only API (Postgres views or an edge function) that exposes only published content per choir.
- `/sites`: one multi-tenant Next.js project on Vercel Pro that routes by hostname to a choir, with a theme package per choir over a shared component set. Pages are cached and revalidated by tag when staff publish.
- A developer-only Sites area for Matthew: choirs, themes, domains and verification status (managed through the Vercel SDK), last publish, change requests.
- Contact form submissions arrive in the choir's office inbox.

## Phase 10 (after launch): Next features

One PR each, on both platforms: riser and seating charts (extend "Place singers"), volunteer and chaperone sign-ups with time slots and police-check expiry tracking, instalment plans and automatic billing with sibling discounts, availability replies per event, score inventory with folder loans, carpool coordination, consent-aware photo gallery, online store for concert wear.

---

## When to stop and ask Matthew

- Any choice that costs money, creates an account, or touches a live store listing.
- Any change to the decisions listed above.
- Any wording that will appear in a legal document (privacy policy, terms, consent text).
- If an Apple or Google requirement in this prompt has changed since October 2026. Check the official pages (Apple App Review Guidelines, Apple's upcoming requirements page, Android target API requirements, Play Console Help) before Phase 8 and report any differences.
