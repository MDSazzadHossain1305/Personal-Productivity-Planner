// Quick API check for all three modules. Start the server first (npm run dev in /server), then in the project root run:
//   node scripts/smoke.mjs
// It creates a throw-away user and tries the main endpoints of every feature. Needs Node 18 or newer (built-in fetch).
const BASE = process.env.API || 'http://localhost:5000/api';
let token = '';
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  if (!ok) failed += 1;
}

const email = `smoke${Date.now()}@test.com`;
let r = await call('POST', '/auth/register', { name: 'Smoke Test', email, password: 'secret123' });
token = r.data.token;
check('register + token', r.status === 201 && token);

// ---- today's date, used below ----
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---- Module 1: notes, tasks, events ----
r = await call('POST', '/notes', { title: 'Smoke note', content: 'hello', tags: ['Test', 'test'] });
check('create note', r.status === 201 && r.data.note?.title === 'Smoke note', JSON.stringify(r.data));
r = await call('PATCH', `/notes/${r.data.note?.id}/pin`);
check('pin note', r.status === 200 && r.data.note?.isPinned === true);
r = await call('POST', '/tasks', { title: 'Smoke task', priority: 'high', deadline: today });
const task = r.data.task;
check('create task', r.status === 201 && task?.status === 'todo', JSON.stringify(r.data));
r = await call('PATCH', `/tasks/${task?.id}/status`, { status: 'completed' });
check('complete task', r.status === 200 && r.data.task?.status === 'completed');
r = await call('GET', '/tasks/summary');
check('task summary 1 of 1 completed', r.data.total === 1 && r.data.completed === 1, JSON.stringify(r.data));
r = await call('POST', '/events', { title: 'Smoke event', date: today, startTime: '23:00', endTime: '23:30' });
check('create event', r.status === 201, JSON.stringify(r.data));
r = await call('POST', '/events', { title: 'Bad event', date: today, startTime: '10:00', endTime: '09:00' });
check('event that ends before it starts is rejected', r.status === 400);

// ---- goals ----
r = await call('POST', '/goals', { title: 'Finish module 2', targetDate: '2030-01-01', milestones: ['Build timer', 'Build habits'] });
const goal = r.data.goal;
check('create goal with 2 milestones', r.status === 201 && goal.milestones.length === 2 && goal.progress === 0);
r = await call('PATCH', `/goals/${goal.id}/milestones/${goal.milestones[0].id}`, { done: true });
check('milestone done -> 50% and in_progress', r.data.goal.progress === 50 && r.data.goal.status === 'in_progress', JSON.stringify(r.data));
r = await call('PATCH', `/goals/${goal.id}/archive`, { archived: true });
check('cannot archive an unfinished goal', r.status === 400);
r = await call('PATCH', `/goals/${goal.id}/milestones/${goal.milestones[1].id}`, { done: true });
check('all milestones done -> completed 100%', r.data.goal.status === 'completed' && r.data.goal.progress === 100);
r = await call('PATCH', `/goals/${goal.id}/archive`, { archived: true });
check('archive completed goal', r.status === 200 && r.data.goal.archived === true);
r = await call('GET', '/goals?archived=true');
check('archived list has the goal', r.data.goals.length === 1);

// ---- habits ----
r = await call('POST', '/habits', { name: 'Read', frequency: 'daily' });
const habit = r.data.habit;
check('create habit', r.status === 201 && habit.streak === 0);
r = await call('POST', `/habits/${habit.id}/complete`, {});
check('complete today -> streak 1', r.data.habit.streak === 1 && r.data.habit.doneToday === true);
r = await call('POST', `/habits/${habit.id}/complete`, {});
check('complete again undoes it', r.data.habit.streak === 0);
r = await call('POST', `/habits/${habit.id}/complete`, { date: '2999-01-01' });
check('future date rejected', r.status === 400);
r = await call('POST', '/habits', { name: 'Gym', frequency: 'weekly' });
r = await call('POST', `/habits/${r.data.habit.id}/complete`, {});
check('weekly habit streak 1', r.data.habit.streak === 1);

// ---- focus ----
r = await call('POST', '/focus', { label: 'Study', plannedMinutes: 25, actualMinutes: 25, completed: true });
check('save focus session', r.status === 201);
r = await call('POST', '/focus', { plannedMinutes: 0, actualMinutes: 0 });
check('invalid duration rejected', r.status === 400);
r = await call('GET', '/focus/summary');
check('summary counts 1 session / 25 min / streak 1', r.data.today.sessions === 1 && r.data.today.minutes === 25 && r.data.streak === 1, JSON.stringify(r.data));

// ---- reminders + notifications ----
r = await call('POST', '/reminders', { title: 'Call mentor', date: today, time: '00:00' });
check('create reminder', r.status === 201);
r = await call('POST', '/reminders', { title: '', date: today, time: '00:00' });
check('empty title rejected', r.status === 400);
r = await call('GET', '/notifications');
const n = r.data.notifications || [];
check('due reminder creates a notification', n.some((x) => x.type === 'reminder' && x.title === 'Call mentor'), JSON.stringify(r.data));
r = await call('DELETE', `/notifications/${n[0].id}`);
r = await call('GET', '/notifications');
check('deleted notification does not come back', !r.data.notifications.some((x) => x.id === n[0].id));

// ---- Module 3: settings, dashboard, analytics, achievements ----
r = await call('GET', '/settings');
check('settings have defaults', r.status === 200 && r.data.settings?.dailyTaskGoal === 3 && r.data.settings?.notify?.tasks === true, JSON.stringify(r.data));
r = await call('PUT', '/settings', { dailyTaskGoal: 5, notify: { goals: false } });
check('save settings', r.status === 200 && r.data.settings?.dailyTaskGoal === 5 && r.data.settings?.notify?.goals === false && r.data.settings?.notify?.tasks === true, JSON.stringify(r.data));
r = await call('PUT', '/settings', { focusMinutes: 0 });
check('invalid focus duration rejected', r.status === 400);
r = await call('GET', '/dashboard');
check('dashboard: 1 task done today, 25 focus minutes, a score', r.status === 200 && r.data.tasks?.completedToday === 1 && r.data.focus?.minutes === 25 && typeof r.data.score?.score === 'number', JSON.stringify(r.data).slice(0, 300));
check('dashboard uses the new daily goal', r.data.targets?.dailyTaskGoal === 5);
r = await call('GET', '/analytics?period=weekly');
check('weekly analytics: 8 weeks, this week has 1 task and 25 minutes', r.status === 200 && r.data.buckets?.length === 8 && r.data.current?.tasksCompleted === 1 && r.data.current?.focusMinutes === 25, JSON.stringify(r.data.current));
r = await call('GET', '/analytics?period=daily');
const days = r.data.buckets?.length;
r = await call('GET', '/analytics?period=monthly');
check('daily shows 14 days and monthly shows 6 months', days === 14 && r.data.buckets?.length === 6);
r = await call('GET', '/achievements');
const got = (key) => r.data.achievements?.find((x) => x.key === key)?.unlocked === true;
check('achievements unlocked: first task, first focus, first habit, first goal', r.status === 200 && got('tasks-1') && got('focus-1') && got('habit-1') && got('goal-1'), JSON.stringify(r.data.history));
check('task streak is 1 day', r.data.streaks?.tasks?.current === 1);
const first = r.data.history?.length;
r = await call('GET', '/achievements');
check('achievement history is kept and nothing is unlocked twice', r.data.history?.length === first && r.data.newlyUnlocked?.length === 0 && Boolean(r.data.history?.[0]?.unlockedAt));

// ---- other user cannot see my data ----
const mine = token;
r = await call('POST', '/auth/register', { name: 'Other', email: `other${Date.now()}@test.com`, password: 'secret123' });
token = r.data.token;
r = await call('GET', '/goals?archived=true');
check('another user sees no goals', r.data.goals.length === 0);
r = await call('DELETE', `/goals/${goal.id}`);
check('another user cannot delete my goal', r.status === 404);
token = mine;

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
