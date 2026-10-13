import { useEffect, useState } from "react";
import "./App.css";

/* ---------- Sample data (used only the first time the app opens) ---------- */

const initialTasks = [
  { id: 1, title: "Complete project documentation", time: "09:00 AM", done: false, tag: "Study" },
  { id: 2, title: "Review lecture notes", time: "11:30 AM", done: true, tag: "University" },
  { id: 3, title: "Practice React components", time: "02:00 PM", done: false, tag: "Coding" },
  { id: 4, title: "Plan tomorrow's schedule", time: "05:00 PM", done: false, tag: "Personal" },
];

const initialHabits = [
  { id: 1, title: "Drink 8 glasses of water", icon: "💧", done: true },
  { id: 2, title: "Read for 20 minutes", icon: "📚", done: false },
  { id: 3, title: "Exercise", icon: "🏃", done: false },
  { id: 4, title: "Sleep on time", icon: "🌙", done: true },
];

const initialEvents = [
  { id: 1, title: "Software Engineering Class", date: "2026-10-14", time: "10:00", description: "University lecture" },
  { id: 2, title: "Project Work", date: "2026-10-15", time: "14:00", description: "Work on project modules" },
];

const menuItems = [
  { name: "Dashboard", icon: "▦" },
  { name: "Calendar", icon: "▣" },
  { name: "Habits", icon: "◉" },
  { name: "Settings", icon: "⚙" },
];

const tagOptions = ["Personal", "Study", "University", "Coding", "Work"];

const pageSubtitles = {
  Dashboard: "Here's what's happening with your day.",
  Calendar: "Manage your schedule and upcoming events.",
  Habits: "Build consistency, one day at a time.",
  Settings: "Customize your productivity workspace.",
};

/* ---------- Helpers ---------- */

// Today's date as "YYYY-MM-DD" in the user's LOCAL time zone.
// (toISOString() uses UTC, which would give yesterday's date before 6 AM in Dhaka.)
function todayKey() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function parseDate(dateString) {
  return new Date(dateString + "T00:00:00");
}

function formatDate(dateString) {
  return parseDate(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// "14:00" -> "02:00 PM"
function formatTime(time) {
  if (!time) return "No time set";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function sortEvents(list) {
  return [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

// Like useState, but the value is saved in localStorage so it survives a page refresh.
function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage might be full or blocked; the app still works without saving.
    }
  }, [key, value]);

  return [value, setValue];
}

/* ---------- Small components ---------- */

function StatCard({ icon, label, value, note, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <p className="stat-label">{label}</p>
      <h2>{value}</h2>
      <p className="stat-note">{note}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EventRow({ event, showFullDate, onDelete }) {
  const date = parseDate(event.date);
  return (
    <div className="event-row">
      <div className="event-date-box">
        <strong>{date.getDate()}</strong>
        <span>{date.toLocaleDateString("en-US", { month: "short" })}</span>
      </div>
      <div className="event-info">
        <strong>{event.title}</strong>
        <span>
          {showFullDate ? `${event.description} · ${formatDate(event.date)}` : event.description}
        </span>
      </div>
      <span className="event-time">{formatTime(event.time)}</span>
      {onDelete && (
        <button
          className="delete-button"
          onClick={() => onDelete(event.id)}
          aria-label={`Delete ${event.title}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ---------- App ---------- */

function App() {
  const today = todayKey();

  // Saved data (survives refresh)
  const [tasks, setTasks] = useStoredState("daylight-tasks", initialTasks);
  const [habits, setHabits] = useStoredState("daylight-habits", initialHabits);
  const [events, setEvents] = useStoredState("daylight-events", initialEvents);
  const [habitDay, setHabitDay] = useStoredState("daylight-habit-day", today);
  const [userName, setUserName] = useStoredState("daylight-user-name", "Arin");
  const [dailyGoal, setDailyGoal] = useStoredState("daylight-daily-goal", "5");
  const [focusMinutes, setFocusMinutes] = useStoredState("daylight-focus-minutes", "25");

  // Temporary UI state
  const [page, setPage] = useState("Dashboard");
  const [taskInput, setTaskInput] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskTag, setTaskTag] = useState("Personal");
  const [habitInput, setHabitInput] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [eventTime, setEventTime] = useState("12:00");
  const [eventDescription, setEventDescription] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [notice, setNotice] = useState("");

  // Reset habit check marks when a new day starts
  useEffect(() => {
    if (habitDay !== today) {
      setHabits((old) => old.map((habit) => ({ ...habit, done: false })));
      setHabitDay(today);
    }
  }, [habitDay, today, setHabits, setHabitDay]);

  // Hide the notice automatically after 3 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Derived values
  const completedTasks = tasks.filter((task) => task.done).length;
  const completedHabits = habits.filter((habit) => habit.done).length;
  const taskProgress = percent(completedTasks, tasks.length);
  const habitProgress = percent(completedHabits, habits.length);
  const goal = Math.max(1, Number(dailyGoal) || 1);
  const goalReached = completedTasks >= goal;
  const sortedEvents = sortEvents(events);
  const upcomingEvents = sortedEvents.filter((event) => event.date >= today).slice(0, 3);

  /* ----- Tasks ----- */

  function toggleTask(id) {
    setTasks((old) => old.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function addTask(e) {
    e.preventDefault();
    if (!taskInput.trim()) return;
    setTasks((old) => [
      ...old,
      {
        id: Date.now(),
        title: taskInput.trim(),
        time: formatTime(taskTime),
        done: false,
        tag: taskTag,
      },
    ]);
    setTaskInput("");
    setTaskTime("");
    setTaskTag("Personal");
    setShowTaskForm(false);
    setNotice("Task added successfully!");
  }

  function deleteTask(id) {
    setTasks((old) => old.filter((task) => task.id !== id));
    setNotice("Task deleted.");
  }

  /* ----- Habits ----- */

  function toggleHabit(id) {
    setHabits((old) => old.map((habit) => (habit.id === id ? { ...habit, done: !habit.done } : habit)));
  }

  function addHabit(e) {
    e.preventDefault();
    if (!habitInput.trim()) return;
    setHabits((old) => [...old, { id: Date.now(), title: habitInput.trim(), icon: "✨", done: false }]);
    setHabitInput("");
    setNotice("Habit added successfully!");
  }

  function deleteHabit(id) {
    setHabits((old) => old.filter((habit) => habit.id !== id));
    setNotice("Habit removed.");
  }

  /* ----- Events ----- */

  function addEvent(e) {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    setEvents((old) => [
      ...old,
      {
        id: Date.now(),
        title: eventTitle.trim(),
        date: eventDate,
        time: eventTime,
        description: eventDescription.trim() || "No description",
      },
    ]);
    setEventTitle("");
    setEventDescription("");
    setEventDate(today);
    setShowEventForm(false);
    setNotice("Event added successfully!");
  }

  function deleteEvent(id) {
    setEvents((old) => old.filter((event) => event.id !== id));
    setNotice("Event deleted.");
  }

  /* ----- Pages ----- */

  function renderDashboard() {
    return (
      <>
        <div className="welcome-banner">
          <div>
            <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
            <h2>Make today count, {userName || "there"}! ✨</h2>
            <p>A little progress each day adds up to big results.</p>
          </div>
          <div className="banner-art" aria-hidden="true">☀️</div>
        </div>

        <div className="stats-grid">
          <StatCard icon="✓" label="Total Tasks" value={tasks.length} note="Your task list" color="purple" />
          <StatCard icon="↗" label="Completed" value={completedTasks} note={`Daily goal: ${goal}`} color="green" />
          <StatCard icon="◷" label="Pending" value={tasks.length - completedTasks} note="Still to do" color="orange" />
          <StatCard icon="✦" label="Habit Progress" value={`${habitProgress}%`} note={`${completedHabits} habits completed`} color="blue" />
        </div>

        <div className="dashboard-grid">
          <section className="panel tasks-panel">
            <SectionTitle
              title="Today's Tasks"
              subtitle="Stay focused on what matters"
              action={
                <button className="small-button" onClick={() => setShowTaskForm(!showTaskForm)}>
                  {showTaskForm ? "Cancel" : "+ Add task"}
                </button>
              }
            />

            {showTaskForm && (
              <form className="inline-form" onSubmit={addTask}>
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="What do you need to do?"
                  aria-label="Task title"
                  autoFocus
                />
                <input
                  type="time"
                  value={taskTime}
                  onChange={(e) => setTaskTime(e.target.value)}
                  aria-label="Task time (optional)"
                />
                <select value={taskTag} onChange={(e) => setTaskTag(e.target.value)} aria-label="Task tag">
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <button className="primary-button" type="submit">Add</button>
              </form>
            )}

            <div className="task-progress">
              <div className="progress-label">
                <span>Daily progress</span>
                <strong>{taskProgress}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${taskProgress}%` }} />
              </div>
              <p className="muted-text">
                {goalReached
                  ? `Daily goal reached: ${completedTasks} of ${goal} tasks done 🎉`
                  : `${completedTasks} of ${goal} tasks toward your daily goal`}
              </p>
            </div>

            <div className="task-list">
              {tasks.map((task) => (
                <div className={`task-row ${task.done ? "task-done" : ""}`} key={task.id}>
                  <button
                    className={`check-button ${task.done ? "checked" : ""}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                  <div className="task-info">
                    <strong>{task.title}</strong>
                    <span>{task.time}</span>
                  </div>
                  <span className="task-tag">{task.tag}</span>
                  <button
                    className="delete-button"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {tasks.length === 0 && <p className="empty-state">No tasks yet. Add your first task!</p>}
            </div>
          </section>

          <section className="panel habits-panel">
            <SectionTitle
              title="Daily Habits"
              subtitle="Small steps, big changes"
              action={<button className="text-button" onClick={() => setPage("Habits")}>View all ↗</button>}
            />
            <div className="habit-summary">
              <div className="habit-ring" style={{ "--progress": `${habitProgress}%` }}>
                <div className="habit-ring-inner">
                  <strong>{completedHabits}/{habits.length}</strong>
                  <span>completed</span>
                </div>
              </div>
              <div>
                <strong className="summary-heading">
                  {habits.length && completedHabits === habits.length ? "All habits done!" : "You're doing great!"}
                </strong>
                <p className="muted-text">Keep showing up for yourself every day.</p>
              </div>
            </div>
            <div className="mini-habit-list">
              {habits.slice(0, 4).map((habit) => (
                <button className="mini-habit" key={habit.id} onClick={() => toggleHabit(habit.id)}>
                  <span className="habit-emoji">{habit.icon}</span>
                  <span className={habit.done ? "habit-name done-text" : "habit-name"}>{habit.title}</span>
                  <span className={`habit-status ${habit.done ? "status-done" : ""}`}>{habit.done ? "✓" : "+"}</span>
                </button>
              ))}
              {habits.length === 0 && <p className="empty-state">No habits yet.</p>}
            </div>
          </section>
        </div>

        <section className="panel events-panel">
          <SectionTitle
            title="Upcoming Events"
            subtitle="Keep an eye on what's coming next"
            action={
              <button
                className="small-button"
                onClick={() => {
                  setPage("Calendar");
                  setShowEventForm(true);
                }}
              >
                + Add event
              </button>
            }
          />
          <div className="event-list">
            {upcomingEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
            {upcomingEvents.length === 0 && <p className="empty-state">No upcoming events scheduled.</p>}
          </div>
        </section>
      </>
    );
  }

  function renderCalendar() {
    return (
      <section className="panel page-panel">
        <SectionTitle
          title="Calendar & Schedule"
          subtitle="Plan your time and stay organized."
          action={
            <button className="primary-button" onClick={() => setShowEventForm(!showEventForm)}>
              {showEventForm ? "Cancel" : "+ New event"}
            </button>
          }
        />

        {showEventForm && (
          <form className="event-form" onSubmit={addEvent}>
            <label>
              Event title
              <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Project meeting" required />
            </label>
            <div className="form-two-columns">
              <label>
                Date
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
              </label>
              <label>
                Time
                <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} required />
              </label>
            </div>
            <label>
              Description
              <input value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} placeholder="Add a short note (optional)" />
            </label>
            <button className="primary-button" type="submit">Save event</button>
          </form>
        )}

        <div className="calendar-heading">
          <span>📅</span>
          <div>
            <h3>Your scheduled events</h3>
            <p>{events.length} {events.length === 1 ? "event" : "events"} in your list</p>
          </div>
        </div>

        <div className="event-list calendar-event-list">
          {sortedEvents.map((event) => (
            <EventRow key={event.id} event={event} showFullDate onDelete={deleteEvent} />
          ))}
          {events.length === 0 && <p className="empty-state">No events yet. Create one to get started.</p>}
        </div>
      </section>
    );
  }

  function renderHabits() {
    return (
      <section className="panel page-panel">
        <SectionTitle title="Habit Tracker" subtitle="Build routines that help you grow. Check marks reset every day." />

        <form className="inline-form habit-add-form" onSubmit={addHabit}>
          <input
            value={habitInput}
            onChange={(e) => setHabitInput(e.target.value)}
            placeholder="Add a new daily habit..."
            aria-label="New habit"
          />
          <button className="primary-button" type="submit">+ Add habit</button>
        </form>

        <div className="habit-page-summary">
          <div>
            <span>Today's progress</span>
            <strong>{completedHabits} of {habits.length} completed</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${habitProgress}%` }} />
          </div>
        </div>

        <div className="habit-cards">
          {habits.map((habit) => (
            <div className={`habit-card ${habit.done ? "habit-card-done" : ""}`} key={habit.id}>
              <span className="habit-card-icon">{habit.icon}</span>
              <strong>{habit.title}</strong>
              <p>{habit.done ? "Great job! Completed today." : "One small step today."}</p>
              <button className={habit.done ? "completed-button" : "primary-button"} onClick={() => toggleHabit(habit.id)}>
                {habit.done ? "✓ Completed" : "Mark complete"}
              </button>
              <button className="text-button" onClick={() => deleteHabit(habit.id)}>
                Remove
              </button>
            </div>
          ))}
          {habits.length === 0 && <p className="empty-state">No habits yet. Add one above.</p>}
        </div>
      </section>
    );
  }

  function renderSettings() {
    return (
      <section className="panel page-panel settings-panel">
        <SectionTitle title="Settings & Preferences" subtitle="Make your workspace feel like yours. Changes save automatically." />
        <form
          className="settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("Your preferences are saved.");
          }}
        >
          <div className="settings-section-heading">
            <span>👤</span>
            <div>
              <h3>Profile</h3>
              <p>Personalize your account</p>
            </div>
          </div>
          <label>
            Display name
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Enter your name" />
          </label>

          <div className="settings-divider" />

          <div className="settings-section-heading">
            <span>🎯</span>
            <div>
              <h3>Daily goals</h3>
              <p>How many tasks you want to finish each day</p>
            </div>
          </div>
          <label>
            Daily task goal
            <input type="number" min="1" max="30" value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} />
          </label>

          <div className="settings-divider" />

          <div className="settings-section-heading">
            <span>⏱️</span>
            <div>
              <h3>Focus timer</h3>
              <p>Set your preferred focus session length</p>
            </div>
          </div>
          <label>
            Focus duration (minutes)
            <select value={focusMinutes} onChange={(e) => setFocusMinutes(e.target.value)}>
              <option value="15">15 minutes</option>
              <option value="25">25 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>

          <button className="primary-button save-settings" type="submit">Save preferences</button>
        </form>
      </section>
    );
  }

  /* ----- Layout ----- */

  const initial = (userName || "A").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <strong>Daylight</strong>
            <span>PRODUCTIVITY PLANNER</span>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? "active" : ""}`}
              onClick={() => {
                setPage(item.name);
                setNotice("");
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {page === item.name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="focus-card">
            <div className="focus-sparkle">✧</div>
            <strong>Stay focused</strong>
            <p>Your focus sessions: {focusMinutes} minutes. Every small step moves you forward.</p>
            <div className="focus-decoration">✦</div>
          </div>
          <div className="profile-row">
            <div className="avatar">{initial}</div>
            <div className="profile-info">
              <strong>{userName || "Your profile"}</strong>
              <span>Personal workspace</span>
            </div>
            <button className="profile-menu" onClick={() => setPage("Settings")} aria-label="Open settings">···</button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-pill">☀️ Make today count</span>
            <div className="top-avatar">{initial}</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="page-kicker">PERSONAL PRODUCTIVITY PLANNER</p>
              <h1>{page}</h1>
              <p className="page-subtitle">{pageSubtitles[page]}</p>
            </div>
            <div className="date-chip">
              <span>📅</span>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>

          {notice && (
            <div className="notice-message" role="status">
              <span>✓</span>
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss message">×</button>
            </div>
          )}

          {page === "Dashboard" && renderDashboard()}
          {page === "Calendar" && renderCalendar()}
          {page === "Habits" && renderHabits()}
          {page === "Settings" && renderSettings()}

          <footer className="app-footer">
            <span>✦</span> Make space for what matters.
            <span className="footer-right">Daylight Planner · Your day, your way</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
