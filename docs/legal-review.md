# Legal texts waiting for Matthew

Phase 6 drafted these. Each is marked as a draft wherever it appears, and none
is legal advice. Please read them, change anything, and say "approved" (or what
to change). Once they are approved, the draft banners come off.

| Text | Where | Notes |
| --- | --- | --- |
| Privacy policy (EN, FR) | `/privacy`, source in `web/src/lib/legal.ts` | Names you as privacy contact. No email address is published yet. |
| Terms of use (EN, FR) | `/terms`, same file | Governing law: Ontario and Canada. |
| Data processing note (EN, FR) | `docs/pilot/data-processing-note.en.md`, `.fr.md` | One per pilot choir; fill in the bracketed parts. |
| Default consent wording (EN, FR) | Every new choir's Settings → Consent wording, version 1 | Participation, code of conduct, photo/video, medical information. Choirs can publish their own version. Written in `supabase/migrations/20261019000100_privacy_safety.sql`. |
| Guardian signature page | `/guardian/…` | "I am {chorister}'s parent or legal guardian, and I agree to this form." |
| Account deletion page | `/account/delete` | What is deleted and what is kept. |

## Decisions in the drafts to check

1. **Privacy contact address.** The drafts say to reach you "through the Send
   feedback button or your choir office". Do you want an email address on the
   page? A free address on the future domain would work.
2. **Data outside Canada.** The database and files are in Montreal, but the
   website runs on Vercel servers in Washington (US), and email and payments go
   through US companies. The drafts say this openly. Under Quebec's Law 25, a
   Quebec choir should record this in a short privacy impact assessment before
   the pilot; I can draft one if a pilot choir is in Quebec.
3. **Retention.** Members' information is kept up to two years after they
   leave; payment records about six years (tax law).
4. **Breach notice to choirs** within 72 hours, in the data processing note.
5. **French.** A native Canadian French speaker should read the French texts
   before they go to members.
