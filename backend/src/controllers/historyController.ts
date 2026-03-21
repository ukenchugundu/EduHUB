import { Request, Response } from "express";
import pool from "../utils/db";
import { resolvePortalStudentIdByIdentifier } from "../utils/studentPortalAccess";

const dbConnectionErrorCodes = new Set([
  "28P01",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ECONNRESET",
  "ETIMEDOUT",
  "3D000",
]);

const isDatabaseConnectionError = (error: unknown): boolean => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (dbConnectionErrorCodes.has(code)) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("password authentication failed") ||
    message.includes("client password must be a string") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("timeout expired") ||
    message.includes("connect econnrefused") ||
    (message.includes("database") && message.includes("does not exist"))
  );
};

// In-memory fallback storage
const inMemoryHistory: Array<{
  id: number;
  title: string;
  type: string;
  date: string;
  score: string;
  subject: string;
  createdAt: string;
}> = [];

let historyIdCounter = 1;

export const getStudentHistory = async (req: Request, res: Response) => {
  const { studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({ error: "Student ID is required" });
  }

  try {
    // Check if quizzes table exists
    let quizHistory: any[] = [];
    try {
      // Try to determine the ID column name
      const tableCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name IN ('id', 'quiz_id')
        LIMIT 2
      `);
      
      const idColumn = tableCheck.rows.find(r => r.column_name === 'quiz_id') ? 'quiz_id' : 'id';
      
      const quizResult = await pool.query(
        `SELECT 
          qa.attempt_id as id,
          q.title,
          'quiz' as type,
          COALESCE(qa.submitted_at, qa.started_at) as date,
          qa.score,
          COALESCE(q.cls, q.subject, 'General') as subject,
          COALESCE(qa.submitted_at, qa.started_at) as "createdAt"
        FROM quiz_attempts qa
        LEFT JOIN quizzes q ON qa.quiz_id = q.${idColumn}
        WHERE qa.student_id = $1 AND qa.status = 'Submitted'
        ORDER BY COALESCE(qa.submitted_at, qa.started_at) DESC`,
        [studentId]
      );
      quizHistory = quizResult.rows;
    } catch (e) {
      console.warn("Quiz history query failed:", e);
    }

    // Check if assignments table exists
    let assignmentHistory: any[] = [];
    try {
      const assignmentResult = await pool.query(
        `SELECT 
          asub.submission_id as id,
          a.title,
          'assignment' as type,
          asub.submitted_at as date,
          asub.faculty_score as score,
          COALESCE(a.subject, 'General') as subject,
          asub.submitted_at as "createdAt",
          asub.reviewed_at,
          a.max_score
        FROM assignment_submissions asub
        LEFT JOIN assignments a ON asub.assignment_id = a.assignment_id
        WHERE asub.student_id = $1
        ORDER BY asub.submitted_at DESC`,
        [studentId]
      );
      assignmentHistory = assignmentResult.rows;
    } catch (e) {
      console.warn("Assignment history query failed:", e);
    }

    // Check if test_attempts table exists
    let testHistory: any[] = [];
    try {
      const portalStudentId = await resolvePortalStudentIdByIdentifier(
        pool,
        studentId,
      );
      if (!portalStudentId) {
        testHistory = [];
      } else {
      const testResult = await pool.query(
        `SELECT 
          ta.attempt_id as id,
          t.title,
          'test' as type,
          COALESCE(ta.end_time, ta.start_time) as date,
          ta.total_score as score,
          COALESCE(t.subject, 'General') as subject,
          COALESCE(ta.end_time, ta.start_time) as "createdAt"
        FROM test_attempts ta
        LEFT JOIN coding_tests t ON ta.test_id = t.id
        WHERE ta.student_id = $1 AND ta.status = 'Submitted'
        ORDER BY COALESCE(ta.end_time, ta.start_time) DESC`,
        [portalStudentId]
      );
      testHistory = testResult.rows;
      }
    } catch (e) {
      console.warn("Test history query failed:", e);
    }

    // Format scores
    const formattedQuizzes = quizHistory.map(r => ({
      ...r,
      score: r.score !== null && r.score !== undefined ? `${r.score}` : "Pending"
    }));

    const formattedAssignments = assignmentHistory.map(r => ({
      ...r,
      score: r.score !== null && r.score !== undefined 
        ? `${Math.round((Number(r.score) / (Number(r.max_score) || 100)) * 100)}%` 
        : "Submitted",
      status: r.reviewed_at ? "Graded" : "Submitted"
    }));

    const formattedTests = testHistory.map(r => ({
      ...r,
      score: r.score !== null && r.score !== undefined ? `${r.score}` : "Pending"
    }));

    // Combine with in-memory history
    const combinedHistory = [
      ...formattedQuizzes,
      ...formattedAssignments,
      ...formattedTests,
      ...inMemoryHistory
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(combinedHistory);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      // Return in-memory history when database is unavailable
      return res.json(inMemoryHistory);
    }
    console.error("Error fetching student history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Function to add to history (called from quiz/assignment submission)
export const addToHistory = (
  title: string,
  type: "quiz" | "test" | "assignment",
  score: string,
  subject: string
) => {
  const entry = {
    id: historyIdCounter++,
    title,
    type,
    date: new Date().toISOString(),
    score,
    subject,
    createdAt: new Date().toISOString()
  };
  inMemoryHistory.unshift(entry);
  return entry;
};
