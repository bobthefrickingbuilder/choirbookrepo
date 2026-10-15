# Setting up Choirbook (free tiers)

Everything here is free. Matthew owns every account; nobody else creates accounts or
enters passwords.

## 1. Supabase (database and sign-in)

1. At supabase.com, create a project on the **Free** plan, region **Canada (Central)**.
   Keep the database password in your password manager.
2. **Project Settings → API**: copy the **Project URL** and the **publishable** key
   (`sb_publishable_…`; older projects call it the "anon" key). These two are safe to share.
3. Do not share the **secret** key (`sb_secret_…`, or "service_role" on older projects).
   Paste it into Vercel yourself (step 2).
4. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up"
   (Choirbook is invite-only). Set the minimum password length to **10**.
5. **Authentication → URL Configuration**:
   - Site URL: your Vercel address, e.g. `https://choirbook.vercel.app`
   - Redirect URLs: add `https://choirbook.vercel.app/auth/confirm` and `http://localhost:3000/auth/confirm`
6. **Authentication → Emails → Templates**: paste the three templates from
   `supabase/templates/` (invite, magic link, recovery). Their links go through
   `/auth/confirm`, so they work even when opened on another device.
7. Putting the tables in place: in a terminal in this folder run `npx supabase login`
   (it opens your browser), then `npx supabase link --project-ref <your-project-ref>`
   (it asks for the database password; you type it), then `npx supabase db push`.

### Email for sign-in links (later)

Supabase's built-in email only reaches the project's own team, and only a few per hour.
For real members, connect **Resend** as Supabase's email sender (Authentication → Emails →
SMTP settings). Resend's free plan sends only to your own address until you verify a
domain, so this step waits for the domain. Until then, you can test sign-in with your
own email.

## 2. Vercel (hosting)

The repository now holds the real app in `web/`; the old static prototype is in `prototype/`.

1. Project → **Settings → Build and Deployment → Root Directory**: `web`.
   Framework preset: **Next.js**.
2. Project → **Settings → Environment Variables** (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (the secret one; only you paste it)
   - `NEXT_PUBLIC_SITE_URL` (your Vercel address)
3. Hobby (free) is for non-commercial use. It is fine while the pilot is free; move to
   Pro before charging any choir.

## 3. Stripe (test mode only during the pilot)

Developers → API keys, with **Test mode** on. The publishable key (`pk_test_…`) can be
shared; the secret key (`sk_test_…`) goes only into Vercel as `STRIPE_SECRET_KEY`.

## 4. Free-tier limits to keep in mind

| Service | Limit | What Choirbook does about it |
| --- | --- | --- |
| Supabase Free | 500 MB database, 1 GB files, pauses after 7 idle days | A scheduled keep-alive (Phase 2); audio compressed; storage use shown to staff |
| Resend Free | 100 emails/day, 3,000/month | In-app first, daily digests, a queue that waits for tomorrow, a counter for staff |
| Vercel Hobby | Non-commercial | Move to Pro before charging |

## Local development

Copy `web/.env.example` to `web/.env.local` and fill in the Supabase URL and publishable
key. Then `npm install` and `npm run dev`.
