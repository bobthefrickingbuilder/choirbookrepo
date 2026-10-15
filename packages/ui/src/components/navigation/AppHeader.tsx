import * as React from 'react';
import { IconButton } from '../buttons/IconButton';

export interface AppHeaderProps {
  start?: React.ReactNode;
  search?: React.ReactNode;
  actions?: React.ReactNode;
  end?: React.ReactNode;
  /** Shows the menu button (tablet drawer) when set. */
  onMenu?: () => void;
  menuLabel?: string;
  className?: string;
}

export function AppHeader({
  start,
  search,
  actions,
  end,
  onMenu,
  menuLabel = 'Open menu',
  className = '',
}: AppHeaderProps) {
  return (
    <header className={'cb-header ' + className}>
      {' '}
      <div className="cb-header__start">
        {onMenu ? <IconButton icon="menu" label={menuLabel} onClick={onMenu} /> : null}
        {start}
      </div>
      {search ? <div className="cb-header__search">{search}</div> : null}{' '}
      <div className="cb-header__end">
        {actions}
        {end}
      </div>
    </header>
  );
}
