import { format } from '@choirbook/shared/i18n';
import { Badge, Card, EmptyState } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { MemberHome } from '@/components/member/MemberHome';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

// Home: the chorister home (Phase 3), or the staff dashboard (Phase 5).
export default async function ChoirHome({ params }: PageProps<'/c/[choir]'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();

  if (!ctx.isStaff) return <MemberHome ctx={ctx} t={t} lang={lang} />;

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
      <Card padded={false}>
        <EmptyState icon="layout-grid" title={t.common.comingSoon}>
          {t.common.comingSoonBody}
        </EmptyState>
      </Card>
    </div>
  );
}
