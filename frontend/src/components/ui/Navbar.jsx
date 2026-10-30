import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { NAV_ITEMS } from '@/config/navigation';
import { ROLES, ROLE_BADGE, ROLE_LABELS } from '@/config/role';
import { useAuth } from '@/hooks/useAuth';
import AlertBell from '@/components/alerts/AlertBell';
import Logo from './Logo';
import ServerStatus from './ServerStatus';

const linkClass = ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-header-ink/15 text-header-ink' : 'text-header-soft hover:bg-header-ink/10 hover:text-header-ink'
  }`;

const mobileLinkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-3 text-base font-semibold ${
    isActive ? 'bg-header-ink/15 text-header-ink' : 'text-header-soft hover:bg-header-ink/10 hover:text-header-ink'
  }`;

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => item.inNav && item.roles.includes(role));
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const displayName = fullName || user?.username;
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-30 bg-header pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" aria-label="FuelTrack, home page" className="flex shrink-0 items-center text-header-ink">
          <Logo />
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 xl:flex">
          {items.map((item) => (
            <NavLink key={item.key} to={item.path} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {role !== ROLES.CASHIER && <AlertBell />}
          <span className="hidden sm:block">
            <ServerStatus />
          </span>

          <Link to="/profile" className="hidden items-center gap-2 rounded-lg px-2 py-1 hover:bg-header-ink/10 lg:flex">
            <span className="max-w-40 truncate text-sm font-semibold text-header-ink">{displayName}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_BADGE[role] ?? ''}`}>{ROLE_LABELS[role] ?? role}</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-header-ink ring-1 ring-header-soft/40 hover:bg-header-ink/10 lg:block"
          >
            Logout
          </button>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-lg text-header-ink hover:bg-header-ink/10 xl:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-header-ink/15 px-4 pb-4 pt-2 xl:hidden">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.key}>
                <NavLink to={item.path} onClick={close} className={mobileLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/profile" onClick={close} className={mobileLinkClass}>
                My account
              </NavLink>
            </li>
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-header-ink/15 pt-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-header-ink">{displayName}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_BADGE[role] ?? ''}`}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-header-ink ring-1 ring-header-soft/40 hover:bg-header-ink/10"
            >
              Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}