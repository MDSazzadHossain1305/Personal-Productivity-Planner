const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Personal Productivity Planner Backend is running!");
});

// Test API
app.get("/api/tasks", (req, res) => {
  res.json({
    message: "Task API is working!",
    tasks: [],
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
