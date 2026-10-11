import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
 
const Task = sequelize.define('Task', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  type: { type: DataTypes.ENUM('daily', 'long_term'), defaultValue: 'daily' },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('todo', 'in_progress', 'completed'), defaultValue: 'todo' },
  deadline: { type: DataTypes.DATEONLY, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
});
 
export default Task;
