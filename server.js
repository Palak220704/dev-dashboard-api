const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Data Store
let users = [
  { id: 1, name: "Palak Lodam", role: "Full Stack Developer", email: "palak@example.com" }
];

let projects = [
  { id: 1, name: "Dev Productivity Dashboard", status: "Active", progress: 75 },
  { id: 2, name: "REST API Service", status: "In Progress", progress: 30 }
];

let tasks = [
  { id: 1, title: "Build Frontend UI", status: "Done", priority: "High", projectId: 1 },
  { id: 2, title: "Develop REST API", status: "In-Progress", priority: "High", projectId: 2 },
  { id: 3, title: "Write API Documentation", status: "Todo", priority: "Medium", projectId: 2 }
];

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "OK", message: "DevPulse API Server Active" });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.status(200).json({
    totalUsers: users.length,
    totalProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === "Done").length
  });
});

app.get('/api/users', (req, res) => res.status(200).json(users));
app.get('/api/projects', (req, res) => res.status(200).json(projects));

app.get('/api/tasks', (req, res) => {
  const { status, priority } = req.query;
  let filtered = [...tasks];
  if (status) filtered = filtered.filter(t => t.status.toLowerCase() === status.toLowerCase());
  if (priority) filtered = filtered.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
  res.status(200).json(filtered);
});

app.post('/api/tasks', (req, res) => {
  const { title, priority, projectId } = req.body;
  if (!title) return res.status(400).json({ error: "Task title is required" });

  const newTask = {
    id: tasks.length + 1,
    title,
    status: "Todo",
    priority: priority || "Medium",
    projectId: projectId || 1
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.patch('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { status, priority, title } = req.body;
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (title) task.title = title;

  res.status(200).json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  tasks.splice(index, 1);
  res.status(200).json({ message: `Task ${taskId} deleted successfully` });
});

app.listen(PORT, () => {
  console.log(`🚀 DevPulse REST API Server running on port ${PORT}`);
});