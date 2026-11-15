import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const hhmm = (t) => (t || '').slice(0, 5);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const prettyDate = (ds) =>
  new Date(`${ds}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function Home() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [pinned, setPinned] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      api.get('/tasks/summary'),
      api.get('/events/upcoming?limit=5'),
      api.get('/notes'),
    ]).then(([s, e, n]) => {
      if (s.status === 'fulfilled') setSummary(s.value.data);
      if (e.status === 'fulfilled') setEvents(e.value.data.events);
      if (n.status === 'fulfilled') setPinned(n.value.data.notes.filter((x) => x.isPinned).length);
    });
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  // "MD Sazzad Hossain" should be greeted as Sazzad, not MD
  const words = (user?.name || '').trim().split(/\s+/);
  const firstName = /^(md|mohammad|mst)\.?$/i.test(words[0]) && words[1] ? words[1] : words[0];
  const done = summary?.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  const figures = [
    { label: 'Tasks pending', value: summary?.pending, to: '/tasks' },
    { label: 'In progress', value: summary?.inProgress, to: '/tasks' },
    { label: 'Completed', value: summary?.completed, to: '/tasks' },
    { label: 'Pinned notes', value: pinned, to: '/notes' },
  ];

  return (
    <div className="space-y-10">
      <header>
        <p className="text-muted">{greeting()}, {firstName}.</p>
        <h1 className="mt-1 heading text-64 md:text-80">{today}</h1>
      </header>

      {/* ledger of today's numbers */}
      <section className="grid grid-cols-2 border-y border-line md:grid-cols-4">
        {figures.map((f, i) => (
          <Link
            key={f.label}
            to={f.to}
            className={`group px-4 py-5 md:px-6 ${i > 0 ? 'md:border-l' : ''} ${i % 2 ? 'border-l md:border-l' : ''} border-line ${i < 2 ? 'border-b md:border-b-0' : ''}`}
          >
            <p className="heading text-64 group-hover:text-brass">{f.value ?? '-'}</p>
            <p className="mt-1 text-sm text-muted">{f.label}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="heading text-40">Coming up</h2>
            <Link to="/calendar" className="text-sm text-brass hover:underline">Open calendar</Link>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing scheduled. <Link to="/calendar" className="text-brass hover:underline">Add an event</Link>
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {events.map((ev) => (
                <li key={ev.id} className="grid grid-cols-[6.5rem_3.5rem_1fr] items-baseline gap-3 py-3 text-sm">
                  <span className="text-muted">{prettyDate(ev.date)}</span>
                  <span className="tabular-nums text-brass">{hhmm(ev.startTime)}</span>
                  <span className="truncate text-paper">{ev.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card h-fit">
          <h2 className="heading text-32">Progress</h2>
          <p className="mt-1 text-sm text-muted">
            {summary?.total ? `${summary.completed} of ${summary.total} tasks finished` : 'No tasks yet'}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden bg-night" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-sage" style={{ width: `${done}%` }} />
          </div>
          <p className="mt-2 text-right heading text-40 text-sage">{done}%</p>
          <Link to="/tasks" className="btn-ghost mt-4 w-full">Review tasks</Link>
        </section>
      </div>
    </div>
  );
}
