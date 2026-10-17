import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const ip = z.union([z.ipv4(), z.ipv6()]);

/** The visitor's IP address as Vercel reports it, or null when it is missing or malformed. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip')?.trim();
  return forwarded && ip.safeParse(forwarded).success ? forwarded : null;
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get('user-agent')?.slice(0, 400) ?? null;
}

/** A one-way fingerprint for keys that would otherwise hold personal data (an email address). */
export const fingerprint = (value: string) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32);

/**
 * Counts one hit against each bucket and says whether all of them are still
 * within their limit. Fails open (allows) if the database cannot be reached, so
 * an outage never locks everyone out; Supabase Auth has its own limits behind this.
 */
export async function withinLimits(buckets: { key: string; max: number; windowSeconds: number }[]): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const results = await Promise.all(
      buckets.map((b) => admin.rpc('rate_limit_hit', { bucket: b.key, max_hits: b.max, window_seconds: b.windowSeconds })),
    );
    return results.every((r) => r.error || r.data !== false);
  } catch (err) {
    console.error('Rate limit check failed', err);
    return true;
  }
}

/** Sign-in, magic link and password reset: per address and per network. */
export async function signInAllowed(email: string): Promise<boolean> {
  const addr = await clientIp();
  return withinLimits([
    { key: `signin:email:${fingerprint(email)}`, max: 8, windowSeconds: 15 * 60 },
    ...(addr ? [{ key: `signin:ip:${addr}`, max: 30, windowSeconds: 15 * 60 }] : []),
  ]);
}
