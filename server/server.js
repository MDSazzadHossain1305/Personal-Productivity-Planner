
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Sequelize, DataTypes, Op } = require("sequelize");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const sequelize = new Sequelize(
  process.env.DB_NAME || "personal_productivity_planner",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
  }
);

// ===================== DATABASE MODELS =====================

// 1. Calendar Events
const Event = sequelize.define("Event", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  allDay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

// 2. Habits
const Habit = sequelize.define("Habit", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  frequency: {
    type: DataTypes.ENUM("daily", "weekly"),
    defaultValue: "daily",
  },
  targetPerWeek: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

// Habit completion history
const HabitLog = sequelize.define(
  "HabitLog",
  {
    completedOn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["HabitId", "completedOn"],
      },
    ],
  }
);

Habit.hasMany(HabitLog, { onDelete: "CASCADE" });
HabitLog.belongsTo(Habit);

// 3. Tasks for Dashboard
const Task = sequelize.define("Task", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("pending", "completed"),
    defaultValue: "pending",
  },
});

// 4. Profile and Settings
const UserSetting = sequelize.define("UserSetting", {
  userId: {
    type: DataTypes.INTEGER,
    unique: true,
    defaultValue: 1,
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: "My Profile",
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  dailyGoal: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
  pomodoroMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 25,
  },
  breakMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
});

// ===================== HELPER FUNCTIONS =====================

function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

function validId(id) {
  return Number.isInteger(Number(id)) && Number(id) > 0;
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ===================== HOME AND HEALTH =====================

app.get("/", (req, res) => {
  res.json({
    message: "Personal Productivity Planner API is running!",
  });
});

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    await sequelize.authenticate();

    res.json({
      message: "Backend is running",
      database: "connected",
    });
  })
);

// ===================== CALENDAR & SCHEDULING =====================

// Get all events; optional date filters: ?from=...&to=...
app.get(
  "/api/events",
  asyncHandler(async (req, res) => {
    const where = {};

    if (req.query.from || req.query.to) {
      where.startAt = {};

      if (req.query.from) {
        where.startAt[Op.gte] = new Date(req.query.from);
      }

      if (req.query.to) {
        where.startAt[Op.lte] = new Date(req.query.to);
      }
    }

    const events = await Event.findAll({
      where,
      order: [["startAt", "ASC"]],
    });

    res.json(events);
  })
);

// Create event
app.post(
  "/api/events",
  asyncHandler(async (req, res) => {
    const { title, description, startAt, endAt, allDay } = req.body;

    if (!title || !String(title).trim() || !startAt) {
      return res.status(400).json({
        message: "Event title and startAt are required",
      });
    }

    const event = await Event.create({
      title: String(title).trim(),
      description: description || "",
      startAt,
      endAt: endAt || null,
      allDay: Boolean(allDay),
    });

    res.status(201).json(event);
  })
);

// Edit event
app.put(
  "/api/events/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const allowed = ["title", "description", "startAt", "endAt", "allDay"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await event.update(updates);
    res.json(event);
  })
);

// Delete event
app.delete(
  "/api/events/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await event.destroy();
    res.json({ message: "Event deleted successfully" });
  })
);

// ===================== HABIT TRACKER =====================

// Get habits and history
app.get(
  "/api/habits",
  asyncHandler(async (req, res) => {
    const habits = await Habit.findAll({
      include: [{ model: HabitLog }],
      order: [["createdAt", "DESC"]],
    });

    res.json(habits);
  })
);

// Create habit
app.post(
  "/api/habits",
  asyncHandler(async (req, res) => {
    const { title, description, frequency, targetPerWeek } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Habit title is required" });
    }

    if (
      frequency !== undefined &&
      !["daily", "weekly"].includes(frequency)
    ) {
      return res.status(400).json({
        message: "Frequency must be daily or weekly",
      });
    }

    const habit = await Habit.create({
      title: String(title).trim(),
      description: description || "",
      frequency: frequency || "daily",
      targetPerWeek: targetPerWeek ?? 7,
    });

    res.status(201).json(habit);
  })
);

// Edit habit
app.put(
  "/api/habits/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid habit ID" });
    }

    const habit = await Habit.findByPk(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const allowed = [
      "title",
      "description",
      "frequency",
      "targetPerWeek",
      "active",
    ];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await habit.update(updates);
    res.json(habit);
  })
);

// Mark habit completed for a date
app.post(
  "/api/habits/:id/complete",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid habit ID" });
    }

    const habit = await Habit.findByPk(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const completedOn = req.body.date || todayString();

    const [log, created] = await HabitLog.findOrCreate({
      where: {
        HabitId: habit.id,
        completedOn,
      },
      defaults: {
        HabitId: habit.id,
        completedOn,
      },
    });

    res.status(created ? 201 : 200).json({
      message: created
        ? "Habit marked completed"
        : "Habit already completed for this date",
      log,
    });
  })
);

// Undo completion for a date
app.delete(
  "/api/habits/:id/complete",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid habit ID" });
    }

    const deleted = await HabitLog.destroy({
      where: {
        HabitId: Number(req.params.id),
        completedOn: req.query.date || todayString(),
      },
    });

    res.json({
      message: deleted
        ? "Habit completion removed"
        : "No completion found for this date",
    });
  })
);

// Current streak
app.get(
  "/api/habits/:id/streak",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid habit ID" });
    }

    const habit = await Habit.findByPk(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const logs = await HabitLog.findAll({
      where: { HabitId: habit.id },
      attributes: ["completedOn"],
      order: [["completedOn", "DESC"]],
    });

    const dates = new Set(logs.map((log) => log.completedOn));
    const today = new Date(`${todayString()}T12:00:00`);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let cursor = dates.has(todayString()) ? today : yesterday;
    let streak = 0;

    while (true) {
      const key =
        `${cursor.getFullYear()}-` +
        `${String(cursor.getMonth() + 1).padStart(2, "0")}-` +
        `${String(cursor.getDate()).padStart(2, "0")}`;

      if (!dates.has(key)) break;

      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    res.json({
      habitId: habit.id,
      title: habit.title,
      currentStreak: streak,
      completedDates: [...dates],
    });
  })
);

// Delete habit and history
app.delete(
  "/api/habits/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid habit ID" });
    }

    const habit = await Habit.findByPk(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    await sequelize.transaction(async (transaction) => {
      await HabitLog.destroy({
        where: { HabitId: habit.id },
        transaction,
      });

      await habit.destroy({ transaction });
    });

    res.json({ message: "Habit deleted successfully" });
  })
);

// ===================== TASKS & DASHBOARD =====================

// Get tasks; optional filters: ?date=YYYY-MM-DD&status=pending
app.get(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const where = {};

    if (req.query.date) where.dueDate = req.query.date;
    if (req.query.status) where.status = req.query.status;

    const tasks = await Task.findAll({
      where,
      order: [["dueDate", "ASC"], ["createdAt", "DESC"]],
    });

    res.json(tasks);
  })
);

// Create task
app.post(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const { title, description, dueDate } = req.body;

    if (!title || !String(title).trim() || !dueDate) {
      return res.status(400).json({
        message: "Task title and dueDate are required",
      });
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: description || "",
      dueDate,
    });

    res.status(201).json(task);
  })
);

// Edit task or mark it completed
app.put(
  "/api/tasks/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const allowed = ["title", "description", "dueDate", "status"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await task.update(updates);
    res.json(task);
  })
);

// Delete task
app.delete(
  "/api/tasks/:id",
  asyncHandler(async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.destroy();
    res.json({ message: "Task deleted successfully" });
  })
);

// Dashboard summary
app.get(
  "/api/dashboard",
  asyncHandler(async (req, res) => {
    const today = todayString();
    const now = new Date();

    const [todayTasks, upcomingEvents, habits, settings] =
      await Promise.all([
        Task.findAll({
          where: { dueDate: today },
          order: [["createdAt", "DESC"]],
        }),
        Event.findAll({
          where: { startAt: { [Op.gte]: now } },
          order: [["startAt", "ASC"]],
          limit: 5,
        }),
        Habit.findAll({
          where: { active: true },
          include: [{
            model: HabitLog,
            required: false,
            where: { completedOn: today },
          }],
        }),
        UserSetting.findOne({ where: { userId: 1 } }),
      ]);

    const completed = todayTasks.filter(
      (task) => task.status === "completed"
    ).length;

    const pending = todayTasks.filter(
      (task) => task.status === "pending"
    ).length;

    const completedHabits = habits.filter(
      (habit) => habit.HabitLogs && habit.HabitLogs.length > 0
    ).length;

    res.json({
      date: today,
      tasks: {
        total: todayTasks.length,
        completed,
        pending,
        items: todayTasks,
      },
      upcomingEvents,
      habits: {
        total: habits.length,
        completedToday: completedHabits,
        remainingToday: habits.length - completedHabits,
        items: habits,
      },
      dailyGoal: settings ? settings.dailyGoal : 5,
    });
  })
);

// ===================== SETTINGS & PROFILE =====================

// Read settings
app.get(
  "/api/settings",
  asyncHandler(async (req, res) => {
    const [settings] = await UserSetting.findOrCreate({
      where: { userId: 1 },
      defaults: { userId: 1 },
    });

    res.json(settings);
  })
);

// Update profile and preferences
app.put(
  "/api/settings",
  asyncHandler(async (req, res) => {
    const allowed = [
      "name",
      "email",
      "notificationsEnabled",
      "dailyGoal",
      "pomodoroMinutes",
      "breakMinutes",
    ];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [settings] = await UserSetting.findOrCreate({
      where: { userId: 1 },
      defaults: { userId: 1 },
    });

    await settings.update(updates);

    res.json({
      message: "Settings updated successfully",
      settings,
    });
  })
);

// ===================== ERROR HANDLING =====================

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "This record already exists",
    });
  }

  res.status(500).json({
    message: "Server error",
    error: err.message,
  });
});

// ===================== START SERVER =====================

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected successfully.");

    await sequelize.sync({ alter: true });
    console.log("Database tables are ready.");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exitCode = 1;
  }
}

startServer();
