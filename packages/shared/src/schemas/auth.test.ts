import { describe, expect, it } from 'vitest';
import { emailOnlySchema, newPasswordSchema, safeNextPath, signInSchema } from './auth';

describe('signInSchema', () => {
  it('normalises the email', () => {
    const r = signInSchema.safeParse({ email: '  Ella.Martin@Example.COM ', password: 'x' });
    expect(r.success && r.data.email).toBe('ella.martin@example.com');
  });
  it('reports an i18n key for a bad email', () => {
    const r = emailOnlySchema.safeParse({ email: 'not-an-email' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('validation.emailInvalid');
  });
});

describe('newPasswordSchema', () => {
  it('rejects short passwords', () => {
    const r = newPasswordSchema.safeParse({ password: 'short', confirm: 'short' });
    expect(r.error?.issues[0]?.message).toBe('validation.passwordShort');
  });
  it('rejects mismatched confirmation on the confirm field', () => {
    const r = newPasswordSchema.safeParse({ password: 'a long enough one', confirm: 'something else' });
    expect(r.error?.issues[0]?.path).toEqual(['confirm']);
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/calendar', '/calendar'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    [undefined, '/'],
  ])('%s → %s', (input, out) => {
    expect(safeNextPath(input)).toBe(out);
  });
});
