import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { FrameBottom } from './Grunge';

// The menu is a set of raised keys, grouped by what the pages are for.
// The look of a key (.key) is in keyStyles below. Each key has a small line icon (24 x 24 drawing).
const sections = [
  {
    title: 'Planning',
    links: [
      { to: '/', label: 'Today', end: true, icon: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
      { to: '/tasks', label: 'Tasks', icon: 'M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11' },
      { to: '/calendar', label: 'Calendar', icon: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
      { to: '/notes', label: 'Notes', icon: 'M6 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v6h6M8 13h8M8 17h5' },
    ],
  },
  {
    title: 'Growth',
    links: [
      { to: '/focus', label: 'Focus', icon: 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z' },
      { to: '/goals', label: 'Goals', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
      { to: '/habits', label: 'Habits', icon: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3' },
      { to: '/reminders', label: 'Reminders', icon: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0' },
    ],
  },
  {
    title: 'Insights',
    links: [
      { to: '/analytics', label: 'Analytics', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
      { to: '/achievements', label: 'Awards', icon: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/settings', label: 'Settings', icon: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' },
      { to: '/profile', label: 'Profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
    ],
  },
];

// The 3D look of the menu buttons. It lives here, in the same file as the menu, and is added
// to the page with a <style> tag, so the menu and its look can never get out of step.
const keyStyles = `
.key {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid #5f594e;
  border-radius: 10px;
  color: #1b1916;
  /* the top face: bright at the top, darker at the bottom, like light from above */
  background: linear-gradient(180deg, #fbf8f2 0%, #ece6da 45%, #d8d0c0 100%);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.95), /* shine along the top edge */
    inset 0 -3px 0 rgba(0, 0, 0, 0.12), /* lower edge of the face */
    0 7px 0 0 #8d8474, /* the thick side of the button */
    0 7px 0 1px #3a352d, /* outline of the side */
    0 11px 12px rgba(0, 0, 0, 0.55), /* close shadow */
    0 22px 30px rgba(0, 0, 0, 0.45); /* far, soft shadow */
  transform: translateY(0);
  transition: transform 90ms ease, box-shadow 90ms ease;
}
/* hover: the button rises and the shadow spreads */
.key:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.95),
    inset 0 -3px 0 rgba(0, 0, 0, 0.12),
    0 9px 0 0 #8d8474,
    0 9px 0 1px #3a352d,
    0 15px 16px rgba(0, 0, 0, 0.55),
    0 28px 38px rgba(0, 0, 0, 0.45);
}
/* while clicking: pushed all the way down */
.key:active {
  transform: translateY(6px);
  box-shadow:
    inset 0 3px 6px rgba(0, 0, 0, 0.25),
    0 1px 0 0 #8d8474,
    0 1px 0 1px #3a352d,
    0 3px 5px rgba(0, 0, 0, 0.6);
}
/* the current page: stays pressed down, with a gold face */
.key[aria-current='page'],
.key[aria-current='page']:hover {
  transform: translateY(6px);
  background: linear-gradient(180deg, #f6dd8c 0%, #e8c75c 50%, #cfa940 100%);
  box-shadow:
    inset 0 3px 6px rgba(0, 0, 0, 0.3), /* the face looks sunk in */
    inset 0 -1px 0 rgba(255, 255, 255, 0.5),
    0 1px 0 0 #8a6f22,
    0 1px 0 1px #3a352d,
    0 3px 5px rgba(0, 0, 0, 0.6);
}
/* the icon sits in a round, engraved badge */
.key-num {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: #f4efe6;
  background: linear-gradient(180deg, #2c2925 0%, #131210 100%);
  box-shadow:
    inset 0 2px 3px rgba(0, 0, 0, 0.7),
    0 1px 0 rgba(255, 255, 255, 0.9);
}
.key-label {
  flex: 1;
  font-family: var(--font-grunge, "Road Rage", Impact, sans-serif);
  font-size: 1.5rem;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  /* pressed-in letters: a thin white line under them */
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.75);
}
`;

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// one menu key: hover lifts it, clicking pushes it down, and the current page stays pressed in.
// NavLink adds aria-current="page" to the current page by itself; keyStyles uses that.
function NavItem({ link, onPick }) {
  return (
    <NavLink to={link.to} end={link.end} onClick={onPick} className="key">
      <span className="key-num"><Icon d={link.icon} /></span>
      <span className="key-label">{link.label}</span>
    </NavLink>
  );
}

function NavList({ onPick }) {
  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.title}>
          {/* group name with a thin line after it */}
          <div className="mb-3 flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{section.title}</span>
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>
          <ul className="flex flex-col gap-4 pb-2 pr-1">
            {section.links.map((link) => (
              <li key={link.to}>
                <NavItem link={link} onPick={onPick} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// the signed-in user, on a card with the template's barcode
function MemberCard({ user, onLogout }) {
  return (
    <div className="border-2 border-dashed border-line p-3">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Signed in as</p>
      <p className="mt-1 truncate font-grunge text-24 uppercase leading-none text-paper">{user?.name}</p>
      <p className="truncate font-mono text-xs text-muted">{user?.email}</p>
      <img src="/ui/barcode.svg" alt="" className="mt-2 h-6 w-auto opacity-80" />
      <button onClick={onLogout} className="btn-ghost mt-3 w-full">Log out</button>
    </div>
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
      <style>{keyStyles}</style>
      {/* desktop: side navigation */}
      <aside className="hidden shrink-0 flex-col border-r-2 border-paper bg-night/70 p-6 md:sticky md:top-0 md:flex md:h-screen md:w-72 md:overflow-y-auto">
        <Logo />
        <nav className="mt-8" aria-label="Main">
          <NavList />
        </nav>
        <div className="mt-auto pt-6">
          <MemberCard user={user} onLogout={handleLogout} />
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
          <nav className="mx-auto mt-6 max-w-sm" aria-label="Main">
            <NavList onPick={() => setMenuOpen(false)} />
          </nav>
          <div className="mx-auto mt-8 max-w-sm">
            <MemberCard user={user} onLogout={handleLogout} />
          </div>
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