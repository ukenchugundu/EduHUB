import express from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getDepartments,
  getBatches,
  getAcademicYears,
  getBatchStudents,
  getSubjects,
  getAttendanceSessions,
  createAttendanceSession,
  getAttendanceRecords,
  markAttendance,
  getStudentAttendanceSummary,
  getBatchAttendanceOverview,
  getFacultyActiveClasses,
  getFacultyClasses,
  getFacultyPendingGrades,
  getFacultyNextClass,
  getClassStudents,
  getStudentSchedule,
} from "../controllers/attendanceController";

const router = express.Router();

// Student schedule route
router.get("/student/schedule", authenticateToken, getStudentSchedule);

// Public routes (for getting departments, batches, subjects)
router.get("/departments", authenticateToken, getDepartments);
router.get("/academic-years", authenticateToken, getAcademicYears);
router.get("/batches", authenticateToken, getBatches);
router.get("/batches/:batchId/students", authenticateToken, getBatchStudents);
router.get("/subjects", authenticateToken, getSubjects);

// Attendance session routes
router.get(
  "/batches/:batchId/sessions",
  authenticateToken,
  getAttendanceSessions,
);
router.post("/sessions", authenticateToken, createAttendanceSession);
router.get(
  "/sessions/:sessionId/records",
  authenticateToken,
  getAttendanceRecords,
);
router.post("/sessions/:sessionId/mark", authenticateToken, markAttendance);

// Attendance summary routes
router.get(
  "/students/:studentId/attendance",
  authenticateToken,
  getStudentAttendanceSummary,
);
router.get(
  "/batches/:batchId/attendance-overview",
  authenticateToken,
  getBatchAttendanceOverview,
);

// Faculty dashboard routes
router.get(
  "/faculty/active-classes",
  authenticateToken,
  getFacultyActiveClasses,
);
router.get("/faculty/classes", authenticateToken, getFacultyClasses);
router.get(
  "/faculty/pending-grades",
  authenticateToken,
  getFacultyPendingGrades,
);
router.get("/faculty/next-class", authenticateToken, getFacultyNextClass);
router.get(
  "/faculty/classes/:batchId/students",
  authenticateToken,
  getClassStudents,
);

export default router;
