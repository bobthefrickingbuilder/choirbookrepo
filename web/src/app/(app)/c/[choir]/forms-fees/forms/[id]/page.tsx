import { format } from '@choirbook/shared/i18n';
import { isMinor } from '@choirbook/shared/rules/age';
import { Badge, Card, FormStatusBadge } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteDefButton, FormBuilder, ResendGuardianButton, ReviewButtons } from '@/components/staff/FinanceParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { getSections } from '@/lib/data/roster';
import { parseFields } from '@/lib/formFields';
import { formatDate } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Form' };

export default async function StaffFormPage({ params, searchParams }: PageProps<'/c/[choir]/forms-fees/forms/[id]'>) {
  const { choir, id } = await params;
  const { edit } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(id).success) notFound();
  if (!ctx.can('forms')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: form }, { data: responses }, { data: choristers }, { data: sigs }, sections] = await Promise.all([
    supabase.from('forms').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('form_responses').select('id, person_id, status, answers, submitted_at, signed_name, review_note').eq('form_id', id),
    supabase
      .from('choristers')
      .select('person_id, section_id, people!inner(first_name, last_name, preferred_name, date_of_birth)')
      .eq('organization_id', ctx.org.id)
      .eq('status', 'active'),
    supabase.from('guardian_signatures').select('response_id, used_at, revoked_at, sent_at'),
    getSections(ctx.org.id),
  ]);
  if (!form) notFound();
  const s = staffStrings(t);
  const fields = parseFields(form.fields);
  const canEdit = ctx.can('forms', 'edit');

  if (edit === '1' && canEdit) {
    return (
      <div className="page" style={{ maxWidth: 900 }}>
        <Link href={`/c/${choir}/forms-fees/forms/${id}` as never} className="back-link">
          ← {form.title}
        </Link>
        <h1 className="page__title">{t.staff.editForm}</h1>
        <FormBuilder
          slug={choir}
          id={id}
          sections={sections.map((x) => ({ id: x.id, name: lang === 'fr' ? x.name_fr : x.name_en }))}
          s={s}
          initial={{
            title: form.title,
            kind: form.kind,
            description: form.description ?? '',
            due_on: form.due_on ?? '',
            requires_signature: form.requires_signature,
            guardian_signature_required: form.guardian_signature_required,
            section_ids: form.section_ids,
            status: form.status,
            fields,
          }}
        />
      </div>
    );
  }

  const called = (choristers ?? [])
    .filter((c) => !form.section_ids.length || (c.section_id && form.section_ids.includes(c.section_id)))
    .sort((a, b) => a.people.last_name.localeCompare(b.people.last_name));
  const label = (f: (typeof fields)[number]) => (lang === 'fr' ? f.label_fr : f.label_en);
  const answerText = (f: (typeof fields)[number], v: unknown) => {
    if (f.type === 'checkbox') return v === true ? t.staff.yes : t.staff.no;
    if (f.type === 'select') {
      const o = f.options?.find((x) => x.value === v);
      return o ? (lang === 'fr' ? o.label_fr : o.label_en) : '—';
    }
    return typeof v === 'string' && v ? v : '—';
  };
  const doneN = (responses ?? []).filter((r) => r.status === 'submitted' || r.status === 'approved').length;

  return (
    <div className="page page--wide">
      <Link href={`/c/${choir}/forms-fees?tab=forms` as never} className="back-link">
        ← {t.staff.financeTitle}
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">{form.title}</h1>
          <p className="page__lede">
            {t.staff[`kind_${form.kind}`]} · {t.staff[`formStatus_${form.status}`]}
            {form.due_on ? ` · ${t.staff.feeDue} ${formatDate(`${form.due_on}T12:00:00Z`, lang, { month: 'long', day: 'numeric' })}` : ''}
          </p>
        </div>
        {canEdit ? (
          <div className="page__actions">
            <Link className="cb-btn cb-btn--secondary cb-btn--md" href={`/c/${choir}/forms-fees/forms/${id}?edit=1` as never}>
              {t.staff.editForm}
            </Link>
            <DeleteDefButton slug={choir} id={id} kind="form" s={s} />
          </div>
        ) : null}
      </div>

      <Card title={`${t.staff.responses} · ${format(t.staff.responsesN, { done: doneN, total: called.length })}`} padded={false}>
        <ul className="plain-list">
          {called.map((c) => {
            const r = responses?.find((x) => x.person_id === c.person_id);
            const minor = isMinor(c.people.date_of_birth);
            const sig = r ? (sigs ?? []).filter((g) => g.response_id === r.id && !g.revoked_at) : [];
            const guardianDone = sig.some((g) => g.used_at);
            const name = `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`;
            const answers = (r?.answers ?? {}) as Record<string, unknown>;
            return (
              <li key={c.person_id} className="response-row">
                <div className="row-between">
                  <div className="person-row__name">
                    <Link className="cb-link" href={`/c/${choir}/roster/${c.person_id}` as never}>
                      {name}
                    </Link>
                    {r ? <FormStatusBadge status={r.status} lang={lang} /> : <Badge tone="neutral">{t.staff.notStarted}</Badge>}
                    {form.guardian_signature_required && minor && r && r.status !== 'in_progress' ? (
                      <Badge tone={guardianDone ? 'success' : 'warning'} icon="signature">
                        {guardianDone ? t.staff.guardianSigned : t.staff.guardianPending}
                      </Badge>
                    ) : null}
                  </div>
                  {canEdit && r ? (
                    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.status === 'submitted' ? <ReviewButtons slug={choir} responseId={r.id} s={s} /> : null}
                      {form.guardian_signature_required && minor && !guardianDone && r.status !== 'in_progress' ? (
                        <ResendGuardianButton slug={choir} responseId={r.id} s={s} />
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {r && (fields.length || r.signed_name) ? (
                  <details className="history" style={{ marginTop: 4 }}>
                    <summary>{t.staff.answers}</summary>
                    <dl className="def-list" style={{ marginTop: 8 }}>
                      {fields.map((f) => (
                        <div key={f.id} style={{ display: 'contents' }}>
                          <dt>{label(f)}</dt>
                          <dd>{answerText(f, answers[f.id])}</dd>
                        </div>
                      ))}
                      {r.signed_name ? (
                        <>
                          <dt>{t.staff.signedBy.replace('{name}', '')}</dt>
                          <dd>{r.signed_name}</dd>
                        </>
                      ) : null}
                      {r.review_note ? (
                        <>
                          <dt>{t.staff.reviewNote}</dt>
                          <dd>{r.review_note}</dd>
                        </>
                      ) : null}
                    </dl>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
