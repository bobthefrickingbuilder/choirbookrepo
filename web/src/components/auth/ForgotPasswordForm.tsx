'use client';

import type { Messages } from '@choirbook/shared/i18n';
import { AlertCard, Button, Icon, TextInput } from '@choirbook/ui';
import { useActionState } from 'react';
import { requestPasswordReset, type AuthFormState } from '@/app/actions/auth';

const idle: AuthFormState = { status: 'idle' };

export function ForgotPasswordForm({ t, email }: { t: Messages; email?: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, idle);

  if (state.status === 'sent') {
    return (
      <div className="stack" role="status">
        <span className="icon-disc" aria-hidden="true">
          <Icon name="mail" size={22} />
        </span>
        <div className="public__heading">
          <h1>{t.auth.resetTitle}</h1>
          <p>{state.message}</p>
        </div>
        <Button variant="secondary" iconStart="arrow-left" href="/sign-in">
          {t.auth.backToSignIn}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="stack" noValidate>
      <div className="public__heading">
        <h1>{t.auth.resetTitle}</h1>
        <p>{t.auth.resetIntro}</p>
      </div>
      {state.message ? <AlertCard tone="error">{state.message}</AlertCard> : null}
      <TextInput
        label={t.auth.email}
        name="email"
        type="email"
        iconStart="mail"
        autoComplete="email"
        inputMode="email"
        required
        size="lg"
        defaultValue={state.email ?? email}
        error={state.fieldErrors?.email}
      />
      <Button type="submit" size="lg" fullWidth iconStart="send" loading={pending}>
        {t.auth.sendResetLink}
      </Button>
      <Button variant="ghost" iconStart="arrow-left" href="/sign-in">
        {t.auth.backToSignIn}
      </Button>
    </form>
  );
}
