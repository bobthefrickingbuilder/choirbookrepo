# Database backups

Every night at 03:30 (Toronto), the **Nightly database backup** GitHub Action
(`.github/workflows/backup.yml`) dumps the Supabase database, encrypts it, and
uploads it to a release named `backups` in this repository. The last 30 nights
are kept. It is free: it uses GitHub Actions minutes and release storage.

The backups contain members' personal information, so they are encrypted with a
passphrase that only you hold. GitHub never sees it unencrypted. Keep the
repository **private**.

## Turning it on (once)

0. Make the repository **private**: GitHub → the repository → **Settings →
   General → Danger Zone → Change visibility → Make private**. It is free.
   Files attached to releases of a public repository can be downloaded by
   anyone, so the job refuses to run while the repository is public. (Vercel
   keeps deploying from a private repository on the free plan.)
1. In Supabase: **Connect → Session pooler**, copy the connection string, and put
   your database password in it (Project Settings → Database if you need to
   reset the password).
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - `SUPABASE_DB_URL`: the connection string from step 1.
   - `BACKUP_PASSPHRASE`: a long passphrase (for example four random words and a
     number). Save it in your password manager. Without it, no one can open a
     backup, including you.
3. In GitHub: **Actions → Nightly database backup → Run workflow** to make the
   first one now. A file named `choirbook-YYYY-MM-DD.tar.gz.gpg` appears under
   **Releases → Database backups**.

Until both secrets exist and the repository is private, the job runs, does
nothing, and leaves a notice.

## Restoring

On a computer with the Supabase CLI and `gpg`:

```bash
gpg --decrypt choirbook-2026-10-18.tar.gz.gpg > backup.tar.gz
mkdir backup && tar -xzf backup.tar.gz -C backup
```

Then restore into a **new, empty** Supabase project (never over the live one
without a second backup):

```bash
psql "$NEW_DB_URL" -f backup/roles.sql
psql "$NEW_DB_URL" -f backup/schema.sql
psql "$NEW_DB_URL" -c "SET session_replication_role = replica" -f backup/data.sql
```

Files in Supabase Storage (scores, recordings, photos) are not in the database
dump. During the pilot they can be re-uploaded by the choir; a storage backup can
be added later if needed.
