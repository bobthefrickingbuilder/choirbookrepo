'use client';

import type { Messages } from '@choirbook/shared/i18n';
import { AlertCard, Button } from '@choirbook/ui';
import { useActionState } from 'react';
import { chooseNewPassword, type AuthFormState } from '@/app/actions/auth';
import { PasswordField } from './PasswordField';

const idle: AuthFormState = { status: 'idle' };

/** Used after a password-reset link and after accepting an invitation. */
export function NewPasswordForm({
  t,
  title,
  intro,
  submitLabel,
  email,
}: {
  t: Messages;
  title: string;
  intro: string;
  submitLabel: string;
  email?: string | null;
}) {
  const [state, action, pending] = useActionState(chooseNewPassword, idle);
  return (
    <form action={action} className="stack" noValidate>
      <div className="public__heading">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {state.message ? <AlertCard tone="error">{state.message}</AlertCard> : null}
      {/* Lets password managers save the new password against the right account. */}
      {email ? <input type="email" name="username" autoComplete="username" value={email} readOnly hidden /> : null}
      <PasswordField
        label={t.auth.newPassword}
        name="password"
        autoComplete="new-password"
        hint={t.auth.newPasswordHint}
        size="lg"
        required
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        error={state.fieldErrors?.password}
      />
      <PasswordField
        label={t.auth.confirmPassword}
        name="confirm"
        autoComplete="new-password"
        size="lg"
        required
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        error={state.fieldErrors?.confirm}
      />
      <Button type="submit" size="lg" fullWidth iconStart="check" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
