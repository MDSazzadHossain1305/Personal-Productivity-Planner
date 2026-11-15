import { useEffect, useState } from 'react';
import api, { getError } from '../api/axios';

const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function Achievements() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [show, setShow] = useState('all'); // 'all' | 'unlocked' | 'locked'

  useEffect(() => {
    api
      .get('/achievements')
      .then((res) => setData(res.data))
      .catch((err) => setError(getError(err)));
  }, []);

  if (error) return <p className="alert-error">{error}</p>;
  if (!data) return <p className="text-muted">Counting your streaks...</p>;

  const streaks = [
    { label: 'Task streak', hint: 'days in a row with a completed task', ...data.streaks.tasks },
    { label: 'Habit streak', hint: 'days in a row with a habit ticked', ...data.streaks.habits },
    { label: 'Focus streak', hint: 'days in a row with a finished focus session', ...data.streaks.focus },
  ];
  const fresh = data.achievements.filter((a) => data.newlyUnlocked.includes(a.key));
  const visible = data.achievements.filter((a) => show === 'all' || (show === 'unlocked') === a.unlocked);
  const groups = [...new Set(visible.map((a) => a.group))];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Awards</h1>
        <p className="text-sm text-muted">{data.unlockedCount} of {data.total} unlocked</p>
      </div>

      {fresh.length > 0 && (
        <p className="alert-ok">New: {fresh.map((a) => a.title).join(', ')}. Well done.</p>
      )}

      {/* streaks */}
      <section className="grid border-y-2 border-paper sm:grid-cols-3">
        {streaks.map((s, i) => (
          <div key={s.label} className={`px-4 py-5 ${i ? 'border-t border-line sm:border-l sm:border-t-0' : ''}`}>
            <p className="label">{s.label}</p>
            <p className="heading text-80">{s.current} <span className="text-32 text-muted">{s.current === 1 ? 'day' : 'days'}</span></p>
            <p className="mt-1 text-xs text-faint">Best: {s.best}. Counts {s.hint}.</p>
          </div>
        ))}
      </section>

      {/* achievements, grouped; each group is a ladder of milestones */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="heading text-40">Achievements</h2>
          <div className="flex gap-2">
            {['all', 'unlocked', 'locked'].map((v) => (
              <button
                key={v}
                onClick={() => setShow(v)}
                className={`border-2 px-3 py-1 text-xs capitalize ${show === v ? 'border-brass bg-brass/15 text-brass' : 'border-line text-muted hover:text-paper'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <p className="label">{group}</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visible.filter((a) => a.group === group).map((a) => (
                  <div key={a.key} className={`border-2 p-4 ${a.unlocked ? 'border-brass bg-brass/10' : 'border-line bg-night/60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`heading text-32 ${a.unlocked ? '' : 'text-muted'}`}>{a.title}</h3>
                      <span className={`shrink-0 text-xs uppercase ${a.unlocked ? 'text-brass' : 'text-faint'}`}>{a.unlocked ? 'Unlocked' : 'Locked'}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{a.description}</p>
                    <div className="mt-3 h-2 w-full bg-base-300" role="progressbar" aria-valuenow={a.progress} aria-valuemin={0} aria-valuemax={a.target}>
                      <div className={`h-full ${a.unlocked ? 'bg-brass' : 'bg-paper'}`} style={{ width: `${(a.unlocked ? 1 : a.progress / a.target) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-faint">
                      {a.unlocked ? `Unlocked ${when(a.unlockedAt)}` : `${a.progress} of ${a.target}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* history */}
      <section>
        <h2 className="heading mb-3 text-40">History</h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-muted">No achievements yet. Complete a task, tick a habit or finish a focus session to earn the first one.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {data.history.map((h) => (
              <li key={h.key} className="grid grid-cols-[7.5rem_1fr_auto] items-baseline gap-3 py-2.5 text-sm">
                <span className="text-muted">{when(h.unlockedAt)}</span>
                <span className="truncate text-paper">{h.title}</span>
                <span className="text-xs uppercase text-faint">{h.group}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
