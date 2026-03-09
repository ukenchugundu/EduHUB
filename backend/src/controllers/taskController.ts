import { Request, Response } from "express";
import pool from "../utils/db";

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { role, userId, departmentId } = (req as any).user;

    let query = "";
    let params: any[] = [];

    if (role === "student") {
      // Get tasks assigned to the student
      query = `
        SELECT t.*, ta.status as assignment_status, ta.submitted_at, ta.submission_text,
               u.full_name as assigned_by_name
        FROM tasks t
        JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users u ON t.assigned_by = u.id
        WHERE ta.student_id = $1
        ORDER BY t.due_date ASC, t.created_at DESC
      `;
      params = [userId];
    } else if (role === "faculty") {
      // Get tasks created by the faculty or in their department
      query = `
        SELECT t.*, u.full_name as assigned_by_name,
               COUNT(ta.id) as total_assignments,
               COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments
        FROM tasks t
        LEFT JOIN users u ON t.assigned_by = u.id
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        WHERE t.assigned_by = $1 OR t.department_id = $2
        GROUP BY t.id, u.full_name
        ORDER BY t.created_at DESC
      `;
      params = [userId, departmentId];
    } else {
      // Admin can see all tasks
      query = `
        SELECT t.*, u.full_name as assigned_by_name, d.name as department_name,
               COUNT(ta.id) as total_assignments,
               COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments
        FROM tasks t
        LEFT JOIN users u ON t.assigned_by = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        GROUP BY t.id, u.full_name, d.name
        ORDER BY t.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { role, userId, departmentId } = (req as any).user;

    if (role === "student") {
      return res.status(403).json({ error: "Students cannot create tasks" });
    }

    const { title, description, dueDate, priority, studentIds } = req.body;

    if (!title || !studentIds || studentIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Title and student assignments are required" });
    }

    // Create the task
    const taskQuery = `
      INSERT INTO tasks (title, description, due_date, priority, assigned_by, department_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const taskResult = await pool.query(taskQuery, [
      title,
      description,
      dueDate,
      priority || "medium",
      userId,
      departmentId,
    ]);

    const task = taskResult.rows[0];

    // Assign task to students
    const assignmentQuery = `
      INSERT INTO task_assignments (task_id, student_id)
      VALUES ($1, $2)
    `;

    for (const studentId of studentIds) {
      await pool.query(assignmentQuery, [task.id, studentId]);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { role, userId } = (req as any).user;
    const { id } = req.params;
    const { title, description, dueDate, priority, status } = req.body;

    // Check if user can update this task
    const checkQuery = `
      SELECT * FROM tasks WHERE id = $1 AND (assigned_by = $2 OR $3 = 'admin')
    `;
    const checkResult = await pool.query(checkQuery, [id, userId, role]);

    if (checkResult.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this task" });
    }

    const updateQuery = `
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          due_date = COALESCE($3, due_date),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title,
      description,
      dueDate,
      priority,
      status,
      id,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { role, userId } = (req as any).user;
    const { id } = req.params;

    // Check if user can delete this task
    const checkQuery = `
      SELECT * FROM tasks WHERE id = $1 AND (assigned_by = $2 OR $3 = 'admin')
    `;
    const checkResult = await pool.query(checkQuery, [id, userId, role]);

    if (checkResult.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this task" });
    }

    await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

export const submitTask = async (req: Request, res: Response) => {
  try {
    const { role, userId } = (req as any).user;
    const { id } = req.params;
    const { submissionText } = req.body;

    if (role !== "student") {
      return res.status(403).json({ error: "Only students can submit tasks" });
    }

    const updateQuery = `
      UPDATE task_assignments 
      SET status = 'completed',
          submitted_at = CURRENT_TIMESTAMP,
          submission_text = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $2 AND student_id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [submissionText, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task assignment not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error submitting task:", error);
    res.status(500).json({ error: "Failed to submit task" });
  }
};

export const getTaskSubmissions = async (req: Request, res: Response) => {
  try {
    const { role, userId } = (req as any).user;
    const { id } = req.params;

    if (role === "student") {
      return res
        .status(403)
        .json({ error: "Students cannot view all submissions" });
    }

    const query = `
      SELECT ta.*, u.full_name as student_name, u.email as student_email
      FROM task_assignments ta
      JOIN users u ON ta.student_id = u.id
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.task_id = $1 AND (t.assigned_by = $2 OR $3 = 'admin')
      ORDER BY ta.submitted_at DESC, u.full_name ASC
    `;

    const result = await pool.query(query, [id, userId, role]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching task submissions:", error);
    res.status(500).json({ error: "Failed to fetch task submissions" });
  }
};
