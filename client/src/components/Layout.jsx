import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/notes', label: 'Notes' },
  { to: '/profile', label: 'Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-1 bg-slate-900 p-4 text-slate-200 md:w-56">
        <h1 className="mb-4 text-lg font-bold text-white">Productivity Planner</h1>
        <nav className="flex gap-1 md:flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden pt-6 md:block">
          <p className="truncate text-sm text-slate-400">{user?.name}</p>
          <button onClick={handleLogout} className="mt-2 text-sm text-red-300 hover:text-red-200">
            Log out
          </button>
        </div>
        <button onClick={handleLogout} className="mt-2 text-left text-sm text-red-300 md:hidden">
          Log out
        </button>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}