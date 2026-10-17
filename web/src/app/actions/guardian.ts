'use server';

import { z } from 'zod';
import { clientIp, userAgent, withinLimits } from '@/lib/security';
import { createAdminClient } from '@/lib/supabase/admin';

// A guardian signing a minor's form from the emailed link. No account: the
// single-use token is the proof. Runs on the server so the recorded IP address
// and browser are the real ones.

export type GuardianSignResult = { ok: true; name: string } | { ok: false; error: 'name' | 'agree' | 'too_many' | 'used' | 'expired' | 'revoked' | 'unknown' | 'failed' };

const tokenSchema = z.string().regex(/^[0-9a-f]{32,128}$/);

export async function signAsGuardian(token: string, signedName: string, agreed: boolean): Promise<GuardianSignResult> {
  if (!tokenSchema.safeParse(token).success) return { ok: false, error: 'unknown' };
  const name = signedName.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 160) return { ok: false, error: 'name' };
  if (!agreed) return { ok: false, error: 'agree' };
  const ip = await clientIp();
  const allowed = await withinLimits([
    { key: `guardian:token:${token.slice(0, 16)}`, max: 10, windowSeconds: 15 * 60 },
    ...(ip ? [{ key: `guardian:ip:${ip}`, max: 30, windowSeconds: 15 * 60 }] : []),
  ]);
  if (!allowed) return { ok: false, error: 'too_many' };

  let result: { data: string | null; error: unknown };
  try {
    result = await createAdminClient().rpc('guardian_link_sign', {
      token,
      signed_name: name,
      ip: ip ?? undefined,
      user_agent: (await userAgent()) ?? undefined,
    });
  } catch (err) {
    result = { data: null, error: err };
  }
  const { data, error } = result;
  if (error) {
    console.error('Guardian signature failed', error);
    return { ok: false, error: 'failed' };
  }
  if (data === 'signed') return { ok: true, name };
  if (data === 'name') return { ok: false, error: 'name' };
  return { ok: false, error: data === 'used' || data === 'expired' || data === 'revoked' ? data : 'unknown' };
}
