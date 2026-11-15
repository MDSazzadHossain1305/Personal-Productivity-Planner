import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';
import { shortDate, todayISO } from '../lib/dates';

const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', on_hold: 'On hold' };
const emptyForm = { title: '', description: '', targetDate: '', status: 'not_started', milestonesText: '' };

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [tab, setTab] = useState('active'); // 'active' | 'archived'
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newMs, setNewMs] = useState({}); // new milestone text per goal id
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/goals', { params: { archived: tab === 'archived', status, q: search } });
      setGoals(data.goals);
      setError('');
    } catch (err) {
      setError(getError(err));
    }
  }, [tab, status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // replace one goal in the list with the fresh copy from the server
  const swap = (goal) => setGoals((list) => list.map((g) => (g.id === goal.id ? goal : g)));
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
    setModalOpen(true);
  };
  const openEdit = (g) => {
    setEditingId(g.id);
    setForm({ title: g.title, description: g.description, targetDate: g.targetDate, status: g.status, milestonesText: '' });
    setModalOpen(true);
  };
  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { title: form.title, description: form.description, targetDate: form.targetDate, status: form.status };
      if (editingId) await api.put(`/goals/${editingId}`, body);
      else {
        body.milestones = form.milestonesText.split('\n').map((s) => s.trim()).filter(Boolean);
        await api.post('/goals', body);
      }
      setModalOpen(false);
      load();
    });
  };

  const changeStatus = (g, value) => run(async () => swap((await api.put(`/goals/${g.id}`, { status: value })).data.goal));
  const toggleMs = (g, m) => run(async () => swap((await api.patch(`/goals/${g.id}/milestones/${m.id}`, { done: !m.done })).data.goal));
  const removeMs = (g, m) => run(async () => swap((await api.delete(`/goals/${g.id}/milestones/${m.id}`)).data.goal));
  const addMs = (g) => {
    const title = (newMs[g.id] || '').trim();
    if (!title) return;
    run(async () => {
      swap((await api.post(`/goals/${g.id}/milestones`, { title })).data.goal);
      setNewMs({ ...newMs, [g.id]: '' });
    });
  };
  const archive = (g, archived) => run(async () => {
    await api.patch(`/goals/${g.id}/archive`, { archived });
    load();
  });
  const remove = (g) => {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    run(async () => {
      await api.delete(`/goals/${g.id}`);
      load();
    });
  };

  const today = todayISO();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Goals</h1>
        <button className="btn-primary" onClick={openNew}>+ New goal</button>
      </div>
      {error && <p className="alert-error">{error}</p>}

      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
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
        <input className="input" placeholder="Search goals..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {goals.length === 0 ? (
        <p className="text-muted">{tab === 'archived' ? 'No archived goals.' : 'No goals yet. Create your first goal.'}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => {
            const overdue = g.targetDate && g.status !== 'completed' && g.targetDate < today;
            return (
              <div key={g.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={`heading text-32 ${g.status === 'completed' ? 'text-sage' : 'text-paper'}`}>{g.title}</h3>
                    {g.description && <p className="text-sm text-muted">{g.description}</p>}
                    {g.targetDate && (
                      <p className={`mt-1 text-xs ${overdue ? 'text-rose' : 'text-faint'}`}>
                        Target {shortDate(g.targetDate)}{overdue && ' (overdue)'}
                      </p>
                    )}
                  </div>
                  <select className="input w-auto" value={g.status} onChange={(e) => changeStatus(g, e.target.value)} disabled={tab === 'archived'}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>Progress ({g.milestonesDone}/{g.milestones.length} milestones)</span>
                    <span>{g.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden bg-line">
                    <div className="h-full bg-brass transition-all" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>

                <ul className="space-y-1">
                  {g.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 accent-[var(--color-paper)]" checked={m.done} disabled={tab === 'archived'} onChange={() => toggleMs(g, m)} />
                      <span className={`flex-1 ${m.done ? 'text-faint line-through' : ''}`}>{m.title}</span>
                      {tab === 'active' && (
                        <button className="text-faint hover:text-rose" onClick={() => removeMs(g, m)} aria-label="Remove milestone">&times;</button>
                      )}
                    </li>
                  ))}
                </ul>

                {tab === 'active' && (
                  <div className="flex gap-2">
                    <input
                      className="input" placeholder="Add a milestone..." value={newMs[g.id] || ''}
                      onChange={(e) => setNewMs({ ...newMs, [g.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && addMs(g)}
                    />
                    <button className="btn-ghost" onClick={() => addMs(g)}>Add</button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {tab === 'active' && <button className="btn-ghost btn-sm" onClick={() => openEdit(g)}>Edit</button>}
                  {tab === 'active' && g.status === 'completed' && <button className="btn-ghost btn-sm" onClick={() => archive(g, true)}>Archive</button>}
                  {tab === 'archived' && <button className="btn-ghost btn-sm" onClick={() => archive(g, false)}>Restore</button>}
                  <button className="btn-danger btn-sm" onClick={() => remove(g)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} title={editingId ? 'Edit goal' : 'New goal'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={setField('title')} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" value={form.description} onChange={setField('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target date</label>
              <input className="input" type="date" value={form.targetDate} onChange={setField('targetDate')} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={setField('status')}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          {!editingId && (
            <div>
              <label className="label">Milestones (one per line, optional)</label>
              <textarea className="input" rows="4" placeholder={'Finish chapter 1\nFinish chapter 2'} value={form.milestonesText} onChange={setField('milestonesText')} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">{editingId ? 'Save changes' : 'Create goal'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
