import 'server-only';
import { createAdminClient } from './supabase/admin';
import { getStripe } from './stripe';

/**
 * After Stripe sends the payer back, confirm with Stripe that the payment went
 * through and record it (once: the payment intent id is unique). Returns the
 * amount recorded, 'pending' if Stripe has not confirmed yet, or null.
 */
export async function recordCheckout(sessionId: string, personId: string): Promise<number | 'pending' | null> {
  const stripe = getStripe();
  if (!stripe || !/^cs_test_[A-Za-z0-9]+$/.test(sessionId) || !process.env.SUPABASE_SECRET_KEY) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const meta = session.metadata ?? {};
  // Only the member who paid can confirm their own payment.
  if (meta.person_id !== personId || !meta.assignment_id || !meta.organization_id) return null;
  if (session.payment_status !== 'paid') return 'pending';
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!intent || !session.amount_total) return null;

  const admin = createAdminClient();
  const { error } = await admin.from('payments').upsert(
    {
      organization_id: meta.organization_id,
      assignment_id: meta.assignment_id,
      person_id: meta.person_id,
      payer_name: session.customer_details?.name ?? null,
      amount_cents: session.amount_total,
      method: 'card',
      status: 'succeeded',
      stripe_payment_intent_id: intent,
      receipt_number: `CB-${intent.slice(-10).toUpperCase()}`,
      received_at: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
    },
    { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true },
  );
  return error ? null : session.amount_total;
}
