import { format } from '@choirbook/shared/i18n';
import { Badge, Card } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { StaffDashboard } from '@/components/dashboard/StaffDashboard';
import { MemberHome } from '@/components/member/MemberHome';
import { readFilters } from '@/lib/data/filters';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

// Home: the chorister home, or the staff dashboard. Staff without dashboard
// access (a chaperone, say) get a short welcome with their roles.
export default async function ChoirHome({ params, searchParams }: PageProps<'/c/[choir]'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();

  if (!ctx.isStaff) return <MemberHome ctx={ctx} t={t} lang={lang} />;
  if (ctx.can('dashboard')) return <StaffDashboard ctx={ctx} t={t} lang={lang} filters={await readFilters(ctx, await searchParams, lang)} />;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="overline">{ctx.org.name}</p>
          <h1 className="page__title">{format(t.home.welcome, { name: ctx.firstName })}</h1>
        </div>
      </div>
      <p className="page__lede">{t.home.staffIntro}</p>
      <Card title={format(t.home.yourRoles, { choir: ctx.org.short_name ?? ctx.org.name })}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ctx.roles.map((r) => (
            <Badge key={r.nameEn} tone="neutral" icon="shield-check" size="md">
              {lang === 'fr' ? r.nameFr : r.nameEn}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
