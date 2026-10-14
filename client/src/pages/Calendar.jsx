import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';

// ---------- small date helpers (all in LOCAL time) ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d) => addDays(d, -d.getDay()); // week starts on Sunday
const hhmm = (t) => (t || '').slice(0, 5);
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const REMINDERS = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'At the time of event' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
];

const reminderText = (m) => (m === null || m === undefined ? '' : m === 0 ? 'Reminder: at start' : `Reminder: ${m} min before`);

// the date range that the current view needs from the API
function getRange(view, anchor) {
  if (view === 'day') return { from: iso(anchor), to: iso(anchor) };
  if (view === 'week') {
    const s = startOfWeek(anchor);
    return { from: iso(s), to: iso(addDays(s, 6)) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const s = startOfWeek(first);
  return { from: iso(s), to: iso(addDays(s, 41)) }; // 6 weeks grid
}

const emptyForm = (date) => ({
  title: '',
  description: '',
  date,
  startTime: '09:00',
  endTime: '10:00',
  reminderMinutes: '',
});

export default function Calendar() {
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(midnight(new Date()));
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(iso(new Date())));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { from, to } = getRange(view, anchor);
      const [list, up] = await Promise.all([
        api.get('/events', { params: { from, to } }),
        api.get('/events/upcoming', { params: { limit: 6 } }),
      ]);
      setEvents(list.data.events);
      setUpcoming(up.data.events);
    } catch (err) {
      setError(getError(err));
    }
  }, [view, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsOn = (dateStr) => events.filter((e) => e.date === dateStr);

  // ---------- navigation ----------
  const move = (dir) => {
    if (view === 'day') setAnchor(addDays(anchor, dir));
    else if (view === 'week') setAnchor(addDays(anchor, 7 * dir));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  };

  const title =
    view === 'month'
      ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${startOfWeek(anchor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${addDays(startOfWeek(anchor), 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // ---------- create / edit / delete ----------
  const openNew = (date = iso(anchor)) => {
    setEditingId(null);
    setForm(emptyForm(date));
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || '',
      date: ev.date,
      startTime: hhmm(ev.startTime),
      endTime: hhmm(ev.endTime),
      reminderMinutes: ev.reminderMinutes === null ? '' : String(ev.reminderMinutes),
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/events/${editingId}`, form);
      else await api.post('/events', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const remove = async () => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${editingId}`);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  // ---------- pieces of UI ----------
  const EventChip = ({ ev }) => (
    <button
      onClick={() => openEdit(ev)}
      className="block w-full truncate rounded bg-indigo-100 px-1.5 py-0.5 text-left text-xs text-indigo-800 hover:bg-indigo-200"
      title={ev.title}
    >
      {hhmm(ev.startTime)} {ev.title}
    </button>
  );

  const todayStr = iso(new Date());

  const renderMonth = () => {
    const gridStart = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return (
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 border-l border-t border-slate-200 bg-white">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="border-b border-r border-slate-200 bg-slate-100 p-2 text-center text-xs font-semibold">{d}</div>
          ))}
          {days.map((d) => {
            const ds = iso(d);
            const list = eventsOn(ds);
            const outside = d.getMonth() !== anchor.getMonth();
            return (
              <div key={ds} className={`min-h-24 border-b border-r border-slate-200 p-1 ${outside ? 'bg-slate-50 text-slate-400' : ''}`}>
                <button
                  onClick={() => { setAnchor(d); setView('day'); }}
                  className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${ds === todayStr ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200'}`}
                >
                  {d.getDate()}
                </button>
                <div className="space-y-0.5">
                  {list.slice(0, 3).map((ev) => <EventChip key={ev.id} ev={ev} />)}
                  {list.length > 3 && <p className="px-1 text-xs text-slate-500">+{list.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const start = startOfWeek(anchor);
    return (
      <div className="grid gap-2 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
          const ds = iso(d);
          return (
            <div key={ds} className={`card p-2 ${ds === todayStr ? 'border-indigo-400' : ''}`}>
              <button onClick={() => openNew(ds)} className="mb-2 w-full text-left text-xs font-semibold hover:text-indigo-600">
                {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })} +
              </button>
              <div className="space-y-1">
                {eventsOn(ds).map((ev) => <EventChip key={ev.id} ev={ev} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDay = () => {
    const list = eventsOn(iso(anchor));
    return (
      <div className="card">
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">No events on this day.</p>
        ) : (
          <ul className="divide-y">
            {list.map((ev) => (
              <li key={ev.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-sm text-slate-500">
                    {hhmm(ev.startTime)}{ev.endTime ? ` - ${hhmm(ev.endTime)}` : ''}
                  </p>
                  {ev.description && <p className="mt-1 text-sm text-slate-600">{ev.description}</p>}
                  {reminderText(ev.reminderMinutes) && <p className="mt-1 text-xs text-amber-700">{reminderText(ev.reminderMinutes)}</p>}
                </div>
                <button className="btn-ghost btn-sm" onClick={() => openEdit(ev)}>Edit</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Calendar</h2>
        <button className="btn-primary" onClick={() => openNew()}>+ New event</button>
      </div>

      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={() => move(-1)}>&lt;</button>
        <button className="btn-ghost" onClick={() => setAnchor(midnight(new Date()))}>Today</button>
        <button className="btn-ghost" onClick={() => move(1)}>&gt;</button>
        <span className="mx-2 font-semibold">{title}</span>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-300">
          {['day', 'week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm capitalize ${view === v ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div>{view === 'month' ? renderMonth() : view === 'week' ? renderWeek() : renderDay()}</div>

        <aside className="card h-fit">
          <h3 className="mb-2 font-semibold">Upcoming events</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing upcoming.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((ev) => (
                <li key={ev.id}>
                  <button onClick={() => openEdit(ev)} className="w-full rounded p-1 text-left hover:bg-slate-100">
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-slate-500">{ev.date} at {hhmm(ev.startTime)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit event' : 'New event'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Start *</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div>
              <label className="label">End</label>
              <input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Reminder</label>
            <select className="input" value={form.reminderMinutes} onChange={(e) => setForm({ ...form, reminderMinutes: e.target.value })}>
              {REMINDERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-between gap-2">
            {editingId ? <button type="button" className="btn-danger" onClick={remove}>Delete</button> : <span />}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary">Save event</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}