import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getError } from '../api/axios';

const NOTIFY = [
  ['reminders', 'Reminders', 'when a reminder reaches its date and time'],
  ['tasks', 'Tasks', 'when a task is due today or tomorrow'],
  ['events', 'Events', 'when an event is today or tomorrow'],
  ['goals', 'Goals', 'when a goal deadline is within 3 days'],
  ['habits', 'Habits', 'when a habit is still open in the evening'],
];

function Check({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-paper)]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm text-paper">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
    </label>
  );
}

function NumberField({ id, label, hint, value, min, max, onChange }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" type="number" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} required />
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </div>
  );
}

export default function Settings() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then(({ data }) => setForm(data.settings))
      .catch((err) => setMsg({ type: 'error', text: getError(err) }));
  }, []);

  const set = (key) => (value) => setForm({ ...form, [key]: value });
  const setNotify = (key) => (value) => setForm({ ...form, notify: { ...form.notify, [key]: value } });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api.put('/settings', {
        ...form,
        dailyTaskGoal: Number(form.dailyTaskGoal),
        dailyFocusGoal: Number(form.dailyFocusGoal),
        focusMinutes: Number(form.focusMinutes),
        breakMinutes: Number(form.breakMinutes),
      });
      setForm(data.settings);
      // the Focus page reads its durations from this browser, so keep them in step
      localStorage.setItem('focusSettings', JSON.stringify({ focus: data.settings.focusMinutes, brk: data.settings.breakMinutes, sound: data.settings.timerSound }));
      setMsg({ type: 'ok', text: 'Settings saved' });
    } catch (err) {
      setMsg({ type: 'error', text: getError(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!form) return msg ? <p className="alert-error">{msg.text}</p> : <p className="text-muted">Loading settings...</p>;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <h1 className="page-title">Settings</h1>
      {msg && <p className={msg.type === 'ok' ? 'alert-ok' : 'alert-error'}>{msg.text}</p>}

      <section className="card space-y-4">
        <h2 className="heading text-32">Notifications</h2>
        <Check label="Show notifications" hint="Switch every alert on the Reminders page on or off" checked={form.notificationsEnabled} onChange={set('notificationsEnabled')} />
        <div className="space-y-3 border-l-2 border-line pl-4">
          {NOTIFY.map(([key, label, hint]) => (
            <Check key={key} label={label} hint={hint} checked={form.notify[key]} disabled={!form.notificationsEnabled} onChange={setNotify(key)} />
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="heading text-32">Daily productivity goals</h2>
        <p className="text-sm text-muted">The productivity score on the Today page and in Analytics is measured against these two numbers.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="dailyTaskGoal" label="Tasks per day" hint="1 to 50" min={1} max={50} value={form.dailyTaskGoal} onChange={set('dailyTaskGoal')} />
          <NumberField id="dailyFocusGoal" label="Focus minutes per day" hint="5 to 720" min={5} max={720} value={form.dailyFocusGoal} onChange={set('dailyFocusGoal')} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="heading text-32">Pomodoro timer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="focusMinutes" label="Focus duration (minutes)" hint="1 to 180" min={1} max={180} value={form.focusMinutes} onChange={set('focusMinutes')} />
          <NumberField id="breakMinutes" label="Break duration (minutes)" hint="1 to 60" min={1} max={60} value={form.breakMinutes} onChange={set('breakMinutes')} />
        </div>
        <Check label="Play a beep when a session ends" checked={form.timerSound} onChange={set('timerSound')} />
      </section>

      <section className="card space-y-4">
        <h2 className="heading text-32">Other preferences</h2>
        <div className="max-w-xs">
          <label className="label" htmlFor="weekStartsOn">Week starts on</label>
          <select id="weekStartsOn" className="input" value={form.weekStartsOn} onChange={(e) => set('weekStartsOn')(e.target.value)}>
            <option value="sunday">Sunday</option>
            <option value="monday">Monday</option>
          </select>
          <p className="mt-1 text-xs text-faint">Used by the weekly view in Analytics.</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save settings'}</button>
      </div>

      <section className="card space-y-3">
        <h2 className="heading text-32">Profile and password</h2>
        <p className="text-sm text-muted">Your name, phone, bio and password are changed on the Profile page.</p>
        <Link to="/profile" className="btn-ghost">Open profile</Link>
      </section>
    </form>
  );
}
