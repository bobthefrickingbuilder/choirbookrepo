import { notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { buildNav, hrefFor } from '@/lib/nav';
import { getT } from '@/lib/prefs';
import { getChoirContext, getMemberships, getUser } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export default async function ChoirLayout({ children, params }: LayoutProps<'/c/[choir]'>) {
  const { choir: slug } = await params;
  const [ctx, memberships, user, { lang, t }] = await Promise.all([getChoirContext(slug), getMemberships(), getUser(), getT()]);
  // Not a member of this choir (or it does not exist): same answer either way.
  if (!ctx || !user) notFound();

  // Remember this choir for next time (best effort).
  const supabase = await createClient();
  await supabase.from('profiles').update({ last_organization_id: ctx.org.id }).eq('id', user.id);

  const { sections, bottom } = buildNav(ctx, t);
  const roleName = ctx.roles[0] ? (lang === 'fr' ? ctx.roles[0].nameFr : ctx.roles[0].nameEn) : t.roles.chorister;

  return (
    <AppShell
      lang={lang}
      strings={{
        mainNav: t.nav.mainNav,
        openMenu: t.nav.openMenu,
        switchChoir: t.nav.switchChoir,
        notifications: t.nav.notifications,
        skipToContent: t.app.skipToContent,
        signOutEverywhere: t.account.signOutEverywhere,
        accountSettings: t.account.settings,
      }}
      user={{ name: ctx.displayName, role: roleName, email: user.email ?? undefined }}
      choirs={memberships.map((m) => ({
        id: m.org.slug,
        name: m.org.name,
        shortName: m.org.short_name ?? undefined,
        theme: 'choirbook',
      }))}
      currentSlug={slug}
      brandColor={ctx.org.brand_color}
      sections={sections}
      bottomItems={bottom}
      useBottomNav={!ctx.isStaff}
      homeHref={hrefFor(slug, 'home')}
      profileHref={hrefFor(slug, 'profile')}
      notificationsHref={hrefFor(slug, 'notifications')}
    >
      {children}
    </AppShell>
  );
}
