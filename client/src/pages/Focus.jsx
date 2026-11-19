import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getError } from '../api/axios';

const DEFAULT_PLAN = [
  { kind: 'focus', minutes: 25 },
  { kind: 'break', minutes: 5 },
];
const MAX_STEPS = 12;

const validStep = (s) => (s?.kind === 'focus' || s?.kind === 'break') && s.minutes >= 1 && s.minutes <= 180;

// the plan (list of focus and break steps) is kept in this browser, so it survives a refresh
const loadPlan = () => {
  try {
    const p = JSON.parse(localStorage.getItem('focusPlan'));
    if (Array.isArray(p) && p.length && p.every(validStep)) return p;
  } catch {
    /* nothing saved yet */
  }
  return DEFAULT_PLAN;
};
const hasSavedPlan = () => {
  try {
    return Boolean(localStorage.getItem('focusPlan'));
  } catch {
    return false;
  }
};
const savePlan = (plan) => {
  try {
    localStorage.setItem('focusPlan', JSON.stringify(plan));
  } catch {
    /* storage blocked: the plan still works until the page closes */
  }
};
// the sound can be switched off on the Settings page (Module 3)
const soundOn = () => {
  try {
    return JSON.parse(localStorage.getItem('focusSettings'))?.sound !== false;
  } catch {
    return true;
  }
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v)) || min));
const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const stepName = (s) => (s.kind === 'focus' ? 'Focus' : 'Break');
const focusTotal = (plan) => plan.filter((s) => s.kind === 'focus').reduce((t, s) => t + s.minutes, 0);
const breakTotal = (plan) => plan.filter((s) => s.kind === 'break').reduce((t, s) => t + s.minutes, 0);
const describe = (plan) => plan.map((s) => `${stepName(s)} ${s.minutes}`).join(' + ');

// ---- alarm (Web Audio API: the sound is generated, no sound file is needed) ----
const ALARM_SOUNDS = [
  { id: 'digital', label: 'Digital (double beep)' },
  { id: 'beep', label: 'Beep' },
  { id: 'bell', label: 'Bell' },
  { id: 'chime', label: 'Chime (two notes)' },
  { id: 'siren', label: 'Siren' },
];
// volume in %, seconds = how long it rings, pitch = sound frequency in Hz, rate = repeats per second
const DEFAULT_ALARM = { sound: 'digital', volume: 100, seconds: 8, pitch: 880, rate: 3 };

const loadAlarm = () => {
  try {
    const a = JSON.parse(localStorage.getItem('alarmSettings'));
    if (a && ALARM_SOUNDS.some((s) => s.id === a.sound)) return { ...DEFAULT_ALARM, ...a };
  } catch {
    /* nothing saved yet */
  }
  return DEFAULT_ALARM;
};
const saveAlarm = (a) => {
  try {
    localStorage.setItem('alarmSettings', JSON.stringify(a));
  } catch {
    /* storage blocked */
  }
};

// plays the alarm and returns { stop, ms }: stop() silences it at once, ms is how long it rings
function playAlarm(ctx, a) {
  if (!ctx) return { stop: () => {}, ms: 0 };
  try {
    ctx.resume();
  } catch {
    /* ignore */
  }
  const t0 = ctx.currentTime + 0.05;
  const end = t0 + a.seconds;
  const master = ctx.createGain();
  master.gain.value = a.volume / 100;
  // the compressor keeps a loud alarm clean instead of crackling
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  const oscs = [];

  // one note: a quick fade in, then either a held tone or a bell-like fade out
  const tone = (start, length, freq, type, peak, ring) => {
    if (start >= end) return;
    const len = Math.max(0.05, length);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    if (!ring) g.gain.setValueAtTime(peak, start + len - 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + len + 0.02);
    oscs.push(osc);
  };

  const step = 1 / a.rate; // time between two repeats
  if (a.sound === 'siren') {
    // one tone that slides up and down
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    g.gain.value = 0.6;
    for (let t = t0; t < end; t += step) {
      osc.frequency.setValueAtTime(a.pitch, t);
      osc.frequency.linearRampToValueAtTime(a.pitch * 1.6, Math.min(t + step / 2, end));
      osc.frequency.linearRampToValueAtTime(a.pitch, Math.min(t + step, end));
    }
    g.gain.setValueAtTime(0.6, end - 0.05);
    g.gain.linearRampToValueAtTime(0.0001, end);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(end);
    oscs.push(osc);
  } else {
    let n = 0;
    for (let t = t0; t < end; t += step, n += 1) {
      if (a.sound === 'beep') {
        tone(t, step * 0.5, a.pitch, 'square', 0.6, false);
      } else if (a.sound === 'digital') {
        const len = Math.min(0.09, step * 0.25);
        tone(t, len, a.pitch, 'square', 0.6, false);
        tone(t + Math.min(0.13, step * 0.4), len, a.pitch, 'square', 0.6, false);
      } else if (a.sound === 'bell') {
        tone(t, Math.min(1.5, step * 0.95), a.pitch, 'sine', 1, true);
        tone(t, Math.min(1.2, step * 0.9), a.pitch * 2.76, 'sine', 0.4, true); // the bright "ding" of a bell
      } else {
        tone(t, step * 0.9, n % 2 ? a.pitch * 1.25 : a.pitch, 'triangle', 0.9, true); // chime: two notes in turn
      }
    }
  }

  const stop = () => {
    oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    try {
      master.disconnect();
    } catch {
      /* ignore */
    }
  };
  return { stop, ms: a.seconds * 1000 + 100 };
}

// a pop-up from the browser, shown even when another tab is open
function notify(text) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Kaajkormo focus timer', { body: text, icon: '/favicon.svg', requireInteraction: true });
    }
  } catch {
    /* notifications are optional */
  }
}

export default function Focus() {
  const [plan, setPlan] = useState(loadPlan);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'finished'
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(() => loadPlan()[0].minutes * 60);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ today: { sessions: 0, minutes: 0 }, streak: 0 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // everything the running timer needs, in one ref, so the interval always sees the newest values
  // { plan, label, index, endAt, left, focusDone }
  const run = useRef(null);
  const audio = useRef(null);

  // alarm settings and the alarm that is ringing now
  const [alarmCfg, setAlarmCfg] = useState(loadAlarm);
  const [ringing, setRinging] = useState(false);
  const ring = useRef(null); // { stop, timer }
  const alarmRef = useRef(alarmCfg);
  alarmRef.current = alarmCfg;

  const ensureAudio = () => {
    try {
      if (!audio.current) audio.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      /* no sound in this browser */
    }
  };

  const stopAlarm = useCallback(() => {
    const r = ring.current;
    if (!r) return;
    r.stop();
    clearTimeout(r.timer);
    ring.current = null;
    setRinging(false);
  }, []);

  // force = true for the Test button, so it plays even if sound is switched off in Settings
  const soundAlarm = (force = false) => {
    if (!force && !soundOn()) return;
    ensureAudio();
    stopAlarm();
    const played = playAlarm(audio.current, alarmRef.current);
    ring.current = {
      stop: played.stop,
      timer: setTimeout(() => {
        ring.current = null;
        setRinging(false);
      }, played.ms),
    };
    setRinging(true);
  };

  // silence the alarm when the user leaves the page
  useEffect(() => stopAlarm, [stopAlarm]);

  const setAlarm = (key, value) => {
    const next = { ...alarmCfg, [key]: value };
    setAlarmCfg(next);
    saveAlarm(next);
  };

  const editable = status === 'idle' || status === 'finished';

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.get('/focus', { params: { days: 30 } }), api.get('/focus/summary')]);
      setHistory(list.data.sessions);
      setSummary(sum.data);
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Settings (Module 3): the sound switch, and a first plan if the user has not made one yet
  useEffect(() => {
    api
      .get('/settings')
      .then(({ data }) => {
        const s = data.settings;
        if (!s) return;
        try {
          localStorage.setItem('focusSettings', JSON.stringify({ focus: s.focusMinutes, brk: s.breakMinutes, sound: s.timerSound }));
        } catch {
          /* ignore */
        }
        if (hasSavedPlan() || run.current || !s.focusMinutes) return;
        const first = [
          { kind: 'focus', minutes: s.focusMinutes },
          { kind: 'break', minutes: s.breakMinutes || 5 },
        ];
        setPlan(first);
        setRemaining(first[0].minutes * 60);
      })
      .catch(() => {
        /* no Settings page yet: keep the plan from this browser */
      });
  }, []);

  // saves one run of the plan in History
  const saveRun = async (r, completed) => {
    const planned = focusTotal(r.plan);
    const minutes = completed ? planned : Math.min(planned, Math.floor(r.focusDone));
    if (minutes < 1) return false; // less than one minute of focus is not saved
    try {
      await api.post('/focus', { label: r.label, steps: r.plan, actualMinutes: minutes, completed });
      load();
      return true;
    } catch (err) {
      setError(getError(err));
      return false;
    }
  };

  const finish = (r) => {
    run.current = null;
    soundAlarm();
    const text = 'All steps are finished. Great work! You can start it again any time from History.';
    notify(text);
    setNotice(text);
    setStatus('finished');
    setStepIndex(0);
    setRemaining(r.plan[0].minutes * 60);
    saveRun(r, true);
  };

  // the countdown. It compares with the real clock, so it stays right even in a background tab.
  // When a step ends, the next one starts by itself, with an alarm and a notification.
  useEffect(() => {
    if (status !== 'running') return undefined;
    const id = setInterval(() => {
      const r = run.current;
      if (!r) return;
      const now = Date.now();
      let moved = false;
      // a loop, in case the browser slept through more than one step
      while (now >= r.endAt) {
        const ended = r.plan[r.index];
        if (ended.kind === 'focus') r.focusDone += ended.minutes;
        r.index += 1;
        if (r.index >= r.plan.length) {
          clearInterval(id);
          finish(r);
          return;
        }
        r.endAt += r.plan[r.index].minutes * 60000;
        moved = true;
      }
      if (moved) {
        const next = r.plan[r.index];
        const text =
          next.kind === 'break'
            ? `Focus time is over. Break of ${next.minutes} min has started.`
            : `Break is over. Focus of ${next.minutes} min has started.`;
        soundAlarm();
        notify(text);
        setNotice(text);
        setStepIndex(r.index);
      }
      setRemaining(Math.max(0, Math.ceil((r.endAt - now) / 1000)));
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // show the time and the step in the browser tab
  useEffect(() => {
    const step = (run.current?.plan || plan)[stepIndex];
    document.title = status === 'running' && step ? `${mmss(remaining)} ${stepName(step)} - Kaajkormo` : 'Kaajkormo';
    return () => {
      document.title = 'Kaajkormo';
    };
  }, [status, remaining, stepIndex, plan]);

  const start = (p = plan, l = label) => {
    setError('');
    if (!p.some((s) => s.kind === 'focus')) return setError('The plan needs at least one focus step.');
    // the click on Start allows sound and lets us ask for notifications
    ensureAudio();
    try {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    } catch {
      /* no notifications */
    }
    const copy = p.map((s) => ({ kind: s.kind, minutes: s.minutes }));
    run.current = { plan: copy, label: l, index: 0, endAt: Date.now() + copy[0].minutes * 60000, left: 0, focusDone: 0 };
    setNotice(`${stepName(copy[0])} of ${copy[0].minutes} min has started.`);
    setStepIndex(0);
    setRemaining(copy[0].minutes * 60);
    setStatus('running');
    return undefined;
  };

  const pause = () => {
    const r = run.current;
    if (!r) return;
    r.left = Math.max(0, r.endAt - Date.now());
    setRemaining(Math.ceil(r.left / 1000));
    setStatus('paused');
  };

  const resume = () => {
    const r = run.current;
    if (!r) return;
    r.endAt = Date.now() + r.left;
    setStatus('running');
  };

  // stop: ends the whole run early. The focus time done so far is saved as "Stopped early".
  const stop = async () => {
    stopAlarm();
    const r = run.current;
    if (!r) return;
    const step = r.plan[r.index];
    if (step.kind === 'focus') {
      const left = status === 'running' ? Math.max(0, r.endAt - Date.now()) : r.left;
      r.focusDone += (step.minutes * 60000 - left) / 60000;
    }
    run.current = null;
    setStatus('idle');
    setStepIndex(0);
    setRemaining(r.plan[0].minutes * 60);
    const saved = await saveRun(r, false);
    setNotice(saved ? 'Stopped. The focus time so far was saved in History.' : 'Stopped. Less than one minute of focus, so nothing was saved.');
  };

  // reset: back to the first step, nothing is saved
  const reset = () => {
    stopAlarm();
    run.current = null;
    setStatus('idle');
    setStepIndex(0);
    setRemaining(plan[0].minutes * 60);
    setNotice('');
  };

  // ---- plan editor (only when the timer is not running) ----
  const updatePlan = (next) => {
    setPlan(next);
    savePlan(next);
    setStepIndex(0);
    setRemaining(next[0].minutes * 60);
    if (status === 'finished') setStatus('idle');
  };
  const setMinutes = (i, value) => updatePlan(plan.map((s, k) => (k === i ? { ...s, minutes: clamp(value, 1, 180) } : s)));
  const addStep = (kind) => {
    if (plan.length >= MAX_STEPS) return;
    updatePlan([...plan, { kind, minutes: kind === 'focus' ? 25 : 5 }]);
  };
  const removeStep = (i) => {
    if (plan.length <= 1) return;
    updatePlan(plan.filter((_, k) => k !== i));
  };

  // ---- history ----
  const startAgain = (s) => {
    if (!editable) return;
    const steps = s.steps?.length ? s.steps.map(({ kind, minutes }) => ({ kind, minutes })) : [{ kind: 'focus', minutes: s.plannedMinutes }];
    setPlan(steps);
    savePlan(steps);
    setLabel(s.label || '');
    start(steps, s.label || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeSession = async (s) => {
    if (!confirm('Delete this entry from History?')) return;
    try {
      await api.delete(`/focus/${s.id}`);
      load();
    } catch (err) {
      setError(getError(err));
    }
  };

  const shown = run.current?.plan || plan;
  const current = shown[stepIndex] || shown[0];
  const total = current.minutes * 60;
  const R = 110;
  const C = 2 * Math.PI * R;
  const progress = status === 'idle' || status === 'finished' ? 0 : 1 - remaining / total;
  const word =
    status === 'running' ? (current.kind === 'focus' ? 'Stay focused' : 'Relax')
      : status === 'paused' ? 'Paused'
        : status === 'finished' ? 'All done'
          : 'Ready';

  return (
    <div className="space-y-6">
      <h1 className="page-title">Focus timer</h1>
      {error && <p className="alert-error">{error}</p>}
      {notice && <p className="alert-ok">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card flex flex-col items-center py-8">
          {/* the steps of the plan; the current one is yellow */}
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {shown.map((s, i) => {
              const active = !editable && i === stepIndex;
              const past = !editable && i < stepIndex;
              return (
                <span
                  key={i}
                  className={`border px-3 py-1 text-xs ${active ? 'border-brass bg-brass/15 text-brass' : past ? 'border-line text-faint line-through' : 'border-line text-muted'}`}
                >
                  {i + 1}. {stepName(s)} {s.minutes}m
                </span>
              );
            })}
          </div>

          <div className="relative h-64 w-64">
            <svg viewBox="0 0 250 250" className="h-full w-full -rotate-90">
              <circle cx="125" cy="125" r={R} fill="none" className="stroke-base-400" strokeWidth="10" />
              <circle
                cx="125" cy="125" r={R} fill="none" strokeWidth="10"
                className={current.kind === 'focus' ? 'stroke-paper' : 'stroke-sage'}
                strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="heading text-80 tabular-nums">{mmss(remaining)}</span>
              <span className="mt-1 text-sm text-muted">{word}</span>
              {!editable && (
                <span className="text-xs text-faint">
                  Step {stepIndex + 1} of {shown.length}: {stepName(current)}
                </span>
              )}
            </div>
          </div>

          <input
            className="input mt-6 max-w-xs text-center"
            placeholder="What are you working on?"
            value={label}
            maxLength={80}
            disabled={!editable}
            onChange={(e) => setLabel(e.target.value)}
          />

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {editable && <button className="btn-primary px-8" onClick={() => start()}>{status === 'finished' ? 'Start again' : 'Start'}</button>}
            {status === 'running' && <button className="btn-primary px-8" onClick={pause}>Pause</button>}
            {status === 'paused' && <button className="btn-primary px-8" onClick={resume}>Resume</button>}
            {!editable && <button className="btn-danger" onClick={stop}>Stop</button>}
            {!editable && <button className="btn-ghost" onClick={reset}>Reset</button>}
            {ringing && <button className="btn-danger" onClick={stopAlarm}>Stop alarm</button>}
          </div>
          <p className="mt-3 max-w-sm text-center text-xs text-faint">
            Each break starts by itself when a focus step ends, with an alarm and a browser notification. Allow notifications when Chrome asks.
          </p>
        </div>

        <div className="space-y-6">
          {/* plan editor */}
          <div className="card space-y-3">
            <h2 className="heading text-32">Session plan</h2>
            <ol className="space-y-2">
              {plan.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={`w-24 shrink-0 whitespace-nowrap text-sm ${s.kind === 'focus' ? 'text-paper' : 'text-sage'}`}>{i + 1}. {stepName(s)}</span>
                  <input
                    className="input w-20"
                    type="number"
                    min="1"
                    max="180"
                    value={s.minutes}
                    disabled={!editable}
                    onChange={(e) => setMinutes(i, e.target.value)}
                    aria-label={`Minutes for step ${i + 1}`}
                  />
                  <span className="text-xs text-muted">min</span>
                  <button
                    className="ml-auto text-xl leading-none text-faint hover:text-rose disabled:opacity-30"
                    onClick={() => removeStep(i)}
                    disabled={!editable || plan.length <= 1}
                    aria-label={`Remove step ${i + 1}`}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <button className="btn-ghost btn-sm" onClick={() => addStep('focus')} disabled={!editable || plan.length >= MAX_STEPS}>+ Focus</button>
              <button className="btn-ghost btn-sm" onClick={() => addStep('break')} disabled={!editable || plan.length >= MAX_STEPS}>+ Break</button>
            </div>
            <p className="text-xs text-muted">
              Focus {focusTotal(plan)} min + break {breakTotal(plan)} min = {focusTotal(plan) + breakTotal(plan)} min in total.
            </p>
            <p className="text-xs text-faint">The plan can be changed while the timer is not running. Up to {MAX_STEPS} steps.</p>
          </div>

          {/* alarm settings */}
          <div className="card space-y-3">
            <h2 className="heading text-32">Alarm</h2>
            <div>
              <label className="label" htmlFor="alarm-sound">Sound</label>
              <select id="alarm-sound" className="input" value={alarmCfg.sound} onChange={(e) => setAlarm('sound', e.target.value)}>
                {ALARM_SOUNDS.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="alarm-volume">Volume: {alarmCfg.volume}%</label>
              <input
                id="alarm-volume" type="range" min="10" max="100" step="5" className="w-full accent-[var(--color-brass)]"
                value={alarmCfg.volume} onChange={(e) => setAlarm('volume', clamp(e.target.value, 10, 100))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="alarm-seconds">Rings for (sec)</label>
                <input
                  id="alarm-seconds" type="number" min="1" max="60" className="input"
                  value={alarmCfg.seconds} onChange={(e) => setAlarm('seconds', clamp(e.target.value, 1, 60))}
                />
              </div>
              <div>
                <label className="label" htmlFor="alarm-rate">Repeats / sec</label>
                <input
                  id="alarm-rate" type="number" min="1" max="6" className="input"
                  value={alarmCfg.rate} onChange={(e) => setAlarm('rate', clamp(e.target.value, 1, 6))}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="alarm-pitch">Pitch (frequency): {alarmCfg.pitch} Hz</label>
              <input
                id="alarm-pitch" type="range" min="200" max="2000" step="10" className="w-full accent-[var(--color-brass)]"
                value={alarmCfg.pitch} onChange={(e) => setAlarm('pitch', clamp(e.target.value, 200, 2000))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost btn-sm" onClick={() => soundAlarm(true)}>Test alarm</button>
              {ringing && <button className="btn-danger btn-sm" onClick={stopAlarm}>Stop alarm</button>}
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  setAlarmCfg(DEFAULT_ALARM);
                  saveAlarm(DEFAULT_ALARM);
                }}
              >
                Default
              </button>
            </div>
            <p className="text-xs text-faint">Saved in this browser. About 400 Hz sounds deep; 1000 Hz and above is sharp and easier to hear.</p>
          </div>

          <div className="grid grid-cols-3 border-y border-line">
            {[
              ['Done today', summary.today.sessions],
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
        <h2 className="mb-3 heading text-32">History</h2>
        {history.length === 0 ? (
          <p className="text-muted">Nothing here yet. Finish a plan above and it will be added here.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden border border-line bg-surface">
            {history.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.label || 'Focus session'}</p>
                  <p className="text-xs text-muted">
                    {s.date} / {s.steps?.length ? describe(s.steps) : `Focus ${s.plannedMinutes}`} / {s.actualMinutes} of {s.plannedMinutes} min focused
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs ${s.completed ? 'bg-sage/15 text-sage' : 'bg-rose/10 text-rose'}`}>
                  {s.completed ? 'Completed' : 'Stopped early'}
                </span>
                <button className="btn-ghost btn-sm" onClick={() => startAgain(s)} disabled={!editable}>Start again</button>
                <button className="btn-danger btn-sm" onClick={() => removeSession(s)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}