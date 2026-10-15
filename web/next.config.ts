import type { NextConfig } from 'next';

// Baseline security headers for every page. A full Content-Security-Policy
// comes with the Phase 6 security pass.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Camera is needed later for QR check-in, on our own pages only.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(self)' },
  // Pilot: keep the site out of search engines.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  // Nearly every page is personal to the signed-in member, so pages render per
  // request (the standard model) rather than with Cache Components.
  transpilePackages: ['@choirbook/ui', '@choirbook/shared'],
  typedRoutes: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
