import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormBuilder } from '@/components/staff/FinanceParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { getSections } from '@/lib/data/roster';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';

export const metadata: Metadata = { title: 'New form' };

export default async function NewFormPage({ params }: PageProps<'/c/[choir]/forms-fees/forms/new'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('forms', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const sections = await getSections(ctx.org.id);
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <Link href={`/c/${choir}/forms-fees` as never} className="back-link">
        ← {t.staff.financeTitle}
      </Link>
      <h1 className="page__title">{t.staff.newForm}</h1>
      <FormBuilder
        slug={choir}
        id={null}
        sections={sections.map((s) => ({ id: s.id, name: lang === 'fr' ? s.name_fr : s.name_en }))}
        s={staffStrings(t)}
        initial={{
          title: '',
          kind: 'permission',
          description: '',
          due_on: '',
          requires_signature: true,
          guardian_signature_required: ctx.org.kind === 'youth',
          section_ids: [],
          status: 'draft',
          fields: [],
        }}
      />
    </div>
  );
}
