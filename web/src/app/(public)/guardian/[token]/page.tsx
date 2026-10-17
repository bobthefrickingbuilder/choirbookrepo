import { format, getMessages, isLang, type Lang } from '@choirbook/shared/i18n';
import { AlertCard, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { GuardianSignForm } from '@/components/auth/GuardianSignForm';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { formatDate } from '@/lib/format';
import { parseFields, type Answers } from '@/lib/formFields';
import { LANG_COOKIE } from '@/lib/prefs';
import { clientIp, withinLimits } from '@/lib/security';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Guardian signature', robots: { index: false, follow: false }, referrer: 'no-referrer' };

// Opened from the email sent to a minor's guardian. No account: the token in
// the address is checked on the server, and nothing else about the choir is shown.

type Info = {
  state: 'valid' | 'used' | 'expired' | 'revoked' | 'unknown';
  choir?: string;
  lang?: string;
  guardian?: string;
  chorister?: string;
  form?: string;
  description?: string | null;
  fields?: unknown;
  answers?: Answers;
  expires_at?: string;
  signed_name?: string | null;
  used_at?: string | null;
};

export default async function GuardianSignPage({ params, searchParams }: PageProps<'/guardian/[token]'>) {
  const { token } = await params;
  const demo = (await searchParams).demo === '1';
  const ip = await clientIp();
  const valid = /^[0-9a-f]{32,128}$/.test(token);
  const allowed = valid && (await withinLimits(ip ? [{ key: `guardian:view:${ip}`, max: 60, windowSeconds: 15 * 60 }] : []));

  let info: Info = { state: 'unknown' };
  if (allowed) {
    try {
      const { data, error } = await createAdminClient().rpc('guardian_link_lookup', { token });
      if (error) console.error('Guardian link lookup failed', error);
      else info = data as Info;
    } catch (err) {
      console.error('Guardian link lookup failed', err);
    }
  }

  // The guardian's language unless they chose another on this page.
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  const lang: Lang = isLang(saved) ? saved : isLang(info.lang) ? info.lang : 'en';
  const t = getMessages(lang);
  const p = t.privacy;
  const date = (iso?: string | null) => (iso ? formatDate(iso, lang, { dateStyle: 'long', timeStyle: 'short' }) : '');

  const states: Record<Exclude<Info['state'], 'valid'>, [string, string]> = {
    used: [p.gUsedTitle, format(p.gUsedBody, { name: info.signed_name ?? '', date: date(info.used_at) })],
    expired: [p.gExpiredTitle, p.gExpiredBody],
    revoked: [p.gRevokedTitle, p.gRevokedBody],
    unknown: !allowed && valid ? [p.gUnknownTitle, p.gTooMany] : [p.gUnknownTitle, p.gUnknownBody],
  };

  return (
    <PublicFrame lang={lang} languageLabel={t.account.language} wide>
      {info.state !== 'valid' ? (
        <div className="stack">
          <AlertCard tone={info.state === 'used' ? 'success' : 'warning'} title={states[info.state][0]}>
            {states[info.state][1]}
          </AlertCard>
          {info.choir ? <p className="muted">{[info.choir, info.form].filter(Boolean).join(' · ')}</p> : null}
        </div>
      ) : (
        <div className="stack">
          {demo ? <AlertCard tone="info">{p.gDemoNote}</AlertCard> : null}
          <div className="public__heading">
            <h1>{format(p.gTitle, { form: info.form ?? '' })}</h1>
            <p>{format(p.gIntro, { chorister: info.chorister ?? '', choir: info.choir ?? '' })}</p>
          </div>
          {info.description ? <p style={{ whiteSpace: 'pre-wrap' }}>{info.description}</p> : null}
          <Card title={p.gAnswers} flat>
            <Answers fields={info.fields} answers={info.answers ?? {}} lang={lang} empty={p.gNoAnswers} yes={p.yes} no={p.no} />
          </Card>
          <GuardianSignForm
            token={token}
            defaultName={info.guardian ?? ''}
            s={{
              signLabel: p.gSignLabel,
              signHint: p.gSignHint,
              agree: format(p.gAgree, { chorister: info.chorister ?? '' }),
              sign: p.gSign,
              signedTitle: p.gSignedTitle,
              signedBody: format(p.gSignedBody, { choir: info.choir ?? '' }),
              errors: {
                name: p.gNameShort,
                agree: p.gAgreeRequired,
                too_many: p.gTooMany,
                used: p.gUsedTitle,
                expired: p.gExpiredBody,
                revoked: p.gRevokedBody,
                unknown: p.gUnknownBody,
                failed: p.gUnknownBody,
              },
            }}
          />
          <p className="muted small">{format(p.gExpires, { date: date(info.expires_at) })}</p>
        </div>
      )}
      <p className="small">
        <Link href="/privacy">{p.gPrivacyLink}</Link>
      </p>
    </PublicFrame>
  );
}

function Answers({ fields, answers, lang, empty, yes, no }: { fields: unknown; answers: Answers; lang: Lang; empty: string; yes: string; no: string }) {
  const list = parseFields(fields);
  if (!list.length) return <p className="muted">{empty}</p>;
  return (
    <dl className="answers">
      {list.map((f) => {
        const v = answers[f.id];
        const shown =
          f.type === 'checkbox'
            ? v === true
              ? yes
              : no
            : f.type === 'select'
              ? (f.options?.find((o) => o.value === v)?.[lang === 'fr' ? 'label_fr' : 'label_en'] ?? '')
              : typeof v === 'string'
                ? v
                : '';
        return (
          <div key={f.id}>
            <dt>{lang === 'fr' ? f.label_fr : f.label_en}</dt>
            <dd>{shown || '—'}</dd>
          </div>
        );
      })}
    </dl>
  );
}
