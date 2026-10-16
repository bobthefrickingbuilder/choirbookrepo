// The shared demo accounts (created by public.reset_demo in the database).
export const DEMO_SLUG = 'demo';

export const DEMO_ROLES = ['chorister', 'administrator', 'section_leader', 'treasurer'] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; userId: string }> = {
  chorister: { email: 'demo.chorister@example.com', userId: 'd0000000-0000-4000-8000-0000000000a1' },
  administrator: { email: 'demo.admin@example.com', userId: 'd0000000-0000-4000-8000-0000000000a2' },
  section_leader: { email: 'demo.sectionleader@example.com', userId: 'd0000000-0000-4000-8000-0000000000a3' },
  treasurer: { email: 'demo.treasurer@example.com', userId: 'd0000000-0000-4000-8000-0000000000a4' },
};

export const isDemoRole = (v: unknown): v is DemoRole => typeof v === 'string' && (DEMO_ROLES as readonly string[]).includes(v);

/** Which demo role an account is, or null for a real account. */
export function demoRoleFor(userId: string | null | undefined): DemoRole | null {
  if (!userId) return null;
  return DEMO_ROLES.find((r) => DEMO_ACCOUNTS[r].userId === userId) ?? null;
}
