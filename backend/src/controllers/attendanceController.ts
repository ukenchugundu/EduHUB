import { Request, Response } from "express";
import pool from "../utils/db";

const UNDEFINED_TABLE_ERROR_CODE = "42P01";

const isUndefinedTableError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === UNDEFINED_TABLE_ERROR_CODE;

const getStudentBatchId = async (userId?: number): Promise<number | null> => {
  if (!userId) {
    return null;
  }

  for (const tableName of ["batch_students", "batch_student"] as const) {
    try {
      const result = await pool.query<{ batch_id: number }>(
        `SELECT batch_id FROM ${tableName} WHERE student_id = $1 LIMIT 1`,
        [userId],
      );

      if (result.rows.length > 0) {
        return Number(result.rows[0].batch_id);
      }
    } catch (error) {
      if (isUndefinedTableError(error)) {
        continue;
      }

      throw error;
    }
  }

  return null;
};

const getMockStudentSchedule = () => ({
  today: [
    {
      id: 1,
      subject: "Data Structures & Algorithms",
      start_time: "09:00:00",
      end_time: "09:50:00",
      faculty_name: "Dr. Smith",
      room: "LH-101",
    },
    {
      id: 2,
      subject: "Operating Systems",
      start_time: "11:00:00",
      end_time: "11:50:00",
      faculty_name: "Prof. Johnson",
      room: "LH-102",
    },
  ],
  upcoming: [
    {
      id: 3,
      subject: "Database Management Systems",
      session_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      start_time: "10:00:00",
      end_time: "10:50:00",
      faculty_name: "Dr. Brown",
      room: "LH-201",
    },
  ],
});

// Get all departments
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM departments ORDER BY name");
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

    let query = `
      SELECT b.*, d.name as department_name, d.code as department_code
      FROM batches b
      JOIN departments d ON b.department_id = d.id
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
    const result = await pool.query(
      "SELECT DISTINCT academic_year FROM batches ORDER BY academic_year DESC",
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
    const { batchId } = req.params;

    // Get students from auth_users with roll_number for this batch
    // For now, we'll get all students - in production, you'd have a batch_students table
    const result = await pool.query(
      `SELECT auth_user_id as id, full_name, email, roll_number 
       FROM auth_users 
       WHERE role = 'student' 
       ORDER BY roll_number, full_name`,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching batch students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// Get subjects for a batch (from faculty's subjects or a subjects table)
export const getSubjects = async (req: Request, res: Response) => {
  try {
    // Common subjects for CSE/CS/IT departments
    const subjects = [
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
    ];

    res.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
};

// Get attendance sessions for a batch
export const getAttendanceSessions = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { date, subject } = req.query;
    const { userId } = (req as any).user;

    let query = `
      SELECT asess.*, b.name as batch_name, d.name as department_name
      FROM attendance_sessions asess
      JOIN batches b ON asess.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
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
    const { sessionId, records } = req.body;
    const { userId } = (req as any).user;

    if (!sessionId || !records || !Array.isArray(records)) {
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
      "UPDATE attendance_sessions SET is_active = FALSE WHERE id = $1",
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
      JOIN batches b ON asess.batch_id = b.id
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
    const { userId } = (req as any).user;
    const today = new Date().toISOString().split("T")[0];

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
      JOIN batches b ON asess.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
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
    const { userId } = (req as any).user;

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
      JOIN batches b ON asess.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
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
    const { userId } = (req as any).user;

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

    // Get pending assignment submissions (from tasks table)
    const pendingAssignmentResult = await pool.query(
      `SELECT 
        ts.id as submission_id,
        ts.task_id,
        t.title as assignment_title,
        t.cls as class_name,
        ts.student_id,
        ts.submitted_at,
        'assignment' as type
      FROM task_submissions ts
      JOIN tasks t ON ts.task_id = t.id
      WHERE ts.submitted_at IS NOT NULL 
        AND ts.score IS NULL
      ORDER BY ts.submitted_at DESC
      LIMIT 50`,
    );

    const pendingGrades = [
      ...pendingQuizResult.rows.map((row) => ({
        ...row,
        submitted_at: row.submitted_at
          ? new Date(row.submitted_at).toISOString()
          : null,
      })),
      ...pendingAssignmentResult.rows.map((row) => ({
        ...row,
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
    });
  } catch (error) {
    console.error("Error fetching pending grades:", error);
    res.status(500).json({ error: "Failed to fetch pending grades" });
  }
};

// Get next scheduled class for faculty
export const getFacultyNextClass = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 8);

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
      JOIN batches b ON asess.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
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
      JOIN batches b ON asess.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
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

    // Return mock data for demo if no sessions exist
    res.json({
      id: null,
      batch_id: null,
      subject: "Data Structures & Algorithms",
      session_date: today,
      start_time: "10:00:00",
      end_time: "10:50:00",
      is_active: false,
      batch_name: "III CSE-A",
      department_name: "Computer Science and Engineering",
      department_code: "CSE",
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
    const { batchId } = req.params;
    const { userId } = (req as any).user;

    // Get students who have attendance records for this batch
    const result = await pool.query(
      `SELECT DISTINCT 
        au.auth_user_id as student_id,
        au.full_name,
        au.email,
        au.roll_number,
        COUNT(ar.id) as attendance_count,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
        ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::numeric / COUNT(ar.id)::numeric * 100, 2) as attendance_percentage
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      JOIN auth_users au ON ar.student_id = au.auth_user_id
      WHERE asess.batch_id = $1 AND asess.faculty_id = $2
      GROUP BY au.auth_user_id, au.full_name, au.email, au.roll_number
      ORDER BY au.roll_number, au.full_name`,
      [batchId, userId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching class students:", error);
    res.status(500).json({ error: "Failed to fetch class students" });
  }
};

// Get scheduled classes for student
export const getStudentSchedule = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const today = new Date().toISOString().split("T")[0];

    const batchId = await getStudentBatchId(userId);

    if (batchId === null) {
      return res.json(getMockStudentSchedule());
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
        return res.json(getMockStudentSchedule());
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

