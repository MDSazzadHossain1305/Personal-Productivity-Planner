import 'dotenv/config';
import app from './app.js';
import { sequelize } from './models/index.js';
import { ensureDatabase } from './config/db.js';
 
const PORT = process.env.PORT || 5000;
 
async function start() {
  try {
    await ensureDatabase();
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // creates / updates tables from the models
    console.log('MySQL connected, tables synced');
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}
 
start();
