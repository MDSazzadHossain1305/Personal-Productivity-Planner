import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
 
const Note = sequelize.define('Note', {
  title: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'Untitled' },
  content: { type: DataTypes.TEXT, defaultValue: '' },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isArchived: { type: DataTypes.BOOLEAN, defaultValue: false },
});
 
export default Note;
