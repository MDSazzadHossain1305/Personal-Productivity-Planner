import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';
import { nowHHMM, shortDate, todayISO } from '../lib/dates';

const TYPE_STYLE = {
  reminder: 'bg-brass/15 text-brass',
  task: 'bg-sage/15 text-sage',
  event: 'bg-sky-400/15 text-sky-300',
  goal: 'bg-violet-400/15 text-violet-300',
  habit: 'bg-rose/10 text-rose',
};
const emptyForm = () => ({ title: '', note: '', date: todayISO(), time: nowHHMM() });

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, n] = await Promise.all([api.get('/reminders'), api.get('/notifications')]);
      setReminders(r.data.reminders);
      setNotifications(n.data.notifications);
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  // load now, then check for new notifications every minute
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const run = async (fn) => {
    try {
      await fn();
      setError('');
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ title: r.title, note: r.note, date: r.date, time: r.time });
    setModalOpen(true);
  };
  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (editingId) await api.put(`/reminders/${editingId}`, form);
      else await api.post('/reminders', form);
      setModalOpen(false);
    });
  };
  const removeReminder = (r) => {
    if (confirm(`Delete reminder "${r.title}"?`)) run(() => api.delete(`/reminders/${r.id}`));
  };
  const removeNotification = (n) => run(() => api.delete(`/notifications/${n.id}`));
  const clearAll = () => run(() => api.delete('/notifications'));

  const today = todayISO();
  const now = nowHHMM();
  const isPast = (r) => r.date < today || (r.date === today && r.time < now);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Reminders</h1>
        <button className="btn-primary" onClick={openNew}>+ New reminder</button>
      </div>
      {error && <p className="alert-error">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 heading text-32">My reminders</h2>
          {reminders.length === 0 ? (
            <p className="text-muted">No reminders yet.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden border border-line bg-surface">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-raised/40">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${isPast(r) ? 'text-faint' : ''}`}>{r.title}</p>
                    <p className="text-xs text-muted">{shortDate(r.date)} at {r.time}{isPast(r) && ' / passed'}</p>
                    {r.note && <p className="truncate text-sm text-muted">{r.note}</p>}
                  </div>
                  <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => removeReminder(r)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="heading text-32">
              Notifications {notifications.length > 0 && <span className="ml-1 bg-brass px-2 py-0.5 text-xs text-night">{notifications.length}</span>}
            </h2>
            {notifications.length > 0 && <button className="btn-ghost btn-sm" onClick={clearAll}>Delete all</button>}
          </div>
          {notifications.length === 0 ? (
            <p className="text-muted">You are all caught up. Alerts for due reminders, tasks, events, goals and habits appear here.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="card flex items-start gap-3 !p-4">
                  <span className={`mt-0.5 px-2 py-0.5 text-xs capitalize ${TYPE_STYLE[n.type]}`}>{n.type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted">{n.message}</p>
                  </div>
                  <button className="text-xl leading-none text-faint hover:text-rose" onClick={() => removeNotification(n)} aria-label="Delete notification">&times;</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit reminder' : 'New reminder'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={setField('title')} />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <textarea className="input" rows="2" value={form.note} onChange={setField('note')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" required value={form.date} onChange={setField('date')} />
            </div>
            <div>
              <label className="label">Time</label>
              <input className="input" type="time" required value={form.time} onChange={setField('time')} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">{editingId ? 'Save changes' : 'Create reminder'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
