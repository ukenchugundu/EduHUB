import { Request, Response } from "express";
import pool from "../utils/db";
import {
  getAcademicTableNames,
  getBatchStudentRows as getPortalBatchStudentRows,
  getStudentBatchIdForAuthUser,
} from "../utils/studentPortalAccess";

const UNDEFINED_TABLE_ERROR_CODE = "42P01";

const isUndefinedTableError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === UNDEFINED_TABLE_ERROR_CODE;

const getStudentBatchId = async (userId?: number): Promise<number | null> => {
  return getStudentBatchIdForAuthUser(pool, userId);
};

const getEmptyStudentSchedule = () => ({
  today: [],
  upcoming: [],
});

const buildSubjectCode = (name: string): string =>
  name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SUB";

const DEFAULT_SUBJECTS = [
  { id: 1, name: "Data Structures & Algorithms", code: "DSA" },
  { id: 2, name: "Database Management Systems", code: "DBMS" },
  { id: 3, name: "Operating Systems", code: "OS" },
  { id: 4, name: "Computer Networks", code: "CN" },
  { id: 5, name: "Software Engineering", code: "SE" },
  { id: 6, name: "Machine Learning", code: "ML" },
  { id: 7, name: "Artificial Intelligence", code: "AI" },
  { id: 8, name: "Web Technologies", code: "WT" },
  { id: 9, name: "Cloud Computing", code: "CC" },
  { id: 10, name: "Cybersecurity", code: "CS" },
] as const;

const getBatchStudentRows = async (batchId: number) => {
  return getPortalBatchStudentRows(pool, batchId);
};

let attendanceTablesReadyPromise: Promise<boolean> | null = null;

const ensureAttendanceTables = async (): Promise<boolean> => {
  if (!attendanceTablesReadyPromise) {
    attendanceTablesReadyPromise = (async () => {
      const { batchTableName } = await getAcademicTableNames(pool);
      if (!batchTableName) {
        return false;
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
          id SERIAL PRIMARY KEY,
          batch_id INTEGER REFERENCES ${batchTableName}(id) ON DELETE CASCADE,
          faculty_id INTEGER REFERENCES auth_users(auth_user_id),
          subject VARCHAR(255) NOT NULL,
          topic VARCHAR(255),
          session_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(batch_id, subject, session_date, start_time)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES auth_users(auth_user_id),
          status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
          marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          marked_by INTEGER REFERENCES auth_users(auth_user_id),
          UNIQUE(session_id, student_id)
        )
      `);

      await pool.query(
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS topic VARCHAR(255)",
      );
      await pool.query(
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
      );
      await pool.query(
        "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS marked_by INTEGER REFERENCES auth_users(auth_user_id)",
      );

      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_attendance_sessions_batch_id ON attendance_sessions(batch_id)",
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date)",
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id)",
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id)",
      );

      return true;
    })().catch((error) => {
      attendanceTablesReadyPromise = null;
      throw error;
    });
  }

  return attendanceTablesReadyPromise;
};

const getAvailableSubjectsFromDb = async () => {
  const collected = new Map<string, { name: string; code: string }>();

  for (const tableName of ["subjects", "subject"] as const) {
    try {
      const result = await pool.query<{ name: string | null; code: string | null }>(
        `SELECT name, code FROM ${tableName} ORDER BY name`,
      );
      for (const row of result.rows) {
        const name = String(row.name ?? "").trim();
        if (!name) {
          continue;
        }
        collected.set(name.toLowerCase(), {
          name,
          code: String(row.code ?? "").trim() || buildSubjectCode(name),
        });
      }
      if (result.rows.length > 0) {
        return Array.from(collected.values()).map((subject, index) => ({
          id: index + 1,
          ...subject,
        }));
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        continue;
      }

      throw error;
    }
  }

  for (const tableName of ["timetable_entries", "attendance_sessions"] as const) {
    try {
      const result = await pool.query<{ subject: string | null }>(
        `
          SELECT DISTINCT subject
          FROM ${tableName}
          WHERE subject IS NOT NULL AND TRIM(subject) <> ''
          ORDER BY subject
        `,
      );
      for (const row of result.rows) {
        const name = String(row.subject ?? "").trim();
        if (!name) {
          continue;
        }
        if (!collected.has(name.toLowerCase())) {
          collected.set(name.toLowerCase(), {
            name,
            code: buildSubjectCode(name),
          });
        }
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        continue;
      }

      throw error;
    }
  }

  if (collected.size === 0) {
    return [...DEFAULT_SUBJECTS];
  }

  return Array.from(collected.values()).map((subject, index) => ({
    id: index + 1,
    ...subject,
  }));
};

// Get all departments
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const { departmentTableName } = await getAcademicTableNames(pool);
    if (!departmentTableName) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT * FROM ${departmentTableName} ORDER BY name`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

// Get batches (classes) for a department
export const getBatches = async (req: Request, res: Response) => {
  try {
    const { departmentId, academicYear, semester } = req.query;
    const { batchTableName, departmentTableName } = await getAcademicTableNames(
      pool,
    );

    if (!batchTableName || !departmentTableName) {
      return res.json([]);
    }

    let query = `
      SELECT b.*, d.name as department_name, d.code as department_code
      FROM ${batchTableName} b
      JOIN ${departmentTableName} d ON b.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      params.push(departmentId);
      query += ` AND b.department_id = $${params.length}`;
    }
    if (academicYear) {
      params.push(academicYear);
      query += ` AND b.academic_year = $${params.length}`;
    }
    if (semester) {
      params.push(semester);
      query += ` AND b.semester = $${params.length}`;
    }

    query += " ORDER BY b.academic_year DESC, b.semester, b.name";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
};

// Get available academic years
export const getAcademicYears = async (req: Request, res: Response) => {
  try {
    const { batchTableName } = await getAcademicTableNames(pool);
    if (!batchTableName) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT DISTINCT academic_year FROM ${batchTableName} ORDER BY academic_year DESC`,
    );
    res.json(result.rows.map((r) => r.academic_year));
  } catch (error) {
    console.error("Error fetching academic years:", error);
    res.status(500).json({ error: "Failed to fetch academic years" });
  }
};

// Get students in a batch
export const getBatchStudents = async (req: Request, res: Response) => {
  try {
    const parsedBatchId = Number(req.params.batchId);
    if (!Number.isInteger(parsedBatchId) || parsedBatchId <= 0) {
      return res.status(400).json({ error: "Invalid batch id" });
    }

    const rows = await getBatchStudentRows(parsedBatchId);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching batch students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// Get subjects for a batch (from faculty's subjects or a subjects table)
export const getSubjects = async (req: Request, res: Response) => {
  try {
    res.json(await getAvailableSubjectsFromDb());
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
};

// Get attendance sessions for a batch
export const getAttendanceSessions = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { batchId } = req.params;
    const { date, subject } = req.query;
    const { userId } = (req as any).user;
    const { batchTableName, departmentTableName } = await getAcademicTableNames(
      pool,
    );

    if (!batchTableName || !departmentTableName) {
      return res.json([]);
    }

    let query = `
      SELECT asess.*, b.name as batch_name, d.name as department_name
      FROM attendance_sessions asess
      JOIN ${batchTableName} b ON asess.batch_id = b.id
      JOIN ${departmentTableName} d ON b.department_id = d.id
      WHERE asess.batch_id = $1
    `;
    const params: any[] = [batchId];

    if (date) {
      params.push(date);
      query += ` AND asess.session_date = $${params.length}`;
    }
    if (subject) {
      params.push(subject);
      query += ` AND asess.subject = $${params.length}`;
    }

    query += " ORDER BY asess.session_date DESC, asess.start_time DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance sessions:", error);
    res.status(500).json({ error: "Failed to fetch attendance sessions" });
  }
};

// Create a new attendance session
export const createAttendanceSession = async (req: Request, res: Response) => {
  try {
    const attendanceTablesReady = await ensureAttendanceTables();
    if (!attendanceTablesReady) {
      return res.status(500).json({ error: "Attendance tables are not configured" });
    }

    const {
      batchId,
      facultyId: requestedFacultyId,
      subject,
      topic,
      sessionDate,
      startTime,
      endTime,
    } = req.body;
    const { userId, role } = (req as any).user ?? {};
    const parsedBatchId = Number(batchId);
    const normalizedSubject = String(subject ?? "").trim();
    const normalizedTopic = String(topic ?? "").trim();

    if (!parsedBatchId || !normalizedSubject || !sessionDate || !startTime) {
      return res
        .status(400)
        .json({
          error: "batchId, subject, sessionDate, and startTime are required",
        });
    }

    if (role !== "faculty" && role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only faculty or admin can create attendance sessions" });
    }

    const facultyId =
      role === "admin" ? Number(requestedFacultyId) : Number(userId);

    if (!Number.isInteger(facultyId) || facultyId <= 0) {
      return res.status(400).json({
        error:
          role === "admin"
            ? "facultyId is required when admin creates a schedule"
            : "Invalid faculty account",
      });
    }

    if (role === "admin") {
      const facultyCheck = await pool.query(
        `SELECT auth_user_id
         FROM auth_users
         WHERE auth_user_id = $1 AND role = 'faculty'
         LIMIT 1`,
        [facultyId],
      );

      if (facultyCheck.rows.length === 0) {
        return res.status(400).json({ error: "Selected faculty account not found" });
      }
    }

    const result = await pool.query(
      `INSERT INTO attendance_sessions (batch_id, faculty_id, subject, topic, session_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        parsedBatchId,
        facultyId,
        normalizedSubject,
        normalizedTopic || null,
        sessionDate,
        startTime,
        endTime || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({
          error: "Attendance session already exists for this time slot",
        });
    }
    console.error("Error creating attendance session:", error);
    res.status(500).json({ error: "Failed to create attendance session" });
  }
};

// Get attendance records for a session
export const getAttendanceRecords = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { sessionId } = req.params;

    const result = await pool.query(
      `SELECT ar.*, au.full_name, au.email, au.roll_number
       FROM attendance_records ar
       JOIN auth_users au ON ar.student_id = au.auth_user_id
       WHERE ar.session_id = $1
       ORDER BY au.roll_number, au.full_name`,
      [sessionId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
};

// Mark attendance for students
export const markAttendance = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const sessionId = Number(req.params.sessionId ?? req.body?.sessionId);
    const { records } = req.body;
    const { userId } = (req as any).user;

    if (!Number.isInteger(sessionId) || sessionId <= 0 || !records || !Array.isArray(records)) {
      return res
        .status(400)
        .json({ error: "sessionId and records array are required" });
    }

    // Check if session exists and is active
    const sessionCheck = await pool.query(
      "SELECT id, is_active FROM attendance_sessions WHERE id = $1",
      [sessionId],
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Attendance session not found" });
    }

    if (!sessionCheck.rows[0].is_active) {
      return res
        .status(400)
        .json({ error: "This attendance session is closed" });
    }

    // Process attendance records
    const results = [];
    for (const record of records) {
      const { studentId, status } = record;

      if (!studentId || !status) {
        continue;
      }

      const result = await pool.query(
        `INSERT INTO attendance_records (session_id, student_id, status, marked_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, student_id) 
         DO UPDATE SET status = $3, marked_at = CURRENT_TIMESTAMP, marked_by = $4
         RETURNING *`,
        [sessionId, studentId, status, userId],
      );

      results.push(result.rows[0]);
    }

    // Mark session as inactive after attendance is marked
    await pool.query(
      "UPDATE attendance_sessions SET is_active = FALSE, end_time = COALESCE(end_time, TO_CHAR(CURRENT_TIME, 'HH24:MI:SS')) WHERE id = $1",
      [sessionId],
    );

    res.json({ message: "Attendance marked successfully", records: results });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
};

// Get attendance summary for a student
export const getStudentAttendanceSummary = async (
  req: Request,
  res: Response,
) => {
  try {
    await ensureAttendanceTables();
    const { studentId } = req.params;
    const { batchId, subject, fromDate, toDate } = req.query;
    const { userId } = (req as any).user;

    // Only allow students to view their own attendance or faculty/admin
    const { role } = (req as any).user;
    if (role === "student" && Number(studentId) !== userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized to view other student attendance" });
    }

    const { batchTableName } = await getAcademicTableNames(pool);
    if (!batchTableName) {
      return res.json({
        records: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendancePercentage: 0,
        },
      });
    }

    let query = `
      SELECT 
        ar.student_id,
        asess.subject,
        asess.session_date,
        ar.status,
        ar.marked_at,
        b.name as batch_name,
        au.full_name
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      JOIN ${batchTableName} b ON asess.batch_id = b.id
      JOIN auth_users au ON ar.student_id = au.auth_user_id
      WHERE ar.student_id = $1
    `;
    const params: any[] = [studentId];

    if (batchId) {
      params.push(batchId);
      query += ` AND asess.batch_id = $${params.length}`;
    }
    if (subject) {
      params.push(subject);
      query += ` AND asess.subject = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      query += ` AND asess.session_date >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      query += ` AND asess.session_date <= $${params.length}`;
    }

    query += " ORDER BY asess.session_date DESC";

    const result = await pool.query(query, params);

    // Calculate summary
    const total = result.rows.length;
    const present = result.rows.filter((r) => r.status === "present").length;
    const absent = result.rows.filter((r) => r.status === "absent").length;
    const late = result.rows.filter((r) => r.status === "late").length;
    const excused = result.rows.filter((r) => r.status === "excused").length;

    res.json({
      records: result.rows,
      summary: {
        total,
        present,
        absent,
        late,
        excused,
        attendancePercentage:
          total > 0 ? Math.round((present / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching student attendance summary:", error);
    res.status(500).json({ error: "Failed to fetch attendance summary" });
  }
};

// Get batch attendance overview (for faculty)
export const getBatchAttendanceOverview = async (
  req: Request,
  res: Response,
) => {
  try {
    await ensureAttendanceTables();
    const { batchId } = req.params;
    const { subject, fromDate, toDate } = req.query;
    const { userId } = (req as any).user;

    let query = `
      SELECT 
        asess.subject,
        asess.session_date,
        asess.start_time,
        COUNT(ar.student_id) as total_students,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_count
      FROM attendance_sessions asess
      LEFT JOIN attendance_records ar ON asess.id = ar.session_id
      WHERE asess.batch_id = $1
    `;
    const params: any[] = [batchId];

    if (subject) {
      params.push(subject);
      query += ` AND asess.subject = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      query += ` AND asess.session_date >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      query += ` AND asess.session_date <= $${params.length}`;
    }

    query +=
      " GROUP BY asess.id ORDER BY asess.session_date DESC, asess.start_time DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching batch attendance overview:", error);
    res.status(500).json({ error: "Failed to fetch attendance overview" });
  }
};

// Get faculty's active classes (attendance sessions for today or active sessions)
export const getFacultyActiveClasses = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { userId } = (req as any).user;
    const today = new Date().toISOString().split("T")[0];
    const { batchTableName, departmentTableName } = await getAcademicTableNames(
      pool,
    );

    if (!batchTableName || !departmentTableName) {
      return res.json([]);
    }

    // Get active attendance sessions for this faculty (today or ongoing)
    const result = await pool.query(
      `SELECT 
        asess.id,
        asess.batch_id,
        asess.subject,
        asess.session_date,
        asess.start_time,
        asess.end_time,
        asess.is_active,
        b.name as batch_name,
        d.name as department_name,
        d.code as department_code
      FROM attendance_sessions asess
      JOIN ${batchTableName} b ON asess.batch_id = b.id
      JOIN ${departmentTableName} d ON b.department_id = d.id
      WHERE asess.faculty_id = $1
        AND (asess.session_date = $2 OR asess.is_active = TRUE)
      ORDER BY asess.session_date DESC, asess.start_time DESC
      LIMIT 20`,
      [userId, today],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching faculty active classes:", error);
    res.status(500).json({ error: "Failed to fetch active classes" });
  }
};

// Get faculty's assigned subjects/classes with student count
export const getFacultyClasses = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { userId } = (req as any).user;
    const { batchTableName, departmentTableName } = await getAcademicTableNames(
      pool,
    );

    if (!batchTableName || !departmentTableName) {
      return res.json({
        classes: [],
        totalStudents: 0,
        totalClasses: 0,
      });
    }

    // Get unique batch-subject combinations for this faculty
    const result = await pool.query(
      `SELECT 
        DISTINCT ON (asess.batch_id, asess.subject)
        asess.batch_id,
        asess.subject,
        b.name as batch_name,
        d.name as department_name,
        d.code as department_code,
        b.semester,
        b.academic_year,
        COUNT(DISTINCT asess.id) as session_count,
        MAX(asess.session_date) as last_session_date
      FROM attendance_sessions asess
      JOIN ${batchTableName} b ON asess.batch_id = b.id
      JOIN ${departmentTableName} d ON b.department_id = d.id
      WHERE asess.faculty_id = $1
      GROUP BY asess.batch_id, asess.subject, b.name, d.name, d.code, b.semester, b.academic_year
      ORDER BY asess.batch_id, asess.subject`,
      [userId],
    );

    // Get total unique students across all classes
    const studentCountResult = await pool.query(
      `SELECT COUNT(DISTINCT ar.student_id) as total_students
       FROM attendance_records ar
       JOIN attendance_sessions asess ON ar.session_id = asess.id
       WHERE asess.faculty_id = $1`,
      [userId],
    );

    res.json({
      classes: result.rows,
      totalStudents: studentCountResult.rows[0]?.total_students || 0,
      totalClasses: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching faculty classes:", error);
    res.status(500).json({ error: "Failed to fetch faculty classes" });
  }
};

// Get pending grades (quiz and assignment submissions without scores)
export const getFacultyPendingGrades = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { batchTableName } = await getAcademicTableNames(pool);

    // Get pending quiz results
    const pendingQuizResult = await pool.query(
      `SELECT 
        qa.attempt_id as id,
        qa.quiz_id,
        q.title as quiz_title,
        q.cls as class_name,
        qa.student_id,
        qa.submitted_at,
        'quiz' as type
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.submitted_at IS NOT NULL 
        AND qa.faculty_score IS NULL
      ORDER BY qa.submitted_at DESC
      LIMIT 50`,
    );

    // Get pending assignment submissions
    const pendingAssignmentResult = await pool.query(
      `SELECT 
        asub.submission_id as id,
        asub.assignment_id as reference_id,
        a.title,
        a.cls as class_name,
        asub.student_id,
        asub.submitted_at,
        'assignment' as type
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.assignment_id
      WHERE asub.submitted_at IS NOT NULL 
        AND asub.faculty_score IS NULL
      ORDER BY asub.submitted_at DESC
      LIMIT 50`,
    );

    const pendingTestResult = await pool.query(
      `SELECT
        ta.attempt_id as id,
        ta.test_id as reference_id,
        ct.title,
        COALESCE(b.name, '') as class_name,
        CAST(ta.student_id AS VARCHAR) as student_id,
        ta.end_time as submitted_at,
        'test' as type
      FROM test_attempts ta
      JOIN coding_tests ct ON ta.test_id = ct.id
      ${batchTableName ? `LEFT JOIN ${batchTableName} b ON ct.batch_id = b.id` : "LEFT JOIN (SELECT NULL::INT AS id, ''::TEXT AS name) b ON FALSE"}
      WHERE ta.status = 'Submitted'
        AND ta.total_score IS NULL
      ORDER BY ta.end_time DESC
      LIMIT 50`,
    );

    const pendingGrades = [
      ...pendingQuizResult.rows.map((row) => ({
        id: row.id,
        reference_id: row.quiz_id,
        title: row.quiz_title,
        class_name: row.class_name,
        student_id: row.student_id,
        type: row.type,
        ...row,
        submitted_at: row.submitted_at
          ? new Date(row.submitted_at).toISOString()
          : null,
      })),
      ...pendingAssignmentResult.rows.map((row) => ({
        id: row.id,
        reference_id: row.reference_id,
        title: row.title,
        class_name: row.class_name,
        student_id: row.student_id,
        type: row.type,
        submitted_at: row.submitted_at
          ? new Date(row.submitted_at).toISOString()
          : null,
      })),
      ...pendingTestResult.rows.map((row) => ({
        id: row.id,
        reference_id: row.reference_id,
        title: row.title,
        class_name: row.class_name,
        student_id: row.student_id,
        type: row.type,
        submitted_at: row.submitted_at
          ? new Date(row.submitted_at).toISOString()
          : null,
      })),
    ].sort((a, b) => {
      const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return dateB - dateA;
    });

    res.json({
      pendingGrades,
      totalPending: pendingGrades.length,
      pendingQuizzes: pendingQuizResult.rows.length,
      pendingAssignments: pendingAssignmentResult.rows.length,
      pendingTests: pendingTestResult.rows.length,
    });
  } catch (error) {
    console.error("Error fetching pending grades:", error);
    res.status(500).json({ error: "Failed to fetch pending grades" });
  }
};

// Get next scheduled class for faculty
export const getFacultyNextClass = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { userId } = (req as any).user;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 8);
    const { batchTableName, departmentTableName } = await getAcademicTableNames(
      pool,
    );

    if (!batchTableName || !departmentTableName) {
      return res.json({
        id: null,
        batch_id: null,
        subject: "",
        session_date: "",
        start_time: "",
        end_time: null,
        is_active: false,
        batch_name: "",
        department_name: "",
        department_code: "",
        nextClassType: "none",
      });
    }

    // Get today's remaining sessions
    const todayResult = await pool.query(
      `SELECT 
        asess.id,
        asess.batch_id,
        asess.subject,
        asess.session_date,
        asess.start_time,
        asess.end_time,
        asess.is_active,
        b.name as batch_name,
        d.name as department_name,
        d.code as department_code
      FROM attendance_sessions asess
      JOIN ${batchTableName} b ON asess.batch_id = b.id
      JOIN ${departmentTableName} d ON b.department_id = d.id
      WHERE asess.faculty_id = $1
        AND asess.session_date = $2
        AND asess.start_time > $3
      ORDER BY asess.start_time ASC
      LIMIT 1`,
      [userId, today, currentTime],
    );

    if (todayResult.rows.length > 0) {
      return res.json({
        ...todayResult.rows[0],
        nextClassType: "today",
      });
    }

    // Get next session from upcoming days
    const upcomingResult = await pool.query(
      `SELECT 
        asess.id,
        asess.batch_id,
        asess.subject,
        asess.session_date,
        asess.start_time,
        asess.end_time,
        asess.is_active,
        b.name as batch_name,
        d.name as department_name,
        d.code as department_code
      FROM attendance_sessions asess
      JOIN ${batchTableName} b ON asess.batch_id = b.id
      JOIN ${departmentTableName} d ON b.department_id = d.id
      WHERE asess.faculty_id = $1
        AND asess.session_date > $2
      ORDER BY asess.session_date ASC, asess.start_time ASC
      LIMIT 1`,
      [userId, today],
    );

    if (upcomingResult.rows.length > 0) {
      return res.json({
        ...upcomingResult.rows[0],
        nextClassType: "upcoming",
      });
    }

    res.json({
      id: null,
      batch_id: null,
      subject: "",
      session_date: "",
      start_time: "",
      end_time: null,
      is_active: false,
      batch_name: "",
      department_name: "",
      department_code: "",
      nextClassType: "none",
    });
  } catch (error) {
    console.error("Error fetching next class:", error);
    res.status(500).json({ error: "Failed to fetch next class" });
  }
};

// Get students for a specific class (batch)
export const getClassStudents = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const parsedBatchId = Number(req.params.batchId);
    const { userId } = (req as any).user;

    if (!Number.isInteger(parsedBatchId) || parsedBatchId <= 0) {
      return res.status(400).json({ error: "Invalid batch id" });
    }

    const studentRows = await getBatchStudentRows(parsedBatchId);
    const summaryResult = await pool.query(
      `SELECT
        ar.student_id,
        COUNT(ar.id)::INT as attendance_count,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::INT as present_count,
        COALESCE(
          ROUND(
            COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::numeric /
            NULLIF(COUNT(ar.id), 0)::numeric * 100,
            2
          ),
          0
        ) as attendance_percentage
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      WHERE asess.batch_id = $1 AND asess.faculty_id = $2
      GROUP BY ar.student_id`,
      [parsedBatchId, userId],
    );
    const summaryByStudentId = new Map(
      summaryResult.rows.map((row) => [Number(row.student_id), row]),
    );

    res.json(
      studentRows.map((student) => {
        const summary = summaryByStudentId.get(Number(student.student_id));
        return {
          student_id: String(student.student_id),
          full_name: student.full_name,
          email: student.email,
          roll_number: student.roll_number,
          attendance_count: Number(summary?.attendance_count ?? 0),
          present_count: Number(summary?.present_count ?? 0),
          attendance_percentage: Number(summary?.attendance_percentage ?? 0),
        };
      }),
    );
  } catch (error) {
    console.error("Error fetching class students:", error);
    res.status(500).json({ error: "Failed to fetch class students" });
  }
};

// Get scheduled classes for student
export const getStudentSchedule = async (req: Request, res: Response) => {
  try {
    await ensureAttendanceTables();
    const { userId } = (req as any).user;
    const today = new Date().toISOString().split("T")[0];

    const batchId = await getStudentBatchId(userId);

    if (batchId === null) {
      return res.json(getEmptyStudentSchedule());
    }

    let todayClasses;
    let upcomingClasses;
    try {
      todayClasses = await pool.query(
        `SELECT 
          asess.id,
          asess.subject,
          asess.topic,
          asess.start_time,
          asess.end_time,
          asess.is_active,
          au.full_name as faculty_name
        FROM attendance_sessions asess
        JOIN auth_users au ON asess.faculty_id = au.auth_user_id
        WHERE asess.batch_id = $1 AND asess.session_date = $2
        ORDER BY asess.start_time ASC`,
        [batchId, today],
      );

      upcomingClasses = await pool.query(
        `SELECT 
          asess.id,
          asess.subject,
          asess.topic,
          asess.session_date,
          asess.start_time,
          asess.end_time,
          au.full_name as faculty_name
        FROM attendance_sessions asess
        JOIN auth_users au ON asess.faculty_id = au.auth_user_id
        WHERE asess.batch_id = $1 AND asess.session_date > $2
        ORDER BY asess.session_date ASC, asess.start_time ASC
        LIMIT 10`,
        [batchId, today],
      );
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return res.json(getEmptyStudentSchedule());
      }

      throw error;
    }

    res.json({
      today: todayClasses.rows,
      upcoming: upcomingClasses.rows,
    });
  } catch (error) {
    console.error("Error fetching student schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
};
