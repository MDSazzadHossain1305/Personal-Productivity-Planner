import { useState } from "react";

function TaskItem({ task, onEdit, onDelete, onStatusChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [deadline, setDeadline] = useState(task.deadline);
  const [priority, setPriority] = useState(task.priority);

  function handleSave() {
    if (!title.trim()) return;
    onEdit(task.id, { title: title.trim(), deadline, priority });
    setIsEditing(false);
  }

  function handleCancel() {
    setTitle(task.title);
    setDeadline(task.deadline);
    setPriority(task.priority);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="task-card">
        <div className="task-info">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <button type="button" onClick={handleSave}>Save</button>
        <button type="button" onClick={handleCancel}>Cancel</button>
      </div>
    );
  }

  return (
    <div className="task-card">
      <div className="task-info">
        <h3>{task.title}</h3>
        <p>Deadline: {task.deadline || "Not set"}</p>
        <p>Priority: {task.priority}</p>
      </div>

      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
      >
        <option value="Todo">Todo</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
      </select>

      <button type="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>

      <button type="button" onClick={() => onDelete(task.id)}>
        Delete
      </button>
    </div>
  );
}

export default TaskItem;


