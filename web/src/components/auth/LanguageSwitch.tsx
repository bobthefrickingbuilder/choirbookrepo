'use client';

import type { Lang } from '@choirbook/shared/i18n';
import { SegmentedControl } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLanguage } from '@/app/actions/auth';

export function LanguageSwitch({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <SegmentedControl<Lang>
      fullWidth
      label={label}
      value={lang}
      options={[
        { value: 'en', label: <span lang="en">English</span> },
        { value: 'fr', label: <span lang="fr">Français</span> },
      ]}
      onChange={(next) =>
        startTransition(async () => {
          await setLanguage(next);
          router.refresh();
        })
      }
    />
  );
}
