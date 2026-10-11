import { useCallback, useEffect, useState } from 'react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';
 
const emptyForm = { title: '', content: '', tags: '' };
 
export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [quick, setQuick] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
 
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notes', { params: { q: search || undefined, archived: showArchived } });
      setNotes(data.notes);
    } catch (err) {
      setError(getError(err));
    }
  }, [search, showArchived]);
 
  // reload when the search text or the archived tab changes (small delay while typing)
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
 
  const allTags = [...new Set(notes.flatMap((n) => n.tags || []))];
  const visible = tag ? notes.filter((n) => (n.tags || []).includes(tag)) : notes;
 
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
 
  const openEdit = (n) => {
    setEditingId(n.id);
    setForm({ title: n.title, content: n.content, tags: (n.tags || []).join(', ') });
    setModalOpen(true);
  };
 
  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/notes/${editingId}`, form);
      else await api.post('/notes', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };
 
  // Quick Capture: type a thought, press Enter, it is saved as a note
  const quickCapture = async (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    try {
      await api.post('/notes', { title: quick.trim().slice(0, 40), content: quick.trim() });
      setQuick('');
      load();
    } catch (err) {
      setError(getError(err));
    }
  };
 
  const act = async (fn) => {
    try {
      await fn();
      load();
    } catch (err) {
      setError(getError(err));
    }
  };
 
  const remove = (n) => {
    if (confirm(`Delete note "${n.title}"?`)) act(() => api.delete(`/notes/${n.id}`));
  };
 
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Notes</h2>
        <button className="btn-primary" onClick={openNew}>+ New note</button>
      </div>
 
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
 
      <form onSubmit={quickCapture} className="flex gap-2">
        <input className="input" placeholder="Quick capture: type a thought and press Enter" value={quick} onChange={(e) => setQuick(e.target.value)} />
        <button className="btn-ghost">Capture</button>
      </form>
 
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[10rem]" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn-ghost" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? 'Show active notes' : 'Show archived'}
        </button>
      </div>
 
      {visible.length === 0 ? (
        <p className="text-slate-500">{showArchived ? 'No archived notes.' : 'No notes yet. Capture your first thought above.'}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((n) => (
            <div key={n.id} className={`card flex flex-col ${n.isPinned ? 'border-amber-300 bg-amber-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{n.title}</h3>
                {n.isPinned && <span className="text-xs font-medium text-amber-700">Pinned</span>}
              </div>
              <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-slate-600">{n.content}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(n.tags || []).map((t) => (
                  <button key={t} onClick={() => setTag(t)} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">#{t}</button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost btn-sm" onClick={() => openEdit(n)}>Edit</button>
                {!n.isArchived && (
                  <button className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/notes/${n.id}/pin`))}>
                    {n.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                <button className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/notes/${n.id}/archive`))}>
                  {n.isArchived ? 'Restore' : 'Archive'}
                </button>
                <button className="btn-danger btn-sm" onClick={() => remove(n)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
 
      <Modal open={modalOpen} title={editingId ? 'Edit note' : 'New note'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea className="input" rows="6" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input" placeholder="work, ideas" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save note</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

