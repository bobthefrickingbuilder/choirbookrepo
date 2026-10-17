import { format } from '@choirbook/shared/i18n';
import { isMinor } from '@choirbook/shared/rules/age';
import { AlertCard, Badge, Button, Card, FormStatusBadge } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ResendGuardian } from '@/components/member/FeeActions';
import { FormFill } from '@/components/member/FormFill';
import { getMemberProfile } from '@/lib/data/member';
import { formatDate } from '@/lib/format';
import { parseFields, type Answers } from '@/lib/formFields';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export default async function FormPage({ params }: PageProps<'/c/[choir]/forms-fees/[formId]'>) {
  const { choir, formId } = await params;
  if (!z.uuid().safeParse(formId).success) notFound();
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const [{ data: form }, { data: response }, profile] = await Promise.all([
    supabase.from('forms').select('*').eq('id', formId).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('form_responses').select('id, answers, status, signed_name, signed_at').eq('form_id', formId).eq('person_id', ctx.personId).maybeSingle(),
    getMemberProfile(ctx),
  ]);
  if (!form || form.status === 'draft') notFound();

  const minor = isMinor(profile.dateOfBirth);
  const needsGuardian = form.guardian_signature_required && minor;
  const [{ data: sigs }, { data: guardians }] = needsGuardian
    ? await Promise.all([
        response ? supabase.from('guardian_signatures').select('guardian_id, used_at, signed_name, revoked_at, expires_at').eq('response_id', response.id) : Promise.resolve({ data: [] }),
        supabase.from('guardian_links').select('guardian_id, guardians(first_name, last_name, email)').eq('chorister_id', ctx.personId),
      ])
    : [{ data: [] }, { data: [] }];

  const editable = form.status === 'open' && (!response || response.status === 'in_progress' || response.status === 'changes');
  const fields = parseFields(form.fields);
  const answers = (response?.answers && typeof response.answers === 'object' && !Array.isArray(response.answers) ? response.answers : {}) as Answers;
  const label = (id: string) => {
    const f = fields.find((x) => x.id === id);
    return f ? (lang === 'fr' ? f.label_fr : f.label_en) : id;
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <Button variant="ghost" size="sm" iconStart="arrow-left" href={`/c/${choir}/forms-fees`}>
        {t.member.formsFeesTitle}
      </Button>
      <header className="stack" style={{ gap: 6 }}>
        <h1 className="page__title">{form.title}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {response ? <FormStatusBadge status={response.status} lang={lang} /> : null}
          {form.due_on ? (
            <span className="muted">{format(t.member.dueDate, { date: formatDate(`${form.due_on}T12:00:00Z`, lang, { month: 'long', day: 'numeric' }) })}</span>
          ) : null}
        </div>
        {form.description ? <p className="page__lede">{form.description}</p> : null}
      </header>

      <Card>
        {editable ? (
          <FormFill
            slug={choir}
            formId={form.id}
            fields={fields}
            initial={answers}
            requiresSignature={form.requires_signature}
            wording={form.description}
            lang={lang}
            s={{
              saveDraft: t.member.saveDraft,
              submit: t.member.submitForm,
              signAndSubmit: t.member.signAndSubmit,
              draftSaved: t.member.draftSaved,
              submitted: t.member.formSubmitted,
              locked: t.member.formLocked,
              missing: t.member.fieldRequired,
              signature: t.member.signatureNeeded,
              failed: t.member.genericFail,
              guardianSent: t.member.guardianSent,
              signTitle: form.title,
            }}
          />
        ) : (
          <div className="stack">
            <AlertCard tone="info">{t.member.formLocked}</AlertCard>
            {Object.keys(answers).length ? (
              <dl className="answer-list">
                {Object.entries(answers).map(([k, v]) => (
                  <div key={k}>
                    <dt>{label(k)}</dt>
                    <dd>{typeof v === 'boolean' ? (v ? t.member.yes : t.member.no) : v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {response?.signed_name ? (
              <p className="muted">
                {response.signed_name}
                {response.signed_at ? ` · ${formatDate(response.signed_at, lang, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {needsGuardian ? (
        <Card title={t.member.guardianTitle}>
          <div className="stack">
            <p className="muted">{t.member.guardianIntro}</p>
            {!guardians?.some((g) => g.guardians?.email) ? (
              <AlertCard tone="warning">{t.member.guardianNone}</AlertCard>
            ) : (
              <ul className="plain-list" style={{ gap: 8 }}>
                {(guardians ?? []).map((g) => {
                  const sig = (sigs ?? []).find((x) => x.guardian_id === g.guardian_id && !x.revoked_at);
                  const name = `${g.guardians?.first_name ?? ''} ${g.guardians?.last_name ?? ''}`.trim();
                  return (
                    <li key={g.guardian_id}>
                      {sig?.used_at ? (
                        <Badge tone="success" icon="circle-check" size="md">
                          {format(t.member.guardianSigned, { name: sig.signed_name ?? name })}
                        </Badge>
                      ) : (
                        <Badge tone="warning" icon="clock" size="md">
                          {format(t.member.guardianWaiting, { name })}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {response && response.status !== 'in_progress' && !(sigs ?? []).some((x) => x.used_at) ? (
              <ResendGuardian
                slug={choir}
                responseId={response.id}
                s={{ resend: t.member.guardianResend, sent: t.member.guardianSent, tooSoon: t.member.guardianTooSoon, failed: t.member.genericFail, demoReady: t.privacy.demoLinkReady, openLink: t.privacy.openGuardianLink }}
              />
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
