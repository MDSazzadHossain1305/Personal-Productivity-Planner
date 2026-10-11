import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
 
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING(30), defaultValue: '' },
  bio: { type: DataTypes.TEXT, defaultValue: '' },
});
 
// Never send the password hash to the client.
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.passwordHash;
  return values;
};
 
export default User;
