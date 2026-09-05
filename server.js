const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Swagger JSDoc Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevPulse Intelligence & Telemetry API',
      version: '1.0.0',
      description: 'REST API powering developer velocity tracking, Jira-style task lifecycles, and user telemetry.',
    },
    servers: [{ url: 'http://localhost:5000' }],
  },
  apis: ['./server.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// In-Memory Data Stores
let users = [
  { id: 1, name: "Palak Lodam", role: "Full Stack Developer", email: "palak@example.com", velocity: 96 }
];

let projects = [
  { id: 1, name: "Dev Productivity Dashboard", status: "Active", progress: 75, month: "Aug" },
  { id: 2, name: "REST API Service", status: "In Progress", progress: 30, month: "Aug" }
];

let tasks = [
  { id: 1, title: "Build Frontend UI", status: "done", priority: "High" },
  { id: 2, title: "Develop REST API", status: "in-progress", priority: "High" },
  { id: 3, title: "Setup Telemetry Docs", status: "todo", priority: "Medium" }
];

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Retrieve developer profiles and velocity metrics
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/users', (req, res) => res.status(200).json(users));

/**
 * @openapi
 * /api/projects:
 *   get:
 *     summary: Retrieve workspace projects
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/projects', (req, res) => res.status(200).json(projects));

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: Get all lifecycle tasks
 *   post:
 *     summary: Create a new task
 */
app.get('/api/tasks', (req, res) => res.status(200).json(tasks));

app.post('/api/tasks', (req, res) => {
  const { title, priority } = req.body || {};
  if (!title){
      return res.status(400).json({ error: "Task title is required" });
  }
  const newTask = { id: tasks.length + 1, title, status: 'todo', priority: priority || 'Medium' };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

/**
 * @openapi
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task lifecycle status (todo -> in-progress -> done)
 */
app.patch('/api/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const task = tasks.find(t => t.id === parseInt(id));
  
  if (!task) return res.status(404).json({ error: "Task not found" });
  
  task.status = status;
  res.status(200).json({ message: "Status updated successfully", task });
});

app.listen(PORT, () => {
  console.log(`DevPulse API running on port ${PORT}`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api/docs`);
});