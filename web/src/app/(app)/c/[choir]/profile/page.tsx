import type { Messages } from '@choirbook/shared/i18n';
import { format } from '@choirbook/shared/i18n';
import { Badge, Button, Card, Field, VoicePartBadge } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LanguageSwitch } from '@/components/auth/LanguageSwitch';
import { ThemeSwitch } from '@/components/auth/ThemeSwitch';
import { ConsentItem } from '@/components/member/Consents';
import { ProfileForm } from '@/components/member/ProfileForm';
import { PrefToggle } from '@/components/member/SmallActions';
import { getMemberProfile } from '@/lib/data/member';
import { getMyConsents, getMyGuardians } from '@/lib/data/privacy';
import { formatDate } from '@/lib/format';
import { getT, getTheme } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Profile' };

const CATEGORIES = ['announcements', 'schedule', 'music', 'messages', 'forms', 'fees', 'tickets', 'volunteers'] as const;
const catLabel = (c: (typeof CATEGORIES)[number], t: Messages) =>
  ({
    announcements: t.member.catAnnouncements,
    schedule: t.member.catSchedule,
    music: t.member.catMusicN,
    messages: t.member.catMessages,
    forms: t.member.catForms,
    fees: t.member.catFeesN,
    tickets: t.member.catTickets,
    volunteers: t.member.catVolunteers,
  })[c];

export default async function ProfilePage({ params }: PageProps<'/c/[choir]/profile'>) {
  const { choir } = await params;
  const [ctx, { lang, t }, theme] = await Promise.all([getChoirContext(choir), getT(), getTheme()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const [profile, { data: me }, { data: prefs }, consents, guardians] = await Promise.all([
    getMemberProfile(ctx),
    supabase.from('people').select('email, preferred_name, pronouns, phone, contact_visibility').eq('id', ctx.personId).single(),
    supabase.from('notification_preferences').select('*'),
    ctx.isChorister ? getMyConsents(ctx) : Promise.resolve([]),
    getMyGuardians(ctx),
  ]);
  const p = t.privacy;
  const kindLabel = { participation: t.staff.consent_participation, code_of_conduct: t.staff.consent_code_of_conduct, photo_video: t.staff.consent_photo_video, medical_info: t.staff.consent_medical_info };
  const pref = (c: string) => prefs?.find((p) => p.category === c) ?? { in_app: true, email_digest: true, push: false };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <header className="stack" style={{ gap: 6 }}>
        <h1 className="page__title">{ctx.displayName}</h1>
        <div className="member-head__meta">
          {profile.partKey ? <VoicePartBadge part={profile.partKey} variant="pill" lang={lang} /> : null}
          <span>{ctx.org.name}</span>
        </div>
      </header>

      <Card title={t.member.contactDetails}>
        <div className="stack">
          <Field label={t.member.emailOnFile} hint={t.member.emailChange}>
            <span>{me?.email}</span>
          </Field>
          <ProfileForm
            slug={choir}
            initial={{
              preferredName: me?.preferred_name ?? '',
              pronouns: me?.pronouns ?? '',
              phone: me?.phone ?? '',
              shared: me?.contact_visibility === 'choir',
            }}
            s={{
              preferredName: t.member.preferredName,
              pronouns: t.member.pronouns,
              phone: t.member.phone,
              share: t.member.shareContact,
              shareHint: t.member.shareContactHint,
              save: t.member.saveProfile,
              saved: t.member.profileSaved,
              failed: t.member.genericFail,
            }}
          />
        </div>
      </Card>

      {consents.length ? (
        <Card title={p.consentsTitle}>
          <div className="stack" id="consents" style={{ scrollMarginTop: 80 }}>
            <p className="muted" style={{ margin: 0 }}>
              {p.consentsIntro} {p.requiredNote}
            </p>
            {consents.map((c) => (
              <ConsentItem
                key={c.kind}
                slug={choir}
                c={{
                  kind: c.kind,
                  label: kindLabel[c.kind],
                  required: c.required,
                  wording: c.wording ? (lang === 'fr' ? c.wording.fr : c.wording.en) : null,
                  granted: c.answer ? c.answer.granted : null,
                  needsAnswer: c.needsAnswer,
                  stateLine: c.answer
                    ? format(p.stateOn, { state: c.answer.granted ? p.given : p.withdrawn, date: formatDate(c.answer.at, lang, { dateStyle: 'medium' }), v: c.answer.version })
                    : null,
                }}
                s={{
                  required: p.required,
                  optional: p.optional,
                  given: p.given,
                  withdrawn: p.withdrawn,
                  notAnswered: p.notAnswered,
                  agree: p.agree,
                  withdraw: p.withdraw,
                  newWording: p.newWording,
                  noWording: p.noWordingYet,
                  saved: p.consentSaved,
                  failed: t.member.genericFail,
                }}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {guardians ? (
        <Card title={p.guardiansTitle}>
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              {p.guardiansIntro}
            </p>
            {guardians.length ? (
              <ul className="plain-list">
                {guardians.map((g) => (
                  <li key={g.name} className="note">
                    <div className="person-row__name">
                      {g.name}
                      {g.relationship ? <span className="muted small">{g.relationship}</span> : null}
                    </div>
                    <p className="muted small" style={{ margin: '4px 0' }}>
                      {[g.email, g.phone].filter(Boolean).join(' · ')}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="neutral">{g.copies ? p.getsCopies : p.noCopies}</Badge>
                      {g.emergency ? <Badge tone="neutral">{p.emergencyContact}</Badge> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{p.guardiansNone}</p>
            )}
          </div>
        </Card>
      ) : null}

      <Card title={`${t.account.language} · ${t.account.appearance}`}>
        <div className="form-2col">
          <Field as="fieldset" label={t.account.language}>
            <LanguageSwitch lang={lang} label={t.account.language} />
          </Field>
          <Field as="fieldset" label={t.account.appearance}>
            <ThemeSwitch value={theme} label={t.account.appearance} labels={{ auto: t.account.themeAuto, light: t.account.light, dark: t.account.dark }} />
          </Field>
        </div>
      </Card>

      <Card title={t.member.notificationsTitle}>
        <div className="stack">
          <p className="muted">{t.member.notifIntro}</p>
          <table className="pref-table">
            <caption className="cb-sr-only">{t.member.notificationsTitle}</caption>
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">{t.member.notifInApp}</th>
                <th scope="col">{t.member.notifEmail}</th>
                <th scope="col">{t.member.notifPush}</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const p = pref(c);
                const name = catLabel(c, t);
                return (
                  <tr key={c}>
                    <th scope="row">{name}</th>
                    <td>
                      <PrefToggle category={c} channel="in_app" checked={p.in_app} label={`${name}: ${t.member.notifInApp}`} />
                    </td>
                    <td>
                      <PrefToggle category={c} channel="email_digest" checked={p.email_digest} label={`${name}: ${t.member.notifEmail}`} />
                    </td>
                    <td>
                      <PrefToggle category={c} channel="push" checked={p.push} label={`${name}: ${t.member.notifPush}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted">{t.member.pushHint}</p>
        </div>
      </Card>

      <Card title={t.member.yourData}>
        <div className="stack">
          <p className="muted">{t.member.yourDataIntro}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" iconStart="download" href={`/c/${choir}/profile/export?format=json`}>
              {t.member.downloadJson}
            </Button>
            <Button variant="secondary" iconStart="download" href={`/c/${choir}/profile/export?format=csv`}>
              {t.member.downloadCsv}
            </Button>
          </div>
          <p className="muted">
            {t.member.deleteSoon}{' '}
            <a href="/account/delete" className="cb-link">
              {p.delLink}
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
