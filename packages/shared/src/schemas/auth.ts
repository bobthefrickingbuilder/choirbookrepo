import { z } from 'zod';

// Error messages are i18n keys (see i18n/en.ts → validation), so the same
// schema works on the server, in the browser and later in the native apps.

export const MIN_PASSWORD_LENGTH = 10;

export const emailSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'validation.required' })
  .pipe(z.email({ error: 'validation.emailInvalid' }));

export const passwordSchema = z
  .string({ error: 'validation.required' })
  .min(MIN_PASSWORD_LENGTH, { error: 'validation.passwordShort' })
  .max(200);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'validation.required' }).min(1, { error: 'validation.required' }),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: 'validation.passwordMismatch', path: ['confirm'] });

/** Only same-site relative paths are allowed as post-sign-in destinations (blocks open redirects). */
export function safeNextPath(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export type SignInInput = z.infer<typeof signInSchema>;
