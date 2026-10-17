import { format } from '@choirbook/shared/i18n';
import { AlertCard } from '@choirbook/ui';
import Link from 'next/link';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { formatDate } from '@/lib/format';
import { LEGAL_DRAFT_DATE, legalDoc } from '@/lib/legal';
import { getT } from '@/lib/prefs';

/** The privacy policy or the terms, in the reader's language, marked as a draft until approved. */
export async function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { lang, t } = await getT();
  const doc = legalDoc(kind, lang);
  return (
    <PublicFrame lang={lang} languageLabel={t.account.language} wide>
      <article className="legal">
        <AlertCard tone="warning">{t.privacy.draftBanner}</AlertCard>
        <h1>{doc.title}</h1>
        <p className="muted small">{format(t.privacy.lastUpdated, { date: formatDate(`${LEGAL_DRAFT_DATE}T12:00:00Z`, lang, { dateStyle: 'long' }) })}</p>
        <p>{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.list ? (
              <ul className="bullets">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : null}
            {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}
        <p className="small">
          <Link href={kind === 'privacy' ? '/terms' : '/privacy'}>{kind === 'privacy' ? t.privacy.termsTitle : t.privacy.privacyTitle}</Link>
        </p>
      </article>
    </PublicFrame>
  );
}
