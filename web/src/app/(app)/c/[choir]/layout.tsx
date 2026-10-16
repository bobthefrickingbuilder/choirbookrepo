import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { GuidedTour } from '@/components/demo/GuidedTour';
import { AppShell } from '@/components/shell/AppShell';
import { demoRoleFor } from '@/lib/demo';
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

  // The public demo: banner with role preview, and the guided tour.
  const demoRole = ctx.org.is_demo ? demoRoleFor(user.id) : null;
  const tour = demoRole === 'chorister' ? t.demo.tourChorister : t.demo.tourStaff;
  const tourTargets =
    demoRole === 'chorister'
      ? [null, hrefFor(slug, 'home'), hrefFor(slug, 'music'), hrefFor(slug, 'calendar'), hrefFor(slug, 'messages'), '.cb-userbtn']
      : [null, hrefFor(slug, 'home'), hrefFor(slug, 'roster'), hrefFor(slug, 'attendance'), hrefFor(slug, 'comms'), hrefFor(slug, 'forms'), '.demo-banner__roles'];

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
      banner={
        demoRole ? (
          <DemoBanner
            role={demoRole}
            s={{
              banner: t.demo.banner,
              viewingAs: t.demo.viewingAs,
              asAdmin: t.demo.asAdmin,
              asSectionLeader: t.demo.asSectionLeader,
              asTreasurer: t.demo.asTreasurer,
              tryStaff: t.demo.tryStaff,
              tryChorister: t.demo.tryChorister,
              takeTour: t.demo.takeTour,
              leave: t.demo.leave,
            }}
          />
        ) : null
      }
      overlay={
        demoRole ? (
          <Suspense fallback={null}>
            <GuidedTour
              steps={tour.map(([title = '', body = ''], i) => ({ title, body, target: tourTargets[i] ?? null }))}
              s={{ step: t.demo.tourStep, next: t.demo.tourNext, back: t.demo.tourBack, skip: t.demo.tourSkip, done: t.demo.tourDone }}
            />
          </Suspense>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
