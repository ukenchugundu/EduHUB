import express from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  createTimetableEntry,
  getBatchTimetableEntries,
  getFacultyNextTimetableClass,
  getFacultyTodayTimetable,
  getStudentTimetableSchedule,
} from "../controllers/timetableController";

const router = express.Router();

router.get("/student/schedule", authenticateToken, getStudentTimetableSchedule);
router.get("/faculty/today", authenticateToken, getFacultyTodayTimetable);
router.get("/faculty/next", authenticateToken, getFacultyNextTimetableClass);
router.get("/batches/:batchId/entries", authenticateToken, getBatchTimetableEntries);
router.post("/entries", authenticateToken, createTimetableEntry);

export default router;
