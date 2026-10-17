# Data processing note: [Choir name] and Choirbook

> **DRAFT for Matthew to review and approve.** Not legal advice. Fill in the
> bracketed parts for each pilot choir before sending it.

**Choir:** [Choir name] · **Type:** [youth (ages 15–25) / adult] ·
**Pilot period:** [start date] to [end date] · **Prepared:** [date]

## What Choirbook is

Choirbook is the website [Choir name] uses during the pilot to run rehearsals,
attendance, music, forms, fees, tickets, volunteers and messages. The choir
decides what it collects and stays responsible for its members' information.
Choirbook stores and processes that information for the choir, following its
instructions. The pilot is free.

## What Choirbook stores

- **Members:** name, preferred name, pronouns, email, phone, date of birth,
  language, optional photo; section and voice part; membership status.
- **Choir activity:** attendance, reported absences, availability replies,
  practice progress, seating, volunteer shifts, ticket sales.
- **Forms and consents:** answers, signatures, and each consent with the date,
  the method, and the exact wording.
- **Care information** the member or guardian gives (allergies, medication).
- **Money:** fees, instalments, payments, receipts, financial aid requests. Card
  numbers are handled by Stripe and never stored by Choirbook.
- **Messages** between members and the choir office.
- **For choristers under 18:** one or two parent or guardian contacts, and their
  signatures on forms (name, time, network address).
- **Security records:** sign-ins, and an audit log of who on staff viewed or
  changed member records.

## Where it is kept

- **Database and files:** Supabase, in Montreal, Canada.
- **Website:** Vercel. Information passes through Vercel's servers (United
  States) while people use the site; it is not stored there.
- **Email:** Resend (may process outside Canada).
- **Card payments:** Stripe (test mode during the pilot).
- **Backups:** nightly, encrypted with a passphrase only Matthew holds, kept 30
  days in a private location he controls.

Choirbook does not sell information, show advertising, or send personal
information to artificial intelligence services.

## Who can see it

- **Each member** sees their own information and can download all of it.
- **Choir staff** see what their role needs, as set by the choir in Users and
  permissions. Medical information is limited to staff with the "care"
  permission. Staff notes are staff-only.
- **Other members** see names and sections only. Contact details and photos stay
  hidden unless the member shares them.
- **Other choirs** using Choirbook see nothing of [Choir name].
- **Matthew Menard**, as Choirbook's administrator, can reach the database to
  run and fix the service. He does not use member information for anything else.

## Minors (youth choirs)

- Choristers 14 and over consent for themselves. No one under 14 can be registered.
- Choristers under 18 have a parent or guardian contact, who gets copies of the
  emails the choir chooses and signs forms such as trip permissions through a
  secure link that works once and expires after 14 days.
- On the 18th birthday, guardian copies stop automatically and the chorister is
  told in the app.

## How long it is kept

- While the person is a member, and up to two years after they leave.
- Payment records as long as tax law requires (usually six years).
- At the end of the pilot, if [Choir name] stops using Choirbook, Matthew gives
  the choir an export of its data and then deletes it within [60] days, except
  what tax law requires the choir itself to keep.

## How to get information deleted

- **A member** deletes their own account in Account settings → Delete my
  account. Choirbook emails a link to confirm. Payment records stay, under
  "Deleted member".
- **The choir** can archive a member, or ask Matthew to delete a member or all
  of the choir's data.
- **Questions or complaints:** Matthew Menard, privacy contact, through the Send
  feedback button in Choirbook or [contact email to confirm]. Members can also
  contact the Office of the Privacy Commissioner of Canada or, in Quebec, the
  Commission d'accès à l'information.

## If something goes wrong

If a breach puts anyone at real risk of harm, Matthew tells [Choir name]
within [72 hours] of learning of it, and together they tell the people affected
and the privacy authorities as the law requires.

---

Agreed for [Choir name]: ____________________ (name, role, date)

Agreed for Choirbook: Matthew Menard ____________________ (date)
