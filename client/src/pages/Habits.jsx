import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';

const emptyForm = { name: '', description: '', frequency: 'daily' };

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [tab, setTab] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [days, setDays] = useState([]); // the 28 days shown in the Edit window: [{ date, done, was }]
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
                <p className="mb-2 text-xs text-faint">Last 28 days (to change a day, click Edit)</p>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
                  {h.history.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}${d.done ? ': done' : ''}`}
                      className={`aspect-square border ${d.done ? 'border-brass bg-brass' : 'border-line bg-night'}`}
                    />
                  ))}
                </div>
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
              <label className="label">Done days (last 28 days)</label>
              <p className="mb-2 text-xs text-faint">Click a square to add or remove a day. Nothing changes until you click Save changes.</p>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {days.map((d) => (
                  <button
                    type="button"
                    key={d.date}
                    onClick={() => toggleDay(d.date)}
                    title={d.date}
                    className={`border px-1 py-1.5 text-xs ${d.done ? 'border-brass bg-brass text-night' : 'border-line bg-night text-muted hover:border-faint'} ${d.done !== d.was ? 'outline outline-2 outline-offset-1 outline-sage' : ''}`}
                  >
                    {Number(d.date.slice(8))}
                  </button>
                ))}
              </div>
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