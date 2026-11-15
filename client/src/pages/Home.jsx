import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { shortDate } from '../lib/dates';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const scoreWord = (n) => (n >= 80 ? 'Great day' : n >= 50 ? 'On track' : n > 0 ? 'Getting started' : 'Nothing logged yet');

function Bar({ value, className = 'bg-paper' }) {
  return (
    <div className="h-2 w-full bg-base-300" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${className}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Section({ title, to, linkText, children }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="heading text-40">{title}</h2>
        <Link to={to} className="link text-sm">{linkText}</Link>
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(getError(err)));
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  // "MD Sazzad Hossain" should be greeted as Sazzad, not MD
  const words = (user?.name || '').trim().split(/\s+/);
  const firstName = /^(md|mohammad|mst)\.?$/i.test(words[0]) && words[1] ? words[1] : words[0];

  if (error) return <p className="alert-error">{error}</p>;
  if (!data) return <p className="text-muted">Loading your day...</p>;

  const { score, targets, tasks, events, goals, habits, focus } = data;
  const figures = [
    { label: 'Done today', value: tasks.completedToday, to: '/tasks' },
    { label: 'Still to do today', value: tasks.pendingToday, to: '/tasks' },
    { label: 'Overdue', value: tasks.overdue, to: '/tasks', warn: tasks.overdue > 0 },
    { label: 'Focus minutes', value: focus.minutes, to: '/focus' },
  ];
  const parts = [
    { label: `Tasks: ${tasks.completedToday} of ${targets.dailyTaskGoal}`, value: score.tasks },
    { label: `Focus: ${focus.minutes} of ${targets.dailyFocusGoal} min`, value: score.focus },
    { label: score.habits === null ? 'Habits: no daily habits yet' : `Habits: ${score.habits}%`, value: score.habits || 0 },
  ];

  return (
    <div className="space-y-10">
      <header>
        <p className="text-muted">{greeting()}, {firstName}.</p>
        <h1 className="heading mt-1 text-64 md:text-80">{today}</h1>
      </header>

      {/* productivity overview */}
      <section className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="card">
          <p className="label">Productivity score</p>
          <p className="heading text-128">{score.score}</p>
          <p className="text-sm text-muted">out of 100 / {scoreWord(score.score)}</p>
          <div className="mt-4 space-y-3">
            {parts.map((p) => (
              <div key={p.label}>
                <p className="mb-1 text-xs text-muted">{p.label}</p>
                <Bar value={p.value} />
              </div>
            ))}
          </div>
          <Link to="/analytics" className="btn-ghost mt-5 w-full">Open analytics</Link>
        </div>

        <div className="grid grid-cols-2 content-start border-y-2 border-paper md:grid-cols-4">
          {figures.map((f, i) => (
            <Link key={f.label} to={f.to} className={`group px-4 py-5 ${i % 2 ? 'border-l border-line' : ''} ${i > 0 ? 'md:border-l md:border-line' : ''} ${i < 2 ? 'border-b border-line md:border-b-0' : ''}`}>
              <p className={`heading text-64 group-hover:text-brass ${f.warn ? 'text-rose' : ''}`}>{f.value}</p>
              <p className="mt-1 text-sm text-muted">{f.label}</p>
            </Link>
          ))}
          <p className="col-span-2 px-4 py-4 text-sm text-muted md:col-span-4">
            All tasks: {tasks.totalCompleted} completed, {tasks.totalPending} pending. Focus sessions finished today: {focus.sessions}.
          </p>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Today's tasks" to="/tasks" linkText="All tasks">
          {tasks.today.length === 0 ? (
            <p className="text-sm text-muted">No tasks are due today.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {tasks.today.map((t) => (
                <li key={t.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <span className={`w-16 shrink-0 text-xs uppercase ${t.status === 'completed' ? 'text-sage' : t.overdue ? 'text-rose' : 'text-muted'}`}>
                    {t.status === 'completed' ? 'Done' : t.overdue ? 'Overdue' : 'To do'}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${t.status === 'completed' ? 'text-faint line-through' : 'text-paper'}`}>{t.title}</span>
                  <span className="text-xs uppercase text-faint">{t.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Coming up" to="/calendar" linkText="Calendar">
          {events.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[7rem_3.5rem_1fr] items-baseline gap-3 py-2.5 text-sm">
                  <span className="text-muted">{e.date === data.date ? 'Today' : shortDate(e.date)}</span>
                  <span className="tabular-nums text-brass">{e.startTime}</span>
                  <span className="truncate text-paper">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Goal progress" to="/goals" linkText="Goals">
          {goals.length === 0 ? (
            <p className="text-sm text-muted">No active goals.</p>
          ) : (
            <ul className="space-y-4">
              {goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-paper">{g.title}</span>
                    <span className="shrink-0 tabular-nums text-muted">{g.progress}%</span>
                  </div>
                  <Bar value={g.progress} className="bg-brass" />
                  <p className="mt-1 text-xs text-faint">
                    {g.milestonesDone} of {g.milestones} milestones{g.targetDate ? ` / target ${shortDate(g.targetDate)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Habit progress" to="/habits" linkText="Habits">
          {habits.total === 0 ? (
            <p className="text-sm text-muted">No habits yet.</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-muted">{habits.done} of {habits.total} done</p>
              <ul className="divide-y divide-line border-y border-line">
                {habits.list.map((h) => (
                  <li key={h.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                    <span className={`w-16 shrink-0 text-xs uppercase ${h.doneNow ? 'text-sage' : 'text-muted'}`}>{h.doneNow ? 'Done' : 'Open'}</span>
                    <span className="min-w-0 flex-1 truncate text-paper">{h.name}</span>
                    <span className="text-xs text-faint">streak {h.streak} {h.frequency === 'weekly' ? 'wk' : 'd'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
