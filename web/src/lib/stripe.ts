import 'server-only';
import Stripe from 'stripe';

/**
 * Stripe, in TEST MODE ONLY during the pilot. A live key is refused, so no real
 * money can move until Matthew deliberately changes this.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    console.error('Refusing a live Stripe key during the pilot.');
    return null;
  }
  return new Stripe(key);
}

export const paymentsEnabled = () => getStripe() !== null;
