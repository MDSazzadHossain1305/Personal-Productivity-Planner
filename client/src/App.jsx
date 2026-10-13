import { useState } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import "./App.css";

function App() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");

  // Add a new task
  function addTask(taskData) {
    const newTask = {
      id: Date.now(),
      ...taskData,
      status: "Todo",
    };

    setTasks((previous) => [...previous, newTask]);
  }

  // Delete a task
  function deleteTask(id) {
    setTasks((previous) =>
      previous.filter((task) => task.id !== id)
    );
  }

  // Change task status
  function changeStatus(id, status) {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, status } : task
      )
    );
  }
// Edit task
function editTask(id, updates) {
  setTasks((previous) =>
    previous.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    )
  );
}

  // Search tasks
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <h1>Personal Productivity Planner</h1>
      <h2>Task Management</h2>

      {/* Add Task Form */}
      <TaskForm onAddTask={addTask} />

      {/* Search Tasks */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Total Tasks */}
      <p className="total-tasks">
        Total Tasks: {tasks.length}
      </p>

      {/* Task List */}
      <TaskList
        tasks={filteredTasks}
        onEdit={editTask}
        onDelete={deleteTask}
        onStatusChange={changeStatus}
      />
    </div>
  );
}

export default App;

