import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
 
const Event = sequelize.define('Event', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: true },
  // minutes before the event to remind the user (null = no reminder)
  reminderMinutes: { type: DataTypes.INTEGER, allowNull: true },
});
 
export default Event;
