import { AlertCard, Button } from '@choirbook/ui';
import type { Metadata } from 'next';
import { confirmAccountDeletion } from '@/app/actions/privacy';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { getT } from '@/lib/prefs';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Confirm account deletion', robots: { index: false, follow: false }, referrer: 'no-referrer' };

// Opened from the confirmation email. Opening the page deletes nothing (mail
// scanners open links); only the button does.
export default async function ConfirmDeletionPage({ searchParams }: PageProps<'/confirm-deletion'>) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' && /^[0-9a-f]{48}$/.test(sp.token) ? sp.token : null;
  const { lang, t } = await getT();
  const p = t.privacy;

  let state = typeof sp.state === 'string' ? sp.state : null;
  if (!state) {
    if (!token) state = 'unknown';
    else {
      try {
        const { data, error } = await createAdminClient().rpc('account_deletion_state', { token });
        state = error ? 'failed' : (data ?? 'unknown');
      } catch (err) {
        console.error('Deletion link check failed', err);
        state = 'failed';
      }
    }
  }

  const problem: Record<string, [string, string]> = {
    expired: [p.delExpiredTitle, p.delExpiredBody],
    unknown: [p.delExpiredTitle, p.delExpiredBody],
    used: [p.delUsedTitle, p.delUsedBody],
    last_admin: [p.delTitle, p.delLastAdmin],
    demo: [p.delTitle, p.delDemo],
    failed: [p.delTitle, p.delFailed],
  };

  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      {state === 'valid' && token ? (
        <form action={confirmAccountDeletion} className="stack">
          <div className="public__heading">
            <h1>{p.delConfirmTitle}</h1>
            <p>{p.delConfirmBody}</p>
          </div>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="danger" iconStart="trash-2" fullWidth>
            {p.delConfirmButton}
          </Button>
          <Button variant="ghost" href="/" fullWidth>
            {p.delKeep}
          </Button>
        </form>
      ) : (
        <div className="stack">
          <AlertCard tone={state === 'failed' ? 'error' : 'warning'} title={(problem[state] ?? problem.unknown!)[0]}>
            {(problem[state] ?? problem.unknown!)[1]}
          </AlertCard>
          {state === 'failed' && token ? (
            <Button variant="secondary" href={`/confirm-deletion?token=${token}`}>
              {p.delConfirmTitle}
            </Button>
          ) : null}
        </div>
      )}
    </PublicFrame>
  );
}
