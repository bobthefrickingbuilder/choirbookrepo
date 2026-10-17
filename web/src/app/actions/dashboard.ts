'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { allowedWidgets, DEMO_LAYOUT_COOKIE, WIDGETS } from '@/lib/data/dashboard';
import { getChoirContext, getUser } from '@/lib/session';
import { dbError, done, fail, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Each staff member's dashboard layout. The demo shares one staff account
// between visitors, so there the layout lives in a cookie on the visitor's
// browser instead of the database.

const widget = z.enum(WIDGETS);
const input = z.object({ order: z.array(widget).max(20), hidden: z.array(widget).max(20) });

export async function saveLayout(slug: string, layout: { order: string[]; hidden: string[] }): Promise<ActionResult> {
  const [ctx, user] = await Promise.all([getChoirContext(slug), getUser()]);
  const parsed = input.safeParse(layout);
  if (!ctx?.isStaff || !ctx.can('dashboard') || !user) return fail('not_allowed');
  if (!parsed.success) return fail('invalid');
  const allowed = allowedWidgets(ctx);
  const order = [...new Set(parsed.data.order)].filter((w) => allowed.includes(w));
  const hidden = [...new Set(parsed.data.hidden)].filter((w) => allowed.includes(w));
  if (ctx.org.is_demo) {
    (await cookies()).set(DEMO_LAYOUT_COOKIE, JSON.stringify({ order, hidden }), { path: '/', sameSite: 'lax', httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30 });
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from('dashboard_layouts').upsert({ organization_id: ctx.org.id, user_id: user.id, widgets: order, hidden });
    if (error) return fail(dbError(error));
  }
  revalidatePath(`/c/${slug}`);
  return done;
}

export async function resetLayout(slug: string): Promise<ActionResult> {
  const [ctx, user] = await Promise.all([getChoirContext(slug), getUser()]);
  if (!ctx?.isStaff || !user) return fail('not_allowed');
  if (ctx.org.is_demo) (await cookies()).delete(DEMO_LAYOUT_COOKIE);
  else {
    const supabase = await createClient();
    const { error } = await supabase.from('dashboard_layouts').delete().eq('organization_id', ctx.org.id).eq('user_id', user.id);
    if (error) return fail(dbError(error));
  }
  revalidatePath(`/c/${slug}`);
  return done;
}
