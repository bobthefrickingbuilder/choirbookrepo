'use server';

import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { publicEnv } from '@/lib/env';
import { getChoirContext } from '@/lib/session';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Taking attendance (staff with "attendance" edit), the door QR code, and a
// chorister checking themself in by scanning it.

const statusSchema = z.enum(['present', 'late', 'absent', 'excused', 'unmarked']);
export type MarkStatus = z.infer<typeof statusSchema>;

export async function markAttendance(slug: string, eventId: string, personIds: string[], status: MarkStatus): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'attendance');
  const ids = z.array(uuid).min(1).max(500).safeParse(personIds);
  const st = statusSchema.safeParse(status);
  if (!ctx || !uuid.safeParse(eventId).success || !ids.success || !st.success) return fail('not_allowed');
  const supabase = await createClient();
  if (st.data === 'unmarked') {
    const { error } = await supabase.from('attendance').delete().eq('event_id', eventId).in('person_id', ids.data);
    if (error) return fail(dbError(error));
  } else {
    const me = await currentUserId();
    const { error } = await supabase.from('attendance').upsert(
      ids.data.map((person_id) => ({
        organization_id: ctx.org.id,
        event_id: eventId,
        person_id,
        status: st.data as Exclude<MarkStatus, 'unmarked'>,
        source: 'staff',
        marked_by: me,
        marked_at: new Date().toISOString(),
      })),
      { onConflict: 'event_id,person_id' },
    );
    if (error) return fail(dbError(error));
  }
  revalidatePath(`/c/${slug}/attendance`);
  return done;
}

export interface DoorCode {
  svg: string;
  code: string;
  url: string;
  secondsLeft: number;
  checkedIn: number;
}

/** The QR code to show at the door right now (it changes every 30 seconds). */
export async function getDoorCode(slug: string, eventId: string): Promise<ActionResult<DoorCode>> {
  const ctx = await staffContext(slug, 'attendance');
  if (!ctx || !uuid.safeParse(eventId).success) return fail('not_allowed');
  const supabase = await createClient();
  const [{ data, error }, { count }] = await Promise.all([
    supabase.rpc('checkin_code', { event: eventId }).single(),
    supabase.from('attendance').select('person_id', { count: 'exact', head: true }).eq('event_id', eventId).in('status', ['present', 'late']),
  ]);
  if (error || !data) return fail(dbError(error));
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const url = `${site}/c/${slug}/check-in/${eventId}?k=${data.code}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return { ok: true, data: { svg, code: data.code, url: `${site.replace(/^https?:\/\//, '')}/c/${slug}/check-in/${eventId}`, secondsLeft: data.seconds_left, checkedIn: count ?? 0 } };
}

export type CheckInOutcome = 'present' | 'late' | 'already' | 'invalid' | 'closed' | 'not_called';

/** A chorister checks themself in with the code from the door screen. */
export async function checkIn(slug: string, eventId: string, code: string): Promise<CheckInOutcome> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !uuid.safeParse(eventId).success || !/^[0-9A-Fa-f]{8}$/.test(code)) return 'invalid';
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('qr_check_in', { event: eventId, code });
  if (error) return 'invalid';
  revalidatePath(`/c/${slug}`, 'layout');
  return data as CheckInOutcome;
}
