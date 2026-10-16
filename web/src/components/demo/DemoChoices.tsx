'use client';

import type { Messages } from '@choirbook/shared/i18n';
import { AlertCard, Button, Icon, type IconName } from '@choirbook/ui';
import { useActionState } from 'react';
import { startDemo, type DemoState } from '@/app/actions/demo';

const idle: DemoState = {};

function Choice({
  role,
  icon,
  title,
  body,
  t,
  action,
  pending,
}: {
  role: string;
  icon: IconName;
  title: string;
  body: string;
  t: Messages;
  action: (fd: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="demo-choice">
      <input type="hidden" name="role" value={role} />
      <span className="demo-choice__icon" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <h2 className="demo-choice__title">{title}</h2>
      <p className="demo-choice__body">{body}</p>
      <Button type="submit" size="lg" fullWidth iconEnd="arrow-right" loading={pending}>
        {pending ? t.demo.starting : t.demo.start}
      </Button>
    </form>
  );
}

export function DemoChoices({ t, unavailable }: { t: Messages; unavailable?: boolean }) {
  const [state, action, pending] = useActionState(startDemo, idle);
  return (
    <div className="stack">
      {state.error || unavailable ? <AlertCard tone="warning">{t.demo.unavailable}</AlertCard> : null}
      <div className="demo-choices">
        <Choice role="chorister" icon="music" title={t.demo.choristerTitle} body={t.demo.choristerBody} t={t} action={action} pending={pending} />
        <Choice role="administrator" icon="clipboard-list" title={t.demo.staffTitle} body={t.demo.staffBody} t={t} action={action} pending={pending} />
      </div>
      <p className="muted center">{t.demo.noSignup}</p>
    </div>
  );
}
