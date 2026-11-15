import { useEffect, useState } from 'react';
import api, { getError } from '../api/axios';

const PERIODS = [
  { id: 'daily', label: 'Daily', one: 'day', now: 'Today', before: 'Yesterday' },
  { id: 'weekly', label: 'Weekly', one: 'week', now: 'This week', before: 'Last week' },
  { id: 'monthly', label: 'Monthly', one: 'month', now: 'This month', before: 'Last month' },
];

const METRICS = [
  { id: 'score', label: 'Productivity score', unit: '' },
  { id: 'tasksCompleted', label: 'Tasks completed', unit: '' },
  { id: 'focusMinutes', label: 'Focus minutes', unit: ' min' },
  { id: 'habitCheckins', label: 'Habit check-ins', unit: '' },
];

function Change({ value }) {
  if (value === null) return <span className="text-xs text-muted">new</span>;
  if (value === 0) return <span className="text-xs text-muted">no change</span>;
  return <span className={`text-xs ${value > 0 ? 'text-sage' : 'text-rose'}`}>{value > 0 ? '+' : ''}{value}%</span>;
}

// a bar chart made of plain boxes: one column per day, week or month
function BarChart({ buckets, metric }) {
  const max = Math.max(1, ...buckets.map((b) => b[metric.id]));
  return (
    <div className="overflow-x-auto">
      <div className="flex h-64 min-w-[32rem] items-end gap-2 border-b-2 border-paper" role="img" aria-label={`${metric.label} bar chart`}>
        {buckets.map((b, i) => {
          const value = b[metric.id];
          const last = i === buckets.length - 1;
          return (
            <div key={b.from} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${value}${metric.unit}`}>
              <span className="text-xs tabular-nums text-muted">{value}</span>
              <div className={`w-full ${last ? 'bg-brass' : 'bg-paper'}`} style={{ height: `${(value / max) * 85}%`, minHeight: value ? 2 : 0 }} />
            </div>
          );
        })}
      </div>
      <div className="flex min-w-[32rem] gap-2 pt-1">
        {buckets.map((b) => (
          <span key={b.from} className="flex-1 text-center text-[10px] leading-tight text-faint">{b.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState('weekly');
  const [metricId, setMetricId] = useState('score');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [pick, setPick] = useState({ a: 0, b: 0 }); // the two periods to compare

  useEffect(() => {
    setReport(null);
    api
      .get('/analytics', { params: { period } })
      .then(({ data }) => {
        setReport(data);
        setPick({ a: data.buckets.length - 2, b: data.buckets.length - 1 });
        setError('');
      })
      .catch((err) => setError(getError(err)));
  }, [period]);

  const info = PERIODS.find((p) => p.id === period);
  const metric = METRICS.find((m) => m.id === metricId);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Analytics</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`border-2 px-4 py-1 text-sm ${period === p.id ? 'border-brass bg-brass/15 text-brass' : 'border-line text-muted hover:text-paper'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="alert-error">{error}</p>}
      {!report && !error && <p className="text-muted">Loading the numbers...</p>}

      {report && (
        <>
          {/* this period against the one before */}
          <section>
            <h2 className="heading mb-3 text-40">{info.now} / {info.before}</h2>
            <div className="grid grid-cols-2 border-y-2 border-paper lg:grid-cols-4">
              {METRICS.map((m, i) => (
                <div key={m.id} className={`px-4 py-5 ${i % 2 ? 'border-l border-line' : ''} ${i > 0 ? 'lg:border-l lg:border-line' : ''} ${i < 2 ? 'border-b border-line lg:border-b-0' : ''}`}>
                  <p className="heading text-64">{report.current[m.id]}</p>
                  <p className="mt-1 text-sm text-muted">{m.label}</p>
                  <p className="mt-1 text-xs text-faint">
                    before: {report.previous[m.id]}{m.unit} <Change value={report.changes[m.id]} />
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* chart */}
          <section className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="heading text-40">{metric.label}</h2>
              <select className="input w-auto" value={metricId} onChange={(e) => setMetricId(e.target.value)} aria-label="What the chart shows">
                {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <BarChart buckets={report.buckets} metric={metric} />
            <p className="mt-4 text-sm text-muted">
              {metricId === 'score' ? 'Average' : 'Total'} for these {report.buckets.length} {info.one}s: <span className="text-paper">{report.totals[metricId]}{metric.unit}</span>.
              Best {info.one}: <span className="text-paper">{report.best.label}</span> with a score of {report.best.score}.
            </p>
          </section>

          {/* compare any two periods */}
          <section className="card">
            <h2 className="heading mb-4 text-40">Compare two {info.one}s</h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {['a', 'b'].map((side) => (
                <div key={side}>
                  <label className="label" htmlFor={`pick-${side}`}>{side === 'a' ? 'First' : 'Second'} {info.one}</label>
                  <select id={`pick-${side}`} className="input" value={pick[side]} onChange={(e) => setPick({ ...pick, [side]: Number(e.target.value) })}>
                    {report.buckets.map((b, i) => <option key={b.from} value={i}>{b.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-paper text-left text-xs uppercase text-muted">
                  <th className="py-2 font-semibold">Measure</th>
                  <th className="py-2 text-right font-semibold">{report.buckets[pick.a].label}</th>
                  <th className="py-2 text-right font-semibold">{report.buckets[pick.b].label}</th>
                  <th className="py-2 text-right font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {METRICS.map((m) => {
                  const a = report.buckets[pick.a][m.id];
                  const b = report.buckets[pick.b][m.id];
                  const diff = b - a;
                  return (
                    <tr key={m.id}>
                      <td className="py-2 text-paper">{m.label}</td>
                      <td className="py-2 text-right tabular-nums">{a}{m.unit}</td>
                      <td className="py-2 text-right tabular-nums">{b}{m.unit}</td>
                      <td className={`py-2 text-right tabular-nums ${diff > 0 ? 'text-sage' : diff < 0 ? 'text-rose' : 'text-muted'}`}>{diff > 0 ? '+' : ''}{diff}{m.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
