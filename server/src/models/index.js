import sequelize from '../config/db.js';
import User from './User.js';
import Task from './Task.js';
import Event from './Event.js';
import Note from './Note.js';
 
// One user has many tasks, events and notes
for (const Model of [Task, Event, Note]) {
  User.hasMany(Model, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Model.belongsTo(User, { foreignKey: 'userId' });
}
 
export { sequelize, User, Task, Event, Note };
