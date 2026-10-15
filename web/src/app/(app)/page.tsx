import { EmptyState } from '@choirbook/ui';
import { redirect } from 'next/navigation';
import { getT } from '@/lib/prefs';
import { getMemberships, getUser } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// "/" sends a signed-in member to the choir they used last (or their first one).
export default async function Root() {
  if (!(await getUser())) redirect('/sign-in');
  const memberships = await getMemberships();
  if (memberships.length > 0) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('last_organization_id').maybeSingle();
    const pick = memberships.find((m) => m.org.id === profile?.last_organization_id) ?? memberships[0]!;
    redirect(`/c/${pick.org.slug}` as never);
  }

  const { t } = await getT();
  return (
    <main className="public" id="main">
      <div className="public__card public__card--wide">
        <EmptyState icon="users" title={t.home.noChoirTitle}>
          {t.home.noChoirBody}
        </EmptyState>
      </div>
    </main>
  );
}
