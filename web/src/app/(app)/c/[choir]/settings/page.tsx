import { format } from '@choirbook/shared/i18n';
import { Badge, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { ChoirDetailsForm, ConsentVersionForm, PoliciesForm, RangeForm, SectionForm, SmallAction } from '@/components/staff/SettingsParts';
import { publicEnv } from '@/lib/env';
import { formatDate } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Choir settings' };

const KINDS = ['participation', 'code_of_conduct', 'photo_video', 'medical_info'] as const;

export default async function SettingsPage({ params }: PageProps<'/c/[choir]/settings'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('settings')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const org = ctx.org.id;
  const [{ data: o }, { data: seasons }, { data: sections }, { data: wording }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', org).single(),
    supabase.from('seasons').select('id, name, starts_on, ends_on, is_current, terms(id, name, starts_on, ends_on, absence_limit)').eq('organization_id', org).order('starts_on', { ascending: false }),
    supabase.from('sections').select('id, key, name_en, name_fr, sort, voice_parts(id, key, name_en, name_fr, sort)').eq('organization_id', org).order('sort'),
    supabase.from('consent_wording_versions').select('kind, version, body_en, body_fr, effective_at').eq('organization_id', org).order('version', { ascending: false }),
  ]);
  if (!o) notFound();
  const s = staffStrings(t);
  const canEdit = ctx.can('settings', 'edit');
  const settings = (o.settings ?? {}) as { late_after_minutes?: number; family_discount_default?: number; etransfer_instructions?: string };
  const logoUrl = o.logo_path ? `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/choir-logos/${o.logo_path}` : null;
  const dmy = (d: string) => formatDate(`${d}T12:00:00Z`, lang, { dateStyle: 'medium' });
  const kindLabel = { participation: t.staff.consent_participation, code_of_conduct: t.staff.consent_code_of_conduct, photo_video: t.staff.consent_photo_video, medical_info: t.staff.consent_medical_info };

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div>
        <h1 className="page__title">{t.staff.settingsTitle}</h1>
        <p className="page__lede">{t.staff.settingsSub}</p>
      </div>

      <Card title={t.staff.choirDetails}>
        {canEdit ? (
          <ChoirDetailsForm
            slug={choir}
            orgId={org}
            logoUrl={logoUrl}
            s={s}
            initial={{ name: o.name, short_name: o.short_name ?? '', brand_color: o.brand_color ?? '', kind: o.kind, default_lang: o.default_lang }}
          />
        ) : (
          <p>{o.name}</p>
        )}
      </Card>

      <Card title={t.staff.seasonsTerms} action={canEdit ? <RangeForm kind="season" slug={choir} s={s} /> : undefined}>
        <div className="stack" style={{ gap: 14 }}>
          {(seasons ?? []).map((se) => (
            <div key={se.id} className="note">
              <div className="row-between">
                <div className="person-row__name">
                  {se.name}
                  <span className="muted small">
                    {dmy(se.starts_on)} – {dmy(se.ends_on)}
                  </span>
                  {se.is_current ? <Badge tone="accent">{t.staff.currentSeason}</Badge> : null}
                </div>
                {canEdit ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {!se.is_current ? <SmallAction slug={choir} kind="current" id={se.id} label={se.name} s={s} /> : null}
                    <RangeForm kind="season" slug={choir} id={se.id} s={s} initial={{ name: se.name, starts_on: se.starts_on, ends_on: se.ends_on }} />
                    <RangeForm kind="term" slug={choir} seasonId={se.id} s={s} />
                  </span>
                ) : null}
              </div>
              <ul className="plain-list" style={{ marginTop: 6 }}>
                {[...se.terms]
                  .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
                  .map((te) => (
                    <li key={te.id} className="history-row">
                      <span>
                        <strong>{te.name}</strong>{' '}
                        <span className="muted small">
                          {dmy(te.starts_on)} – {dmy(te.ends_on)} · {te.absence_limit !== null ? format(t.staff.limitN, { n: te.absence_limit }) : t.staff.noLimit}
                        </span>
                      </span>
                      {canEdit ? (
                        <span style={{ display: 'flex', gap: 4 }}>
                          <RangeForm
                            kind="term"
                            slug={choir}
                            id={te.id}
                            seasonId={se.id}
                            s={s}
                            initial={{ name: te.name, starts_on: te.starts_on, ends_on: te.ends_on, absence_limit: te.absence_limit === null ? '' : String(te.absence_limit) }}
                          />
                          <SmallAction slug={choir} kind="deleteTerm" id={te.id} label={te.name} s={s} />
                        </span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t.staff.sectionsParts} action={canEdit ? <SectionForm slug={choir} kind="section" s={s} /> : undefined}>
        <div className="stack" style={{ gap: 12 }}>
          {(sections ?? []).map((sec) => (
            <div key={sec.id} className="note">
              <div className="row-between">
                <div className="person-row__name">
                  <Badge tone="neutral">{sec.key}</Badge>
                  {lang === 'fr' ? sec.name_fr : sec.name_en}
                </div>
                {canEdit ? (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <SectionForm slug={choir} kind="part" sectionId={sec.id} s={s} />
                    <SectionForm slug={choir} kind="section" id={sec.id} s={s} initial={{ key: sec.key, name_en: sec.name_en, name_fr: sec.name_fr, sort: sec.sort }} />
                    <SmallAction slug={choir} kind="deleteSection" id={sec.id} label={sec.name_en} s={s} />
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {[...sec.voice_parts]
                  .sort((a, b) => a.sort - b.sort)
                  .map((vp) => (
                    <span key={vp.id} className="chip-static">
                      <strong>{vp.key}</strong> {lang === 'fr' ? vp.name_fr : vp.name_en}
                      {canEdit ? (
                        <>
                          <SectionForm slug={choir} kind="part" id={vp.id} sectionId={sec.id} s={s} initial={{ key: vp.key, name_en: vp.name_en, name_fr: vp.name_fr, sort: vp.sort }} />
                          <SmallAction slug={choir} kind="deletePart" id={vp.id} label={vp.name_en} s={s} />
                        </>
                      ) : null}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t.staff.policies}>
        {canEdit ? (
          <PoliciesForm
            slug={choir}
            s={s}
            initial={{ late_after_minutes: settings.late_after_minutes ?? 10, family_discount_default: settings.family_discount_default ?? 0, etransfer_instructions: settings.etransfer_instructions ?? '' }}
          />
        ) : null}
      </Card>

      <Card title={t.staff.consentWording}>
        <p className="muted" style={{ marginTop: 0 }}>
          {t.staff.consentIntro}
        </p>
        <div className="stack" style={{ gap: 12 }}>
          {KINDS.map((k) => {
            const latest = wording?.find((w) => w.kind === k);
            return (
              <div key={k} className="note">
                <div className="row-between">
                  <div className="person-row__name">
                    {kindLabel[k]}
                    {latest ? <Badge tone="neutral">{format(t.staff.versionN, { n: latest.version })}</Badge> : null}
                    {latest ? <span className="muted small">{formatDate(latest.effective_at, lang, { dateStyle: 'medium' })}</span> : null}
                  </div>
                  {canEdit ? <ConsentVersionForm slug={choir} kind={k} label={kindLabel[k]} current={latest ? { en: latest.body_en, fr: latest.body_fr } : null} s={s} /> : null}
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{latest ? (lang === 'fr' ? latest.body_fr : latest.body_en) : t.staff.noWording}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
