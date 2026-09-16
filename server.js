require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { GoogleGenAI } = require('@google/genai')
const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')
const { prisma } = require('./prisma.js')

const app = express()
app.use(cors())
app.use(express.json())

// ----------------- SWAGGER CONFIGURATION ----------------- //
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevPulse API Documentation',
      version: '1.0.0',
      description: 'REST API documentation for DevPulse OS',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      {
        url: 'https://dev-dashboard-api-8y1k.onrender.com',
        description: 'Production Render Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server.js'],
}

const swaggerDocs = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-12345'
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Middleware to authenticate JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Access token required' })

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' })
    req.user = user
    next()
  })
}

// ----------------- AUTH ENDPOINTS ----------------- //

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation or existing user error
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    })

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' })
    res.status(201).json({ message: 'User registered successfully', token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       400:
 *         description: Invalid credentials
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'User not found' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' })

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ----------------- PROJECTS ENDPOINTS ----------------- //

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Fetch all projects for the authenticated user
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user projects
 *       401:
 *         description: Unauthorized
 */
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: { tasks: true },
    })
    res.json(projects)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               techStack:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created
 */
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { title, name, description, category, techStack, priority } = req.body
    const projectTitle = title || name || 'New Project'
    
    const project = await prisma.project.create({
      data: {
        title: projectTitle,
        description: description || `Category: ${category || 'General'} | Tech: ${Array.isArray(techStack) ? techStack.join(', ') : techStack || 'N/A'}`,
        userId: req.user.userId,
      },
    })
    res.status(201).json(project)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 */
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ----------------- TASKS ENDPOINTS ----------------- //

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Fetch all tasks for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user tasks
 */
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.userId },
    })
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *               dueDate:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 */
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, dueDate, projectId } = req.body
    const task = await prisma.task.create({
      data: {
        title: title || 'Untitled Task',
        description: description || '',
        priority: priority ? priority.toUpperCase() : 'MEDIUM',
        dueDate: dueDate && !isNaN(Date.parse(dueDate)) ? new Date(dueDate) : null,
        projectId: projectId || null,
        userId: req.user.userId,
      },
    })
    res.status(201).json(task)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task details or status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
const handleTaskUpdate = async (req, res) => {
  try {
    const { status, title, description, priority } = req.body
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { 
        ...(status && { status }), 
        ...(title && { title }), 
        ...(description && { description }), 
        ...(priority && { priority: priority.toUpperCase() }) 
      },
    })
    res.json(task)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

app.patch('/api/tasks/:id', authenticateToken, handleTaskUpdate)
app.put('/api/tasks/:id', authenticateToken, handleTaskUpdate)

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ----------------- AI FEATURE ENDPOINT ----------------- //

/**
 * @swagger
 * /api/ai/breakdown:
 *   post:
 *     summary: AI Task Breakdown & Priority Suggestion
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskGoal]
 *             properties:
 *               taskGoal:
 *                 type: string
 *                 example: "Implement OAuth2 login provider with Google"
 *     responses:
 *       200:
 *         description: AI generated sub-tasks array
 */
app.post('/api/ai/breakdown', authenticateToken, async (req, res) => {
  try {
    const { taskGoal } = req.body
    if (!taskGoal) return res.status(400).json({ error: 'taskGoal is required' })

    const prompt = `Break down this developer goal into 3 concrete, short title tasks:\nGoal: "${taskGoal}"\nReturn ONLY a raw JSON array of 3 string task titles, like: ["Task 1", "Task 2", "Task 3"].`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const textResult = response.text || ''
    let parsedTasks = []

    try {
      const cleaned = textResult.replace(/```json|```/g, '').trim()
      parsedTasks = JSON.parse(cleaned)
    } catch {
      parsedTasks = [
        `Analyze specifications for ${taskGoal}`,
        `Implement main module & API handling`,
        `Write test suite & verify deployment`
      ]
    }

    res.json({ subtasks: parsedTasks, aiSuggestion: textResult })
  } catch (error) {
    res.status(500).json({ 
      subtasks: [
        `Analyze specifications for ${req.body.taskGoal || 'Feature'}`,
        `Implement main module & API handling`,
        `Write test suite & verify deployment`
      ],
      error: 'AI generation fallback engaged', 
      details: error.message 
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})