import Logo, { LogoMark } from './Logo';

const points = [
  'Tasks with deadlines, priority and status',
  'Daily, weekly and monthly calendar with reminders',
  'Notes with tags, pins and quick capture',
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-linear-to-br from-indigo-700 via-indigo-600 to-teal-600 p-12 text-white lg:flex">
        <Logo light size="lg" />
        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight">
            Organise your work.
            <br />
            Own your day.
          </h2>
          <p className="mt-4 max-w-md text-indigo-100">
            Kaajkormo keeps your tasks, schedule and notes in one place, so nothing slips.
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-indigo-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-indigo-200">SE331 Capstone &middot; Group 04</p>
        <LogoMark className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 opacity-10" />
      </section>

      <section className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}