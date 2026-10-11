import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
 
const hhmm = (t) => (t || '').slice(0, 5);
 
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
 
  const stat = (label, value, to) => (
    <Link to={to} className="card block hover:border-indigo-300">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value ?? '-'}</p>
    </Link>
  );
 
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Welcome, {user?.name}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {stat('Pending tasks', summary?.pending, '/tasks')}
        {stat('Completed tasks', summary?.completed, '/tasks')}
        {stat('Pinned notes', pinned, '/notes')}
      </div>
      <div className="card">
        <h3 className="mb-3 font-semibold">Upcoming events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        ) : (
          <ul className="divide-y">
            {events.map((ev) => (
              <li key={ev.id} className="flex justify-between py-2 text-sm">
                <span className="font-medium">{ev.title}</span>
                <span className="text-slate-500">{ev.date} {hhmm(ev.startTime)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
