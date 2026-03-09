import express from "express";
import { Request, Response } from "express";
import pool from "../utils/db";

const router = express.Router();

// Mock task data with time-based scheduling
const inMemoryTasks = [
  {
    id: "1",
    title: "Data Structures Quiz - Trees",
    type: "quiz",
    subject: "Data Structures",
    description:
      "Comprehensive quiz on tree data structures including binary trees, BST, and AVL trees",
    startDate: "2024-12-30",
    startTime: "14:00",
    endDate: "2024-12-30",
    endTime: "15:30",
    duration: 90,
    totalMarks: 50,
    passingScore: 60,
    maxAttempts: 1,
    instructions: [
      "Read all questions carefully before starting",
      "No external resources or calculators allowed",
      "Submit before the time limit expires",
    ],
    createdBy: "faculty123",
    createdAt: "2024-12-20T10:00:00Z",
    notifications: {
      enabled: true,
      reminderTimes: [24, 1], // hours before
      emailNotification: true,
      pushNotification: true,
    },
    proctoring: {
      level: "standard",
      enableWebcam: false,
      enableScreenShare: false,
      lockdownMode: true,
      allowedAttempts: 1,
    },
    targetStudents: ["student1", "student2", "student3"],
  },
  {
    id: "2",
    title: "DBMS Final Test",
    type: "test",
    subject: "DBMS",
    description:
      "Final examination covering all DBMS concepts including SQL, normalization, and transactions",
    startDate: "2024-12-25",
    startTime: "10:00",
    endDate: "2024-12-25",
    endTime: "12:00",
    duration: 120,
    totalMarks: 100,
    passingScore: 50,
    maxAttempts: 1,
    instructions: [
      "Coding questions require proper SQL syntax",
      "Save your work frequently",
      "No collaboration allowed",
    ],
    createdBy: "faculty456",
    createdAt: "2024-12-15T09:00:00Z",
    notifications: {
      enabled: true,
      reminderTimes: [48, 24, 2],
      emailNotification: true,
      pushNotification: true,
    },
    proctoring: {
      level: "strict",
      enableWebcam: true,
      enableScreenShare: true,
      lockdownMode: true,
      allowedAttempts: 1,
    },
    targetStudents: ["student1", "student2", "student3", "student4"],
  },
];

// Student attempts tracking
const studentAttempts = [
  {
    taskId: "1",
    studentId: "student1",
    attempts: 0,
    lastAttemptAt: null,
    scores: [],
  },
  {
    taskId: "2",
    studentId: "student1",
    attempts: 1,
    lastAttemptAt: "2024-12-25T11:30:00Z",
    scores: [85],
  },
];

// Database helper functions
const dbConnectionErrorCodes = new Set([
  "28P01", "ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", 
  "ECONNRESET", "ETIMEDOUT", "3D000", "42P01"
]);

const isDatabaseConnectionError = (error: unknown): boolean => {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  if (dbConnectionErrorCodes.has(code)) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("connection terminated") ||
    message.includes("connect econnrefused") ||
    (message.includes("database") && message.includes("does not exist"))
  );
};

const ensureTasksTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_date TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER,
      total_marks INTEGER,
      passing_score INTEGER,
      max_attempts INTEGER,
      instructions TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      notifications TEXT,
      proctoring TEXT,
      target_students TEXT
    )
  `);
};

// Helper function to get task status based on current time
const getTaskStatus = (task: any) => {
  const now = new Date();
  const startDateTime = new Date(`${task.startDate}T${task.startTime}`);
  const endDateTime = new Date(`${task.endDate}T${task.endTime}`);

  if (now < startDateTime) {
    return "upcoming";
  } else if (now >= startDateTime && now <= endDateTime) {
    return "available";
  } else {
    return "expired";
  }
};

// Helper function to calculate time until start
const getTimeUntilStart = (task: any) => {
  const now = new Date();
  const startDateTime = new Date(`${task.startDate}T${task.startTime}`);
  const diffMs = startDateTime.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
};

// Map DB row to Task object
const mapTaskRow = (row: any) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  subject: row.subject,
  description: row.description,
  startDate: row.start_date,
  startTime: row.start_time,
  endDate: row.end_date,
  endTime: row.end_time,
  duration: row.duration,
  totalMarks: row.total_marks,
  passingScore: row.passing_score,
  maxAttempts: row.max_attempts,
  instructions: row.instructions ? JSON.parse(row.instructions) : [],
  createdBy: row.created_by,
  createdAt: row.created_at,
  notifications: row.notifications ? JSON.parse(row.notifications) : {},
  proctoring: row.proctoring ? JSON.parse(row.proctoring) : {},
  targetStudents: row.target_students ? JSON.parse(row.target_students) : [],
});

// GET /api/faculty/tasks - Get all tasks for faculty (Hybrid: DB with Memory Fallback)
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    let tasksList = [];

    try {
      await ensureTasksTable();
      const result = await pool.query("SELECT * FROM tasks ORDER BY created_at DESC");
      tasksList = result.rows.map(mapTaskRow);
    } catch (error) {
      if (isDatabaseConnectionError(error)) {
        console.warn("[TaskRoutes] DB unavailable, using in-memory data");
        tasksList = inMemoryTasks;
      } else {
        throw error;
      }
    }

    const tasksWithStatus = tasksList.map((task) => ({
      ...task,
      status: getTaskStatus(task),
      timeUntilStart: getTimeUntilStart(task),
    }));

    res.json({
      success: true,
      tasks: tasksWithStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/faculty/tasks - Create new task
router.post("/tasks", async (req: Request, res: Response) => {
  try {
    const taskData = req.body;

    // Validate required fields
    if (!taskData.title || !taskData.startDate || !taskData.startTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, startDate, startTime",
      });
    }

    // Validate start time is in the future
    const startDateTime = new Date(
      `${taskData.startDate}T${taskData.startTime}`,
    );
    if (startDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Start time must be in the future",
      });
    }

    const newTask = {
      id: `task_${Date.now()}`,
      ...taskData,
      createdAt: new Date().toISOString(),
      createdBy: req.body.facultyId || "faculty123", // In real app, get from auth
    };

    try {
      await ensureTasksTable();
      await pool.query(
        `INSERT INTO tasks (
          id, title, type, subject, description, start_date, start_time, 
          end_date, end_time, duration, total_marks, passing_score, 
          max_attempts, instructions, created_by, created_at, 
          notifications, proctoring, target_students
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          newTask.id,
          newTask.title,
          newTask.type,
          newTask.subject,
          newTask.description,
          newTask.startDate,
          newTask.startTime,
          newTask.endDate,
          newTask.endTime,
          newTask.duration,
          newTask.totalMarks,
          newTask.passingScore,
          newTask.maxAttempts,
          JSON.stringify(newTask.instructions),
          newTask.createdBy,
          newTask.createdAt,
          JSON.stringify(newTask.notifications),
          JSON.stringify(newTask.proctoring),
          JSON.stringify(newTask.targetStudents)
        ]
      );
    } catch (error) {
      // Fallback to memory if DB fails
      inMemoryTasks.push(newTask);
    }

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: {
        ...newTask,
        status: getTaskStatus(newTask),
        timeUntilStart: getTimeUntilStart(newTask),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/student/tasks - Get tasks for student with availability status
router.get("/student/tasks/:studentId", async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    let tasksList = [];

    try {
      await ensureTasksTable();
      const result = await pool.query("SELECT * FROM tasks");
      tasksList = result.rows.map(mapTaskRow);
    } catch (error) {
      if (isDatabaseConnectionError(error)) {
        tasksList = inMemoryTasks;
      } else {
        throw error;
      }
    }

    // Filter tasks for this student
    // Note: In a real DB schema, we would use a join table or a WHERE clause with JSONB containment
    // For now, we filter in application logic to support the hybrid approach
    const studentTasks = tasksList.filter((task) =>
      task.targetStudents.includes(studentId),
    );

    // Add attempt information and status
    const tasksWithDetails = studentTasks.map((task) => {
      const attempts = studentAttempts.find(
        (a) => a.taskId === task.id && a.studentId === studentId,
      ) || { attempts: 0, scores: [] };

      const status = getTaskStatus(task);
      const timeUntilStart = getTimeUntilStart(task);

      return {
        ...task,
        status,
        timeUntilStart,
        studentAttempts: attempts.attempts,
        studentScores: attempts.scores,
        canAttempt:
          status === "available" && attempts.attempts < task.maxAttempts,
        isLocked: status === "upcoming",
        isExpired: status === "expired",
      };
    });

    res.json({
      success: true,
      tasks: tasksWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch student tasks",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/student/tasks/:taskId/start - Start a task (check availability)
router.post("/student/tasks/:taskId/start", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { studentId } = req.body;

    let task;
    
    // Try finding in memory first (fastest), then DB
    task = inMemoryTasks.find((t) => t.id === taskId);
    
    if (!task) {
      try {
        await ensureTasksTable();
        const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [taskId]);
        if (result.rows.length > 0) {
          task = mapTaskRow(result.rows[0]);
        }
      } catch (e) { /* ignore DB error */ }
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check if student is authorized for this task
    if (!task.targetStudents.includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized for this task",
      });
    }

    const status = getTaskStatus(task);

    // Check if task is available
    if (status !== "available") {
      return res.status(400).json({
        success: false,
        message:
          status === "upcoming" ? "Task not yet available" : "Task has expired",
      });
    }

    // Check attempt limits
    const attempts = studentAttempts.find(
      (a) => a.taskId === taskId && a.studentId === studentId,
    ) || { attempts: 0, scores: [] };

    if (attempts.attempts >= task.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: "Maximum attempts exceeded",
      });
    }

    // In real app, create session and return task content
    res.json({
      success: true,
      message: "Task started successfully",
      sessionId: `session_${Date.now()}`,
      task: {
        id: task.id,
        title: task.title,
        type: task.type,
        duration: task.duration,
        instructions: task.instructions,
        proctoring: task.proctoring,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to start task",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/tasks/status - Get real-time status updates for all tasks
router.get("/status", async (req: Request, res: Response) => {
  try {
    let tasksList = [];
    try {
      await ensureTasksTable();
      const result = await pool.query("SELECT * FROM tasks");
      tasksList = result.rows.map(mapTaskRow);
    } catch (error) {
      if (isDatabaseConnectionError(error)) {
        tasksList = inMemoryTasks;
      } else {
        throw error;
      }
    }

    const statusUpdates = tasksList.map((task) => ({
      id: task.id,
      status: getTaskStatus(task),
      timeUntilStart: getTimeUntilStart(task),
    }));

    res.json({
      success: true,
      statusUpdates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get status updates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/faculty/tasks/:taskId - Update task (affects availability)
router.put("/tasks/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    // Update in memory if exists
    const taskIndex = inMemoryTasks.findIndex((t) => t.id === taskId);
    let currentTask = taskIndex !== -1 ? inMemoryTasks[taskIndex] : null;

    // If not in memory, try fetching from DB to validate existence
    if (!currentTask) {
      try {
        await ensureTasksTable();
        const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [taskId]);
        if (result.rows.length > 0) {
          currentTask = mapTaskRow(result.rows[0]);
        }
      } catch (e) { /* ignore */ }
    }

    if (!currentTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Validate time changes
    if (updates.startDate || updates.startTime) {
      const newStartDate = updates.startDate || currentTask.startDate;
      const newStartTime = updates.startTime || currentTask.startTime;
      const startDateTime = new Date(`${newStartDate}T${newStartTime}`);

      if (startDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Start time must be in the future",
        });
      }
    }

    // Update task object
    const updatedTask = {
      ...currentTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Update in memory
    if (taskIndex !== -1) {
      inMemoryTasks[taskIndex] = updatedTask;
    }

    // Update in DB
    try {
      await ensureTasksTable();
      // Dynamic update query builder would be better here, but for simplicity:
      await pool.query(
        `UPDATE tasks SET 
          title = COALESCE($2, title),
          subject = COALESCE($3, subject),
          description = COALESCE($4, description),
          start_date = COALESCE($5, start_date),
          start_time = COALESCE($6, start_time),
          end_date = COALESCE($7, end_date),
          end_time = COALESCE($8, end_time),
          instructions = COALESCE($9, instructions)
         WHERE id = $1`,
        [
          taskId, 
          updates.title, 
          updates.subject, 
          updates.description,
          updates.startDate, updates.startTime,
          updates.endDate, updates.endTime,
          updates.instructions ? JSON.stringify(updates.instructions) : null
        ]
      );
    } catch (e) { /* ignore DB error if memory update succeeded */ }

    // If task timing changed, reset student attempts (optional)
    if (
      updates.startDate ||
      updates.startTime ||
      updates.endDate ||
      updates.endTime
    ) {
      // Reset attempts for this task
      studentAttempts.forEach((attempt) => {
        if (attempt.taskId === taskId) {
          attempt.attempts = 0;
          attempt.scores = [];
          attempt.lastAttemptAt = null;
        }
      });
    }

    res.json({
      success: true,
      message: "Task updated successfully",
      task: {
        ...updatedTask,
        status: getTaskStatus(updatedTask),
        timeUntilStart: getTimeUntilStart(updatedTask),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
