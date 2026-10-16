'use server';

import { getMessages } from '@choirbook/shared/i18n';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addDays, todayLocal, zonedInstant } from '@/lib/format';
import { fieldSchema } from '@/lib/formFields';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Forms (staff with "forms" edit) and fees and payments ("fees" edit).

const formSchema = z.object({
  title: z.string().trim().min(1, 'required').max(200),
  kind: z.enum(['registration', 'permission', 'medical', 'consent', 'agreement', 'survey', 'other']),
  description: z.string().trim().max(4000).transform((v) => v || null),
  due_on: z.union([z.literal(''), z.iso.date()]).transform((v) => v || null),
  requires_signature: z.boolean(),
  guardian_signature_required: z.boolean(),
  section_ids: z.array(uuid).max(20),
  status: z.enum(['draft', 'open', 'closed']),
  fields: z.array(fieldSchema).max(60),
});
export type FormDefInput = z.input<typeof formSchema>;

export async function saveFormDef(slug: string, id: string | null, input: FormDefInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await staffContext(slug, 'forms');
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  const parsed = formSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message === 'required' ? 'required' : 'invalid');
  const v = parsed.data;
  if (new Set(v.fields.map((f) => f.id)).size !== v.fields.length) return fail('invalid');
  const supabase = await createClient();
  const { data: season } = await supabase.from('seasons').select('id').eq('organization_id', ctx.org.id).eq('is_current', true).maybeSingle();
  const res = id
    ? await supabase.from('forms').update(v).eq('id', id).eq('organization_id', ctx.org.id).select('id').single()
    : await supabase.from('forms').insert({ ...v, organization_id: ctx.org.id, season_id: season?.id ?? null }).select('id').single();
  if (res.error || !res.data) return fail(dbError(res.error));
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return { ok: true, data: { id: res.data.id } };
}

export async function deleteFormDef(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'forms');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('forms').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}

export async function reviewResponse(slug: string, responseId: string, decision: 'approved' | 'changes', note: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'forms');
  const n = z.string().trim().max(1000).safeParse(note);
  if (!ctx || !uuid.safeParse(responseId).success || !['approved', 'changes'].includes(decision) || !n.success) return fail('not_allowed');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('form_responses')
    .update({ status: decision, reviewed_by: await currentUserId(), reviewed_at: new Date().toISOString(), review_note: n.data || null })
    .eq('id', responseId)
    .eq('organization_id', ctx.org.id)
    .select('person_id, forms(title)')
    .single();
  if (error || !data) return fail(dbError(error));
  if (decision === 'changes') {
    const en = getMessages('en').staff;
    const fr = getMessages('fr').staff;
    await supabase.rpc('notify_people', {
      org: ctx.org.id,
      people: [data.person_id],
      category: 'forms',
      title: en.changesTitle.replace('{form}', data.forms?.title ?? ''),
      title_fr: fr.changesTitle.replace('{form}', data.forms?.title ?? ''),
      body: n.data || undefined,
      link: `/c/${slug}/forms-fees`,
    });
  }
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}

export async function staffResendGuardian(slug: string, responseId: string): Promise<ActionResult<{ sent: number }>> {
  const ctx = await staffContext(slug, 'forms');
  if (!ctx || !uuid.safeParse(responseId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_guardian_signatures', { response: responseId });
  if (error) return fail(dbError(error));
  if (data === -1) return fail('too_soon');
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return { ok: true, data: { sent: data ?? 0 } };
}

// ---- Fees ----

const feeSchema = z.object({
  name: z.string().trim().min(1, 'required').max(160),
  description: z.string().trim().max(2000).transform((v) => v || null),
  amount: z.number().int().min(0).max(10_000_000),
  due_on: z.union([z.literal(''), z.iso.date()]).transform((v) => v || null),
  instalments: z.number().int().min(1).max(10),
  assign: z.enum(['all', 'sections', 'none']),
  section_ids: z.array(uuid).max(20),
  family_discount_percent: z.number().int().min(0).max(100),
});
export type FeeInput = z.input<typeof feeSchema>;

/**
 * Creates a fee and assigns it. With instalments, the amount is split into
 * monthly parts ending on the due date. A family discount applies to the second
 * and later choristers who share a guardian.
 */
export async function createFee(slug: string, input: FeeInput): Promise<ActionResult<{ id: string; assigned: number }>> {
  const ctx = await staffContext(slug, 'fees');
  const parsed = feeSchema.safeParse(input);
  if (!ctx || !parsed.success) return fail(parsed.success ? 'not_allowed' : (parsed.error.issues[0]?.message ?? 'invalid'));
  const v = parsed.data;
  const supabase = await createClient();
  const { data: season } = await supabase.from('seasons').select('id').eq('organization_id', ctx.org.id).eq('is_current', true).maybeSingle();
  const { data: fee, error } = await supabase
    .from('fees')
    .insert({
      organization_id: ctx.org.id,
      season_id: season?.id ?? null,
      name: v.name,
      description: v.description,
      amount_cents: v.amount,
      due_on: v.due_on,
      allows_instalments: v.instalments > 1,
    })
    .select('id')
    .single();
  if (error || !fee) return fail(dbError(error));
  if (v.assign === 'none') {
    revalidatePath(`/c/${slug}/forms-fees`, 'layout');
    return { ok: true, data: { id: fee.id, assigned: 0 } };
  }

  const { data: choristers } = await supabase.from('choristers').select('person_id, section_id').eq('organization_id', ctx.org.id).eq('status', 'active');
  const people = (choristers ?? []).filter((c) => v.assign === 'all' || (c.section_id && v.section_ids.includes(c.section_id))).map((c) => c.person_id);
  if (!people.length) return { ok: true, data: { id: fee.id, assigned: 0 } };
  const { data: assignments, error: aErr } = await supabase
    .from('fee_assignments')
    .insert(people.map((person_id) => ({ organization_id: ctx.org.id, fee_id: fee.id, person_id, amount_cents: v.amount })))
    .select('id, person_id');
  if (aErr || !assignments) return fail(dbError(aErr));

  if (v.instalments > 1 && v.due_on && v.amount > 0) {
    const part = Math.floor(v.amount / v.instalments);
    const rows = assignments.flatMap((a) =>
      Array.from({ length: v.instalments }, (_, i) => ({
        organization_id: ctx.org.id,
        assignment_id: a.id,
        // Monthly, the last one on the due date.
        due_on: addDays(v.due_on!, -30 * (v.instalments - 1 - i)),
        amount_cents: i === v.instalments - 1 ? v.amount - part * (v.instalments - 1) : part,
      })),
    );
    await supabase.from('instalments').insert(rows);
  }

  if (v.family_discount_percent > 0 && v.amount > 0) {
    const { data: links } = await supabase.from('guardian_links').select('guardian_id, chorister_id').eq('organization_id', ctx.org.id).in('chorister_id', people);
    const byGuardian = new Map<string, string[]>();
    for (const l of links ?? []) byGuardian.set(l.guardian_id, [...(byGuardian.get(l.guardian_id) ?? []), l.chorister_id]);
    const discounted = new Set<string>();
    for (const kids of byGuardian.values()) [...kids].sort().slice(1).forEach((k) => discounted.add(k));
    const me = await currentUserId();
    const rows = assignments
      .filter((a) => discounted.has(a.person_id))
      .map((a) => ({
        organization_id: ctx.org.id,
        assignment_id: a.id,
        kind: 'family_discount' as const,
        amount_cents: Math.round((v.amount * v.family_discount_percent) / 100),
        reason: `${v.family_discount_percent}%`,
        status: 'approved' as const,
        requested_by: me,
        decided_by: me,
        decided_at: new Date().toISOString(),
      }))
      .filter((r) => r.amount_cents > 0);
    if (rows.length) await supabase.from('fee_adjustments').insert(rows);
  }
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return { ok: true, data: { id: fee.id, assigned: assignments.length } };
}

export async function deleteFee(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'fees');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  // Payments keep their record (their link to the fee is cleared), as tax rules require.
  const { error } = await supabase.from('fees').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}

const paymentSchema = z.object({
  amount: z.number().int().min(1).max(10_000_000),
  method: z.enum(['cash', 'cheque', 'etransfer']),
  note: z.string().trim().max(500).transform((v) => v || null),
  received_on: z.iso.date(),
});

export async function recordPayment(slug: string, assignmentId: string, input: z.input<typeof paymentSchema>): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'fees');
  const parsed = paymentSchema.safeParse(input);
  if (!ctx || !uuid.safeParse(assignmentId).success || !parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { data: a } = await supabase.from('fee_assignments').select('person_id').eq('id', assignmentId).eq('organization_id', ctx.org.id).maybeSingle();
  if (!a) return fail('not_allowed');
  const receipt = `CB-${todayLocal().replace(/-/g, '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const { error } = await supabase.from('payments').insert({
    organization_id: ctx.org.id,
    assignment_id: assignmentId,
    person_id: a.person_id,
    amount_cents: parsed.data.amount,
    method: parsed.data.method,
    status: 'succeeded',
    note: parsed.data.note,
    receipt_number: receipt,
    received_at: zonedInstant(parsed.data.received_on, '12:00').toISOString(),
    recorded_by: await currentUserId(),
  });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}

export async function addAdjustment(
  slug: string,
  assignmentId: string,
  input: { kind: 'waiver' | 'financial_aid' | 'family_discount' | 'other'; amount: number; reason: string },
): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'fees');
  const parsed = z
    .object({ kind: z.enum(['waiver', 'financial_aid', 'family_discount', 'other']), amount: z.number().int().min(1).max(10_000_000), reason: z.string().trim().max(2000) })
    .safeParse(input);
  if (!ctx || !uuid.safeParse(assignmentId).success || !parsed.success) return fail('invalid');
  const me = await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase.from('fee_adjustments').insert({
    organization_id: ctx.org.id,
    assignment_id: assignmentId,
    kind: parsed.data.kind,
    amount_cents: parsed.data.amount,
    reason: parsed.data.reason || null,
    status: 'approved',
    requested_by: me,
    decided_by: me,
    decided_at: new Date().toISOString(),
  });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}

export async function decideAdjustment(slug: string, id: string, decision: 'approved' | 'declined'): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'fees');
  if (!ctx || !uuid.safeParse(id).success || !['approved', 'declined'].includes(decision)) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase
    .from('fee_adjustments')
    .update({ status: decision, decided_by: await currentUserId(), decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}

/**
 * Refunds some or all of a payment. Card payments are refunded through Stripe
 * (test mode only); cash, cheque and e-transfer refunds are recorded.
 */
export async function refundPayment(slug: string, paymentId: string, amount: number): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'fees');
  if (!ctx || !uuid.safeParse(paymentId).success || !Number.isInteger(amount) || amount < 1) return fail('invalid');
  const supabase = await createClient();
  const { data: p } = await supabase.from('payments').select('*').eq('id', paymentId).eq('organization_id', ctx.org.id).maybeSingle();
  if (!p || amount > p.amount_cents - p.refunded_cents) return fail('invalid');
  const refunded = p.refunded_cents + amount;
  const status = refunded >= p.amount_cents ? 'refunded' : 'partially_refunded';

  if (p.method === 'card') {
    const stripe = getStripe();
    if (!stripe || !p.stripe_payment_intent_id) return fail('payments_off');
    try {
      await stripe.refunds.create({ payment_intent: p.stripe_payment_intent_id, amount });
    } catch {
      return fail('failed');
    }
    // Card payment rows are written by the server only (fee staff already checked above).
    const { error } = await createAdminClient().from('payments').update({ refunded_cents: refunded, status }).eq('id', paymentId);
    if (error) return fail('failed');
  } else {
    const { error } = await supabase.from('payments').update({ refunded_cents: refunded, status }).eq('id', paymentId);
    if (error) return fail(dbError(error));
  }
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return done;
}
