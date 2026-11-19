import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';

const emptyForm = { name: '', description: '', frequency: 'daily' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const nice = (s) => {
  const d = toDate(s);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

// A month calendar that starts on the 1st, one row per week (Sunday to Saturday).
// days = [{ date: "YYYY-MM-DD", done, was? }] from the 1st of last month to today.
// The arrows switch between last month and this month. If onPick is given, days can be clicked (Edit window).
function HabitCalendar({ days, onPick }) {
  const today = days[days.length - 1].date;
  const firstMonth = days[0].date.slice(0, 7); // "YYYY-MM"
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);

  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const [y, m] = month.split('-').map(Number);
  const startDay = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  const count = new Date(y, m, 0).getDate(); // days in this month
  const cells = [...Array.from({ length: startDay }, () => null)];
  for (let n = 1; n <= count; n += 1) cells.push(`${month}-${pad(n)}`);
  while (cells.length % 7) cells.push(null);

  const doneHere = days.filter((d) => d.done && d.date.startsWith(month)).length;
  const daysSoFar = month === thisMonth ? Number(today.slice(8)) : count;
  const go = (step) => {
    const d = new Date(y, m - 1 + step, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="btn-ghost btn-sm" onClick={() => go(-1)} disabled={month <= firstMonth} aria-label="Last month">&lt;</button>
        <p className="text-sm text-paper">
          {MONTH_NAMES[m - 1]} {y}
          <span className="ml-2 text-xs text-muted">done {doneHere} of {daysSoFar} days</span>
        </p>
        <button type="button" className="btn-ghost btn-sm" onClick={() => go(1)} disabled={month >= thisMonth} aria-label="Next month">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] uppercase text-faint">{w}</span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`x${i}`} />;
          const d = byDate[date];
          const n = Number(date.slice(8));
          if (!d) {
            // a day after today: shown, but it cannot be marked yet
            return <span key={date} className="border border-line/40 py-1.5 text-xs text-faint/50">{n}</span>;
          }
          const look = `${d.done ? 'border-brass bg-brass text-night font-semibold' : 'border-line bg-night text-muted'} ${
            date === today ? 'ring-2 ring-paper ring-offset-1 ring-offset-night' : ''
          } ${onPick && d.done !== d.was ? 'outline outline-2 outline-offset-2 outline-sage' : ''}`;
          const title = `${nice(date)}${d.done ? ': done' : ': not done'}${date === today ? ' (today)' : ''}`;
          return onPick ? (
            <button type="button" key={date} title={title} onClick={() => onPick(date)} className={`border py-1.5 text-xs hover:border-faint ${look}`}>
              {n}
            </button>
          ) : (
            <span key={date} title={title} className={`border py-1.5 text-xs ${look}`}>
              {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [tab, setTab] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [days, setDays] = useState([]); // the days shown in the Edit window: [{ date, done, was }]
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/habits', { params: { archived: tab === 'archived' } });
      setHabits(data.habits);
      setError('');
    } catch (err) {
      setError(getError(err));
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const swap = (habit) => setHabits((list) => list.map((h) => (h.id === habit.id ? habit : h)));
  const run = async (fn) => {
    try {
      await fn();
      setError('');
    } catch (err) {
      setError(getError(err));
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDays([]);
    setModalOpen(true);
  };
  const openEdit = (h) => {
    setEditingId(h.id);
    setForm({ name: h.name, description: h.description, frequency: h.frequency });
    setDays(h.history.map((d) => ({ date: d.date, done: d.done, was: d.done })));
    setModalOpen(true);
  };
  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleDay = (date) => setDays(days.map((d) => (d.date === date ? { ...d, done: !d.done } : d)));

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (editingId) {
        // send only the days that were changed in this window
        const changed = Object.fromEntries(days.filter((d) => d.done !== d.was).map((d) => [d.date, d.done]));
        await api.put(`/habits/${editingId}`, { ...form, days: changed });
      } else {
        await api.post('/habits', form);
      }
      setModalOpen(false);
      load();
    });
  };

  // marks TODAY done. It is saved for good: to change it later, use Edit.
  const complete = (h) => run(async () => swap((await api.post(`/habits/${h.id}/complete`)).data.habit));
  const archive = (h, archived) => run(async () => {
    await api.patch(`/habits/${h.id}/archive`, { archived });
    load();
  });
  const remove = (h) => {
    if (!confirm(`Delete habit "${h.name}" and its history?`)) return;
    run(async () => {
      await api.delete(`/habits/${h.id}`);
      load();
    });
  };

  const totalDone = habits.filter((h) => h.doneNow).length;
  const changedCount = days.filter((d) => d.done !== d.was).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Habits</h1>
        <button className="btn-primary" onClick={openNew}>+ New habit</button>
      </div>
      {error && <p className="alert-error">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {['active', 'archived'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={` border px-4 py-1.5 text-sm capitalize ${tab === t ? 'border-brass bg-brass/15 text-brass' : 'border-line text-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'active' && habits.length > 0 && (
          <p className="text-sm text-muted">{totalDone} of {habits.length} done for today / this week</p>
        )}
      </div>

      {habits.length === 0 ? (
        <p className="text-muted">{tab === 'archived' ? 'No archived habits.' : 'No habits yet. Add one to start a streak.'}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {habits.map((h) => (
            <div key={h.id} className="card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="heading text-32">{h.name}</h3>
                  {h.description && <p className="text-sm text-muted">{h.description}</p>}
                  <span className="mt-1 inline-block border border-line px-2 py-0.5 text-xs capitalize text-muted">{h.frequency}</span>
                  <p className="mt-2 text-xs text-muted">
                    Today: {nice(h.history[h.history.length - 1].date)}
                    {h.doneNow && <span className="text-sage"> / marked done</span>}
                  </p>
                </div>
                {tab === 'active' && (
                  <button
                    className={h.doneNow ? 'btn-ghost shrink-0' : 'btn-primary shrink-0'}
                    onClick={() => complete(h)}
                    disabled={h.doneNow}
                    title={h.doneNow ? 'Saved. Use Edit to change it.' : undefined}
                  >
                    {h.doneNow ? (h.frequency === 'weekly' ? 'Done this week' : 'Done today') : h.frequency === 'weekly' ? 'Done this week?' : 'Mark done'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 border-y border-line text-center">
                {[
                  ['Current streak', `${h.streak} ${h.frequency === 'weekly' ? 'wk' : 'd'}`],
                  ['Best streak', `${h.bestStreak} ${h.frequency === 'weekly' ? 'wk' : 'd'}`],
                  ['Consistency', `${h.consistency}%`],
                ].map(([l, v], i) => (
                  <div key={l} className={`py-3 ${i ? 'border-l border-line' : ''}`}>
                    <p className="heading text-32 text-brass">{v}</p>
                    <p className="text-xs text-muted">{l}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-xs text-faint">Yellow = done, white ring = today. To change a day, click Edit.</p>
                <HabitCalendar days={h.history} />
              </div>

              <div className="flex flex-wrap gap-2">
                {tab === 'active' && <button className="btn-ghost btn-sm" onClick={() => openEdit(h)}>Edit</button>}
                <button className="btn-ghost btn-sm" onClick={() => archive(h, tab === 'active')}>{tab === 'active' ? 'Archive' : 'Restore'}</button>
                <button className="btn-danger btn-sm" onClick={() => remove(h)}>Delete</button>
                <span className="ml-auto self-center text-xs text-faint">{h.totalCompletions} total</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editingId ? 'Edit habit' : 'New habit'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Habit name</label>
            <input className="input" required value={form.name} onChange={setField('name')} placeholder="Read for 20 minutes" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input" rows="2" value={form.description} onChange={setField('description')} />
          </div>
          <div>
            <label className="label">How often?</label>
            <select className="input" value={form.frequency} onChange={setField('frequency')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {editingId && (
            <div>
              <label className="label">Done days (this month and last month)</label>
              <p className="mb-2 text-xs text-faint">Click a date to mark it done or not done. Nothing changes until you click Save changes.</p>
              <HabitCalendar days={days} onPick={toggleDay} />
              {changedCount > 0 && <p className="mt-2 text-xs text-sage">{changedCount} day(s) changed</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">{editingId ? 'Save changes' : 'Create habit'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}