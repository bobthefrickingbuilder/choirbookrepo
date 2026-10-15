'use client';

import { IconButton, TextInput, type TextInputProps } from '@choirbook/ui';
import { useState } from 'react';

/** A password input with a show/hide button. */
export function PasswordField({
  showLabel,
  hideLabel,
  ...props
}: Omit<TextInputProps, 'type' | 'trailing'> & { showLabel: string; hideLabel: string }) {
  const [shown, setShown] = useState(false);
  return (
    <TextInput
      {...props}
      type={shown ? 'text' : 'password'}
      iconStart="lock"
      trailing={
        <IconButton
          icon={shown ? 'eye-off' : 'eye'}
          label={shown ? hideLabel : showLabel}
          size="sm"
          variant="ghost"
          onClick={() => setShown((s) => !s)}
        />
      }
    />
  );
}
