import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';

const emptyForm = {
  title: '',
  description: '',
  type: 'daily',
  priority: 'medium',
  status: 'todo',
  deadline: '',
};

const STATUS_LABEL = { todo: 'Todo', in_progress: 'In Progress', completed: 'Completed' };
const PRIORITY_STYLE = {
  high: 'bg-rose/15 text-rose',
  medium: 'bg-brass/15 text-brass',
  low: 'bg-sage/15 text-sage',
};

const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, inProgress: 0 });
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', type: '', sort: 'newest' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [list, sum] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/tasks/summary'),
      ]);
      setTasks(list.data.tasks);
      setSummary(sum.data);
    } catch (err) {
      setError(getError(err));
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (name) => (e) => setFilters({ ...filters, [name]: e.target.value });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description || '',
      type: t.type,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline || '',
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/tasks/${editingId}`, form);
      else await api.post('/tasks', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const setStatus = async (task, status) => {
    try {
      await api.patch(`/tasks/${task.id}/status`, { status });
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const remove = async (task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const today = todayISO();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Tasks</h1>
        <button className="btn-primary" onClick={openNew}>+ New task</button>
      </div>

      {error && <p className="alert-error">{error}</p>}

      <div className="grid grid-cols-3 border-y border-line">
        {[
          ['Total', summary.total, 'text-paper'],
          ['Pending', summary.pending, 'text-brass'],
          ['Completed', summary.completed, 'text-sage'],
        ].map(([label, value, color], i) => (
          <div key={label} className={`px-4 py-4 md:px-6 ${i ? 'border-l border-line' : ''}`}>
            <p className={`heading text-48 ${color}`}>{value}</p>
            <p className="mt-0.5 text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input" placeholder="Search tasks..." value={filters.search} onChange={setFilter('search')} />
        <select className="input" value={filters.status} onChange={setFilter('status')}>
          <option value="">All statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="input" value={filters.priority} onChange={setFilter('priority')}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="input" value={filters.type} onChange={setFilter('type')}>
          <option value="">Daily and long-term</option>
          <option value="daily">Daily</option>
          <option value="long_term">Long-term</option>
        </select>
        <select className="input" value={filters.sort} onChange={setFilter('sort')}>
          <option value="newest">Newest first</option>
          <option value="deadline">By deadline</option>
          <option value="priority">By priority</option>
        </select>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted">No tasks found.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden border border-line bg-surface">
          {tasks.map((t) => {
            const done = t.status === 'completed';
            const overdue = t.deadline && !done && t.deadline < today;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-raised/40">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-paper)]"
                  checked={done}
                  onChange={() => setStatus(t, done ? 'todo' : 'completed')}
                  title="Mark as completed"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className={`font-medium ${done ? 'text-faint line-through' : ''}`}>{t.title}</p>
                  {t.description && <p className="truncate text-sm text-muted">{t.description}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={` px-2 py-0.5 capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    <span className=" border border-line px-2 py-0.5 text-muted">
                      {t.type === 'daily' ? 'Daily' : 'Long-term'}
                    </span>
                    {t.deadline && (
                      <span className={overdue ? 'font-medium text-rose' : 'text-muted'}>
                        Due {t.deadline}{overdue && ' (overdue)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex w-full items-center gap-2 pl-8 sm:w-auto sm:pl-0">
                  <select className="input w-auto" value={t.status} onChange={(e) => setStatus(t, e.target.value)}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(t)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={modalOpen} title={editingId ? 'Edit task' : 'New task'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="long_term">Long-term</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
