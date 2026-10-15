'use client';

import * as React from 'react';
import { Icon } from '../icons/Icon';
import { MenuItem, Popover } from '../overlays/Popover';
import { Avatar } from '../people/Avatar';

import type { Lang, Mode } from '../../types';

const T: Record<Lang, Record<'profile' | 'notif' | 'lang' | 'appearance' | 'light' | 'dark' | 'signout' | 'menu', string>> = {
  en: {
    profile: 'My profile',
    notif: 'Notification settings',
    lang: 'Language',
    appearance: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    signout: 'Sign out',
    menu: 'Account menu',
  },
  fr: {
    profile: 'Mon profil',
    notif: 'Paramètres de notification',
    lang: 'Langue',
    appearance: 'Apparence',
    light: 'Clair',
    dark: 'Sombre',
    signout: 'Se déconnecter',
    menu: 'Menu du compte',
  },
};
export interface UserMenuUser {
  name: string;
  role?: string;
  email?: string;
  avatarSrc?: string | null;
}

export interface UserMenuProps {
  user: UserMenuUser;
  lang?: Lang;
  onLangChange?: (lang: Lang) => void;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
  onSignOut?: () => void;
  onNavigate?: (target: 'profile' | 'notifications') => void;
  children?: React.ReactNode;
}

export function UserMenu({
  user,
  lang = 'en',
  onLangChange,
  mode = 'light',
  onModeChange,
  onSignOut,
  onNavigate,
  children,
}: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const t = T[lang];
  const close = () => setOpen(false);
  return (
    <span className="cb-anchor">
      {' '}
      <button
        type="button"
        className="cb-userbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.menu + ': ' + user.name}
        onClick={() => setOpen((o) => !o)}
      >
        {' '}
        <Avatar name={user.name || ''} src={user.avatarSrc} size={32} />{' '}
        <span className="cb-userbtn__name">{(user.name || '').split(' ')[0]}</span>{' '}
        <Icon name="chevron-down" size={16} />
      </button>{' '}
      <Popover open={open} onClose={close} role="menu" align="end" width={272} label={t.menu}>
        {' '}
        <div className="cb-usermenu__head">
          {' '}
          <Avatar name={user.name || ''} src={user.avatarSrc} size={40} />{' '}
          <div
            style={{
              minWidth: 0,
            }}
          >
            {' '}
            <div className="cb-usermenu__name">{user.name}</div>{' '}
            <div className="cb-usermenu__meta">
              {user.role}
              {user.email ? ' · ' + user.email : ''}
            </div>
          </div>
        </div>{' '}
        <div className="cb-menu-sep" />{' '}
        <MenuItem
          icon="user-round"
          onClick={() => {
            close();
            onNavigate && onNavigate('profile');
          }}
        >
          {t.profile}
        </MenuItem>{' '}
        <MenuItem
          icon="bell"
          onClick={() => {
            close();
            onNavigate && onNavigate('notifications');
          }}
        >
          {t.notif}
        </MenuItem>
        {children} <div className="cb-menu-sep" /> <div className="cb-menu-label">{t.lang}</div>{' '}
        <MenuItem checked={lang === 'en'} onClick={() => onLangChange && onLangChange('en')}>
          {' '}
          <span lang="en">English</span>
        </MenuItem>{' '}
        <MenuItem checked={lang === 'fr'} onClick={() => onLangChange && onLangChange('fr')}>
          {' '}
          <span lang="fr">Français</span>
        </MenuItem>{' '}
        <div className="cb-menu-label">{t.appearance}</div>{' '}
        <MenuItem icon="sun" checked={mode === 'light'} onClick={() => onModeChange && onModeChange('light')}>
          {t.light}
        </MenuItem>{' '}
        <MenuItem icon="moon" checked={mode === 'dark'} onClick={() => onModeChange && onModeChange('dark')}>
          {t.dark}
        </MenuItem>{' '}
        <div className="cb-menu-sep" />{' '}
        <MenuItem
          icon="log-out"
          onClick={() => {
            close();
            onSignOut && onSignOut();
          }}
        >
          {t.signout}
        </MenuItem>
      </Popover>
    </span>
  );
}
