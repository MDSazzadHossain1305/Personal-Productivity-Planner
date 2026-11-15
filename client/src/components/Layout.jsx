import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { FrameBottom } from './Grunge';

const links = [
  { to: '/', label: 'Today', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/notes', label: 'Notes' },
  { to: '/focus', label: 'Focus' },
  { to: '/goals', label: 'Goals' },
  { to: '/habits', label: 'Habits' },
  { to: '/reminders', label: 'Reminders' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/achievements', label: 'Awards' },
  { to: '/settings', label: 'Settings' },
  { to: '/profile', label: 'Profile' },
];

const linkClass = ({ isActive }) =>
  `block px-2 py-0.5 font-grunge text-24 uppercase leading-tight tracking-wide ${
    isActive ? 'bg-paper text-night' : 'text-paper underline decoration-2 underline-offset-4 hover:text-muted'
  }`;

function NavList({ onPick }) {
  return (
    <ul className="flex flex-col gap-1">
      {links.map((l, i) => (
        <li key={l.to}>
          <NavLink to={l.to} end={l.end} className={linkClass} onClick={onPick}>
            {i + 1}. {l.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* desktop: side navigation */}
      <aside className="hidden shrink-0 flex-col border-r-2 border-paper bg-night/70 p-6 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:overflow-y-auto">
        <Logo />
        <nav className="mt-6" aria-label="Main">
          <NavList />
        </nav>
        <div className="mt-auto pt-8">
          <p className="truncate text-sm font-semibold text-paper">{user?.name}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <button onClick={handleLogout} className="btn-ghost mt-3 w-full">Log out</button>
        </div>
      </aside>

      {/* phone: top bar + full screen menu, as in the template */}
      <header className="flex items-center justify-between border-b-2 border-paper bg-night/80 px-4 py-3 md:hidden">
        <Logo />
        <button onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="btn-ghost !px-3 !text-xl">Menu</button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-night p-6 md:hidden">
          <div className="flex justify-end">
            <button onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="btn-ghost !px-3 !text-xl">Close</button>
          </div>
          <nav className="mt-6" aria-label="Main">
            <NavList onPick={() => setMenuOpen(false)} />
          </nav>
          <button onClick={handleLogout} className="btn-ghost mt-8 w-full">Log out</button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-4 md:p-10">
          <Outlet />
        </main>
        <footer className="px-4 pb-6 md:px-10">
          <FrameBottom />
          <p className="mt-2 text-center text-xs text-muted">
            Kaajkormo &copy; {new Date().getFullYear()} / SE331 Group 04
          </p>
        </footer>
      </div>
    </div>
  );
}
