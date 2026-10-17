import { format } from '@choirbook/shared/i18n';
import { Button, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DeletionRequest } from '@/components/auth/DeletionRequest';
import { demoRoleFor } from '@/lib/demo';
import { formatDate } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getMemberships, getUser } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Delete your account' };

// Settings → Delete account. Explains what goes and what stays, then emails a
// single-use confirmation link; nothing is deleted until that link is used.
export default async function DeleteAccountPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in?next=/account/delete');
  const supabase = await createClient();
  const [{ lang, t }, memberships, { data: open }] = await Promise.all([
    getT(),
    getMemberships(),
    supabase.from('account_deletions').select('requested_at, expires_at').is('completed_at', null).is('cancelled_at', null).gt('expires_at', new Date().toISOString()).order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const p = t.privacy;
  const when = (iso: string) => formatDate(iso, lang, { dateStyle: 'medium', timeStyle: 'short' });
  const choirs = memberships.map((m) => m.org.name).join(', ') || 'Choirbook';

  return (
    <main className="public" id="main">
      <div className="public__card public__card--wide">
        <div className="public__heading">
          <h1>{p.delTitle}</h1>
          <p>{format(p.delIntro, { choirs })}</p>
        </div>
        <Card title={p.delDeletedTitle} flat>
          <ul className="bullets">
            <li>{p.delDeleted1}</li>
            <li>{p.delDeleted2}</li>
            <li>{p.delDeleted3}</li>
            <li>{p.delDeleted4}</li>
          </ul>
        </Card>
        <Card title={p.delKeptTitle} flat>
          <ul className="bullets">
            <li>{p.delKept1}</li>
            <li>{p.delKept2}</li>
            <li>{p.delKept3}</li>
            <li>{p.delKept4}</li>
          </ul>
        </Card>
        <p>{format(p.delHow, { email: user.email ?? '' })}</p>
        <DeletionRequest
          pending={open ? format(p.delPending, { date: when(open.requested_at), until: when(open.expires_at) }) : null}
          blocked={demoRoleFor(user.id) ? p.delDemo : null}
          s={{
            send: p.delSend,
            sent: format(p.delSent, { email: user.email ?? '' }),
            cancel: p.delCancel,
            cancelled: p.delCancelled,
            errors: { last_admin: p.delLastAdmin, demo: p.delDemo, too_soon: p.delTooSoon, failed: t.member.genericFail, not_allowed: t.member.genericFail },
          }}
        />
        <Button variant="ghost" iconStart="arrow-left" href="/account">
          {t.account.settings}
        </Button>
      </div>
    </main>
  );
}
