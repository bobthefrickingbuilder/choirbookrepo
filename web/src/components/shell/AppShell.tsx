'use client';

import type { Lang } from '@choirbook/shared/i18n';
import {
  AppHeader,
  BottomNav,
  ChoirSwitcher,
  IconButton,
  MenuItem,
  PoweredBy,
  Sidebar,
  type ChoirOption,
  type Mode,
  type NavItem,
  type NavSection,
  type UserMenuUser,
  UserMenu,
} from '@choirbook/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { setLanguage, setTheme, signOut } from '@/app/actions/auth';

// The current light/dark mode lives on <html data-mode>, set before first paint.
const readMode = (): Mode => (document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light');
const subscribeToMode = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  return () => observer.disconnect();
};

export interface ShellStrings {
  mainNav: string;
  openMenu: string;
  switchChoir: string;
  notifications: string;
  skipToContent: string;
  signOutEverywhere: string;
  accountSettings: string;
}

export interface AppShellProps {
  lang: Lang;
  strings: ShellStrings;
  user: UserMenuUser;
  choirs: ChoirOption[];
  currentSlug: string;
  brandColor: string | null;
  sections: NavSection[];
  bottomItems: NavItem[];
  /** Members (not staff) get a bottom navigation bar on phones. */
  useBottomNav: boolean;
  homeHref: string;
  profileHref: string;
  notificationsHref: string;
  /** Optional strip above the header (the demo banner). */
  banner?: React.ReactNode;
  /** Optional floating layer (the guided tour). */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
  const { lang, strings, sections, bottomItems } = props;
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mode = useSyncExternalStore(subscribeToMode, readMode, () => 'light' as Mode);
  const [, startTransition] = useTransition();
  const mainRef = useRef<HTMLElement>(null);

  // Return to the top of the page after navigating.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const allItems = [...sections.flatMap((s) => s.items), ...bottomItems];
  // The most specific link that matches the current page is the active one.
  const activeId =
    allItems
      .filter((it) => it.href && (pathname === it.href || pathname.startsWith(`${it.href}/`)))
      .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0]?.id ?? '';

  const navigate = (id: string) => {
    const href = allItems.find((it) => it.id === id)?.href;
    setDrawerOpen(false);
    if (href) router.push(href as never);
  };

  const onMode = (next: Mode) => {
    const root = document.documentElement;
    root.dataset.theme = next;
    root.dataset.mode = next;
    startTransition(() => setTheme(next));
  };

  const onLang = (next: Lang) =>
    startTransition(async () => {
      await setLanguage(next);
      router.refresh();
    });

  const doSignOut = (everywhere: boolean) =>
    startTransition(async () => {
      const fd = new FormData();
      if (everywhere) fd.set('scope', 'global');
      await signOut(fd);
    });

  const sidebar = (
    <Sidebar
      sections={sections}
      activeId={activeId}
      onNavigate={navigate}
      footer={<PoweredBy lang={lang} />}
      label={strings.mainNav}
    />
  );

  return (
    <div
      className={'shell' + (props.useBottomNav ? ' shell--bottomnav' : '')}
      style={props.brandColor ? ({ '--choir-brand': props.brandColor } as React.CSSProperties) : undefined}
    >
      <a className="skip-link" href="#main">
        {strings.skipToContent}
      </a>
      {props.banner}
      <AppHeader
        start={
          <>
            <IconButton
              className="shell__menu-btn"
              icon="menu"
              label={strings.openMenu}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((o) => !o)}
            />
            <ChoirSwitcher
              choirs={props.choirs}
              currentId={props.currentSlug}
              label={strings.switchChoir}
              onChange={(slug) => {
                setDrawerOpen(false);
                router.push(`/c/${slug}` as never);
              }}
            />
          </>
        }
        actions={
          <IconButton icon="bell" label={strings.notifications} onClick={() => router.push(props.notificationsHref as never)} />
        }
        end={
          <UserMenu
            user={props.user}
            lang={lang}
            onLangChange={onLang}
            mode={mode}
            onModeChange={onMode}
            onSignOut={() => doSignOut(false)}
            onNavigate={(target) => router.push((target === 'profile' ? props.profileHref : '/account') as never)}
          >
            <MenuItem icon="settings" onClick={() => router.push('/account')}>
              {strings.accountSettings}
            </MenuItem>
            <MenuItem icon="log-out" onClick={() => doSignOut(true)}>
              {strings.signOutEverywhere}
            </MenuItem>
          </UserMenu>
        }
      />
      <div className="shell__body">
        <div className="shell__sidebar">{sidebar}</div>
        {drawerOpen ? (
          <>
            <div className="shell__scrim" aria-hidden="true" onClick={() => setDrawerOpen(false)} />
            <div className="shell__drawer">{sidebar}</div>
          </>
        ) : null}
        <main ref={mainRef} id="main" className="shell__main" tabIndex={-1}>
          {props.children}
        </main>
      </div>
      {props.useBottomNav ? (
        <div className="shell__bottomnav">
          <BottomNav items={bottomItems} activeId={activeId} onNavigate={navigate} fixed={false} label={strings.mainNav} />
        </div>
      ) : null}
      {props.overlay}
    </div>
  );
}
