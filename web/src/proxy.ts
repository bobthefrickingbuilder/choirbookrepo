import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Runs before every page. It refreshes the Supabase session (rotating the
// cookie when the access token is near expiry) and sends signed-out visitors
// on member pages to the sign-in page.

// Pages anyone may open without signing in (each also covers its sub-pages).
const PUBLIC_PATHS = [
  '/sign-in', '/forgot-password', '/auth', '/demo', '/privacy', '/terms', '/setup', '/api/cron', '/api/calendar', '/buy',
  // Guardians have no accounts; deletion links may be opened on another device.
  '/guardian', '/confirm-deletion', '/account-deleted',
];

/**
 * Content-Security-Policy with a fresh nonce per request: only scripts Next.js
 * marks with the nonce run, so injected markup cannot run code.
 */
function contentSecurityPolicy(nonce: string, supabaseUrl: string | undefined) {
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : '';
  const realtime = supabase.replace(/^http/, 'ws');
  const dev = process.env.NODE_ENV !== 'production';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`,
    `media-src 'self' blob: ${supabase}`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${realtime}${dev ? ' ws:' : ''}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL);
  // Next.js reads the nonce from the request's CSP header and adds it to its own scripts.
  const forward = () => {
    const h = new Headers(request.headers);
    h.set('x-nonce', nonce);
    h.set('content-security-policy', csp);
    return h;
  };
  const withCsp = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!url || !key) {
    // Not configured yet: show the setup page instead of failing.
    if (isPublic) return withCsp(NextResponse.next({ request: { headers: forward() } }));
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  let response = NextResponse.next({ request: { headers: forward() } });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: forward() } });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it must run first
  // so an expired session is refreshed before anything else reads it.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = '/sign-in';
    to.search = path === '/' ? '' : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(to);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return withCsp(response);
}

export const config = {
  matcher: [
    // Everything except static files and images.
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|pdf|mp3|m4a)$).*)',
  ],
};
