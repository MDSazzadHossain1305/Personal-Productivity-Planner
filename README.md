# Kaajkormo: Personal Productivity Planner

SE331 Capstone Project, Group 04 (Lab Section D1).

| Member | Features |
|---|---|
| MD Sazzad Hossain | Authentication and profile, Notes, Focus / Pomodoro timer, Productivity analytics |
| Raiba Rahman Opshori | Tasks, Goals and milestones, Reminders and notifications, Streaks and achievements |
| Ajassum Rubaiya Arin | Calendar, Habit tracker, Productivity dashboard, Settings and preferences |

## Stack

React + Vite + Tailwind CSS (client), Node.js + Express (server), MongoDB Atlas + Mongoose (database), JWT login.

## Run it on your computer

1. Copy `server/.env.example` to `server/.env` and fill in `MONGODB_URI` and `JWT_SECRET`.
2. `npm install --prefix server` and `npm install --prefix client`
3. Terminal 1: `npm run dev --prefix server`
4. Terminal 2: `npm run dev --prefix client`
5. Open http://localhost:5173

## Credits

The design is based on the Grunge template by Jess Gaspar (MIT licence). See `client/GRUNGE-LICENSE.txt`.
