'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { publicEnv } from '@/lib/env';
import { cleanAnswers, parseFields, type Answers } from '@/lib/formFields';
import { getChoirContext } from '@/lib/session';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './member';

export async function saveForm(
  slug: string,
  formId: string,
  answers: Answers,
  mode: 'draft' | 'submit',
  signedName?: string,
): Promise<ActionResult & { guardians?: number }> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(formId).success) return { ok: false, error: 'not_allowed' };
  const supabase = await createClient();
  const { data: form } = await supabase
    .from('forms')
    .select('id, fields, requires_signature, guardian_signature_required, status')
    .eq('id', formId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();
  if (!form || form.status !== 'open') return { ok: false, error: 'not_allowed' };

  const { clean, missing } = cleanAnswers(parseFields(form.fields), answers);
  const signature = signedName?.trim().slice(0, 160) ?? '';
  if (mode === 'submit') {
    if (missing.length) return { ok: false, error: 'missing' };
    if (form.requires_signature && signature.length < 3) return { ok: false, error: 'signature' };
  }
  const forwarded = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded && z.union([z.ipv4(), z.ipv6()]).safeParse(forwarded).success ? forwarded : null;
  const now = new Date().toISOString();

  const { data: resp, error } = await supabase
    .from('form_responses')
    .upsert(
      {
        organization_id: ctx.org.id,
        form_id: form.id,
        person_id: ctx.personId,
        answers: clean,
        status: mode === 'submit' ? 'submitted' : 'in_progress',
        submitted_at: mode === 'submit' ? now : null,
        signed_name: mode === 'submit' && form.requires_signature ? signature : null,
        signed_at: mode === 'submit' && form.requires_signature ? now : null,
        signed_ip: mode === 'submit' && form.requires_signature ? ip : null,
      },
      { onConflict: 'form_id,person_id' },
    )
    .select('id')
    .single();
  if (error || !resp) return { ok: false, error: error?.code === '42501' ? 'locked' : 'failed' };

  let guardians: number | undefined;
  if (mode === 'submit' && form.guardian_signature_required) {
    const { data } = await supabase.rpc('request_guardian_signatures', { response: resp.id });
    guardians = data ?? 0;
  }
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true, guardians };
}

export async function resendGuardianLink(slug: string, responseId: string): Promise<ActionResult & { sent?: number }> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(responseId).success) return { ok: false, error: 'not_allowed' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_guardian_signatures', { response: responseId });
  if (error) return { ok: false, error: 'failed' };
  if (data === -1) return { ok: false, error: 'too_soon' };
  revalidatePath(`/c/${slug}/forms-fees`, 'layout');
  return { ok: true, sent: data ?? 0 };
}

/** Starts a Stripe Checkout (test mode) for some or all of what is left on a fee. */
export async function startCardPayment(slug: string, assignmentId: string, amountCents: number): Promise<ActionResult & { url?: string }> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(assignmentId).success || !Number.isInteger(amountCents) || amountCents < 100) {
    return { ok: false, error: 'not_allowed' };
  }
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: 'payments_off' };
  const supabase = await createClient();
  const { data: bal } = await supabase.from('fee_balances').select('*').eq('assignment_id', assignmentId).eq('person_id', ctx.personId).maybeSingle();
  if (!bal) return { ok: false, error: 'not_allowed' };
  const balance = (bal.amount_cents ?? 0) - (bal.paid_cents ?? 0) - (bal.adjusted_cents ?? 0);
  if (amountCents > balance) return { ok: false, error: 'too_much' };

  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'cad',
    line_items: [
      {
        quantity: 1,
        price_data: { currency: 'cad', unit_amount: amountCents, product_data: { name: `${ctx.org.name}: ${bal.name}` } },
      },
    ],
    client_reference_id: ctx.personId,
    metadata: { organization_id: ctx.org.id, assignment_id: assignmentId, person_id: ctx.personId },
    payment_intent_data: { metadata: { organization_id: ctx.org.id, assignment_id: assignmentId, person_id: ctx.personId } },
    success_url: `${site}/c/${slug}/forms-fees?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/c/${slug}/forms-fees?cancelled=1`,
    locale: 'auto',
  });
  return session.url ? { ok: true, url: session.url } : { ok: false, error: 'failed' };
}

export async function requestAid(slug: string, assignmentId: string, amountCents: number, reason: string): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(assignmentId).success || !Number.isInteger(amountCents) || amountCents < 100) {
    return { ok: false, error: 'invalid' };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { error } = await supabase.from('fee_adjustments').insert({
    organization_id: ctx.org.id,
    assignment_id: assignmentId,
    kind: 'financial_aid',
    amount_cents: amountCents,
    reason: reason.trim().slice(0, 2000) || null,
    status: 'requested',
    requested_by: auth?.claims?.sub ?? null,
  });
  if (error) return { ok: false, error: 'failed' };
  revalidatePath(`/c/${slug}/forms-fees`);
  return { ok: true };
}
