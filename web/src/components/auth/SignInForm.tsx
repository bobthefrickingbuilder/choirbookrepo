'use client';

import type { Messages } from '@choirbook/shared/i18n';
import { AlertCard, Button, Icon, TextInput, TextLink } from '@choirbook/ui';
import { useActionState, useState } from 'react';
import { sendMagicLink, signInWithPassword, type AuthFormState } from '@/app/actions/auth';
import { PasswordField } from './PasswordField';

const idle: AuthFormState = { status: 'idle' };

export function SignInForm({ t, next, notice }: { t: Messages; next: string; notice?: string }) {
  const [pw, pwAction, pwPending] = useActionState(signInWithPassword, idle);
  const [ml, mlAction, mlPending] = useActionState(sendMagicLink, idle);
  const [email, setEmail] = useState('');

  if (ml.status === 'sent') {
    return (
      <div className="stack" role="status">
        <span className="icon-disc" aria-hidden="true">
          <Icon name="mail" size={22} />
        </span>
        <div className="public__heading">
          <h1>{t.auth.signInTitle}</h1>
          <p>{ml.message}</p>
        </div>
        <Button variant="secondary" iconStart="arrow-left" onClick={() => window.location.reload()}>
          {t.auth.backToSignIn}
        </Button>
      </div>
    );
  }

  const error = pw.status === 'error' ? pw : ml.status === 'error' ? ml : null;

  return (
    <form action={pwAction} className="stack" noValidate>
      <div className="public__heading">
        <h1>{t.auth.signInTitle}</h1>
        <p>{t.auth.signInIntro}</p>
      </div>
      {notice ? <AlertCard tone="info">{notice}</AlertCard> : null}
      {error?.message ? <AlertCard tone="error">{error.message}</AlertCard> : null}
      <input type="hidden" name="next" value={next} />
      <TextInput
        label={t.auth.email}
        name="email"
        type="email"
        iconStart="mail"
        autoComplete="email"
        inputMode="email"
        required
        size="lg"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error?.fieldErrors?.email}
      />
      <PasswordField
        label={t.auth.password}
        name="password"
        autoComplete="current-password"
        size="lg"
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        error={pw.fieldErrors?.password}
      />
      <div className="row-between">
        <span />
        <TextLink href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}>{t.auth.forgotPassword}</TextLink>
      </div>
      <Button type="submit" size="lg" fullWidth loading={pwPending} disabled={mlPending}>
        {pwPending ? t.auth.signingIn : t.auth.signIn}
      </Button>
      <div className="divider-text">{t.auth.orDivider}</div>
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        fullWidth
        iconStart="send"
        formAction={mlAction}
        formNoValidate
        loading={mlPending}
        disabled={pwPending}
      >
        {t.auth.sendMagicLink}
      </Button>
    </form>
  );
}
