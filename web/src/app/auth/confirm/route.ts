import { safeNextPath } from '@choirbook/shared/schemas';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

// Every emailed link (sign-in link, invitation, password reset) lands here.
// It turns the one-time token into a session, then sends the member on.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');
  let next = safeNextPath(params.get('next'));

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
    if (type === 'invite') next = '/welcome';
    if (type === 'recovery') next = '/reset-password';
  } else if (code) {
    // Same-browser links using the PKCE code flow.
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  return NextResponse.redirect(new URL(ok ? next : '/sign-in?error=link', request.url));
}
