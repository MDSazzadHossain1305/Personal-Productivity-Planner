import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const links = [
  { to: '/', label: 'Home', end: true, icon: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { to: '/tasks', label: 'Tasks', icon: 'M9 11l3 3 8-8M4 5h3M4 12h3M4 19h16' },
  { to: '/calendar', label: 'Calendar', icon: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
  { to: '/notes', label: 'Notes', icon: 'M6 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v6h6M8 13h8M8 17h5' },
  { to: '/profile', label: 'Profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
];

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <aside className="flex shrink-0 flex-col bg-slate-900 p-4 text-slate-300 md:sticky md:top-0 md:h-screen md:w-64 md:p-5">
        <div className="mb-4 flex items-center justify-between md:mb-8">
          <Logo light />
          <button onClick={handleLogout} className="rounded-lg px-3 py-1.5 text-sm text-red-300 hover:bg-slate-800 md:hidden">
            Log out
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon d={l.icon} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-slate-800 pt-4 md:block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-300">
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400 md:px-8">
          &copy; {new Date().getFullYear()} Kaajkormo &middot; SE331 Group 04
        </footer>
      </div>
    </div>
  );
}