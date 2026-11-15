import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getError } from '../api/axios';

const loadSettings = () => {
  try {
    const s = JSON.parse(localStorage.getItem('focusSettings'));
    if (s && s.focus > 0 && s.brk > 0) return s;
  } catch {
    /* ignore */
  }
  return { focus: 25, brk: 5 };
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || min));
const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// short beep when a period ends
function beep() {
  if (loadSettings().sound === false) return; // switched off in Settings
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* sound is optional */
  }
}

export default function Focus() {
  const [settings, setSettings] = useState(loadSettings);
  const [phase, setPhase] = useState('focus'); // 'focus' | 'break'
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused'
  const [remaining, setRemaining] = useState(() => loadSettings().focus * 60);
  const [label, setLabel] = useState('');
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({ today: { sessions: 0, minutes: 0 }, week: { sessions: 0, minutes: 0 }, streak: 0 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const endAt = useRef(0);
  const labelRef = useRef('');
  labelRef.current = label;

  const total = (phase === 'focus' ? settings.focus : settings.brk) * 60;

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.get('/focus', { params: { days: 7 } }), api.get('/focus/summary')]);
      setSessions(list.data.sessions);
      setSummary(sum.data);
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // use the durations saved in Settings (Module 3), if that page has been set up
  useEffect(() => {
    api
      .get('/settings')
      .then(({ data }) => {
        const s = data.settings;
        if (!s?.focusMinutes) return;
        const next = { focus: s.focusMinutes, brk: s.breakMinutes, sound: s.timerSound };
        localStorage.setItem('focusSettings', JSON.stringify(next));
        setSettings(next);
        setRemaining((left) => (endAt.current ? left : next.focus * 60)); // do not touch a timer that already started
      })
      .catch(() => {
        /* no saved settings yet: keep the ones from this browser */
      });
  }, []);

  const saveSession = async (minutes, completed) => {
    try {
      await api.post('/focus', {
        label: labelRef.current,
        plannedMinutes: settings.focus,
        actualMinutes: minutes,
        completed,
      });
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  // the countdown: compares with the real clock, so it stays correct in a background tab
  useEffect(() => {
    if (status !== 'running') return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left > 0) return;
      clearInterval(id);
      beep();
      if (phase === 'focus') {
        saveSession(settings.focus, true);
        setNotice('Focus session complete. Time for a break.');
        setPhase('break');
        setRemaining(settings.brk * 60);
      } else {
        setNotice('Break is over. Ready for the next session?');
        setPhase('focus');
        setRemaining(settings.focus * 60);
      }
      setStatus('idle');
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, phase, settings]);

  // show the time in the browser tab
  useEffect(() => {
    document.title = status === 'running' ? `${mmss(remaining)} - Kaajkormo` : 'Kaajkormo';
    return () => {
      document.title = 'Kaajkormo';
    };
  }, [status, remaining]);

  const start = () => {
    setNotice('');
    endAt.current = Date.now() + remaining * 1000;
    setStatus('running');
  };

  const pause = () => {
    setRemaining(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)));
    setStatus('paused');
  };

  // stop: ends the session early. A focus session of 1 minute or more is saved as "stopped early".
  const stop = async () => {
    const left = status === 'running' ? Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)) : remaining;
    const doneMinutes = Math.floor((total - left) / 60);
    if (phase === 'focus' && doneMinutes >= 1) await saveSession(doneMinutes, false);
    setStatus('idle');
    setRemaining(total);
  };

  // reset: back to the full time, nothing is saved
  const reset = () => {
    setStatus('idle');
    setRemaining(total);
    setNotice('');
  };

  const changeSetting = (key) => (e) => {
    const next = { ...settings, [key]: clamp(e.target.value, 1, key === 'focus' ? 180 : 60) };
    setSettings(next);
    localStorage.setItem('focusSettings', JSON.stringify(next));
    api.put('/settings', { focusMinutes: next.focus, breakMinutes: next.brk }).catch(() => {}); // keep Settings in step
    if (status === 'idle') setRemaining((phase === 'focus' ? next.focus : next.brk) * 60);
  };

  const skipTo = (p) => {
    setPhase(p);
    setRemaining((p === 'focus' ? settings.focus : settings.brk) * 60);
    setStatus('idle');
  };

  const removeSession = async (s) => {
    try {
      await api.delete(`/focus/${s.id}`);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const R = 110;
  const C = 2 * Math.PI * R;
  const progress = total ? 1 - remaining / total : 0;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Focus timer</h1>
      {error && <p className="alert-error">{error}</p>}
      {notice && <p className="alert-ok">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card flex flex-col items-center py-8">
          <div className="mb-4 flex gap-2">
            {['focus', 'break'].map((p) => (
              <button
                key={p}
                disabled={status !== 'idle'}
                onClick={() => skipTo(p)}
                className={` border px-4 py-1 text-sm capitalize disabled:cursor-not-allowed ${
                  phase === p ? 'border-brass bg-brass/15 text-brass' : 'border-line text-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="relative h-64 w-64">
            <svg viewBox="0 0 250 250" className="h-full w-full -rotate-90">
              <circle cx="125" cy="125" r={R} fill="none" className="stroke-base-400" strokeWidth="10" />
              <circle
                cx="125" cy="125" r={R} fill="none" strokeWidth="10"
                className={phase === 'focus' ? 'stroke-paper' : 'stroke-sage'}
                strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="heading text-80 tabular-nums">{mmss(remaining)}</span>
              <span className="mt-1 text-sm text-muted">
                {status === 'running' ? (phase === 'focus' ? 'Stay focused' : 'Relax') : status === 'paused' ? 'Paused' : 'Ready'}
              </span>
            </div>
          </div>

          <input
            className="input mt-6 max-w-xs text-center"
            placeholder="What are you working on?"
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
          />

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {status === 'idle' && <button className="btn-primary px-8" onClick={start}>Start</button>}
            {status === 'running' && <button className="btn-primary px-8" onClick={pause}>Pause</button>}
            {status === 'paused' && <button className="btn-primary px-8" onClick={start}>Resume</button>}
            {status !== 'idle' && <button className="btn-danger" onClick={stop}>Stop</button>}
            <button className="btn-ghost" onClick={reset} disabled={status === 'idle' && remaining === total}>Reset</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="heading text-32">Durations</h2>
            <div>
              <label className="label">Focus (minutes)</label>
              <input className="input" type="number" min="1" max="180" value={settings.focus} disabled={status !== 'idle'} onChange={changeSetting('focus')} />
            </div>
            <div>
              <label className="label">Break (minutes)</label>
              <input className="input" type="number" min="1" max="60" value={settings.brk} disabled={status !== 'idle'} onChange={changeSetting('brk')} />
            </div>
            <p className="text-xs text-faint">Durations can be changed while the timer is not running.</p>
          </div>

          <div className="grid grid-cols-3 border-y border-line">
            {[
              ['Today', summary.today.sessions],
              ['Minutes', summary.today.minutes],
              ['Day streak', summary.streak],
            ].map(([l, v], i) => (
              <div key={l} className={`px-3 py-4 ${i ? 'border-l border-line' : ''}`}>
                <p className="heading text-40 text-brass">{v}</p>
                <p className="text-xs text-muted">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 heading text-32">Last 7 days</h2>
        {sessions.length === 0 ? (
          <p className="text-muted">No focus sessions yet. Start your first one above.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden border border-line bg-surface">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.label || 'Focus session'}</p>
                  <p className="text-xs text-muted">
                    {s.date} / {s.actualMinutes} of {s.plannedMinutes} min
                  </p>
                </div>
                <span className={` px-2 py-0.5 text-xs ${s.completed ? 'bg-sage/15 text-sage' : 'bg-rose/10 text-rose'}`}>
                  {s.completed ? 'Completed' : 'Stopped early'}
                </span>
                <button className="btn-danger btn-sm" onClick={() => removeSession(s)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
