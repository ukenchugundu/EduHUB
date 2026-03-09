import { Request, Response } from "express";
import pool from "../utils/db";

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

interface TimetableEntryRow {
  id: number;
  batch_id: number;
  faculty_id: number;
  subject: string;
  topic: string | null;
  room: string | null;
  weekday: number | string;
  start_time: string;
  end_time: string;
  batch_name?: string;
  department_name?: string;
  department_code?: string;
  faculty_name?: string | null;
  faculty_designation?: string | null;
}

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

const toLocalDateString = (date: Date): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split("T")[0];
};

const getIsoWeekday = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const toComparableTime = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.length === 5 ? `${value}:00` : value;
};

const withWeekdayLabel = (row: TimetableEntryRow) => ({
  ...row,
  weekday: Number(row.weekday),
  weekday_label: WEEKDAY_LABELS[Number(row.weekday)] ?? "Unknown",
});

const getOccurrenceDate = (
  weekday: number,
  now: Date,
  includeToday: boolean,
): Date => {
  const currentWeekday = getIsoWeekday(now);
  let offset = weekday - currentWeekday;

  if (offset < 0 || (offset === 0 && !includeToday)) {
    offset += 7;
  }

  return addDays(now, offset);
};

const buildStudentScheduleItem = (entry: TimetableEntryRow, sessionDate: Date, now: Date) => {
  const currentTime = now.toTimeString().slice(0, 8);
  const normalizedStart = toComparableTime(entry.start_time);
  const normalizedEnd = toComparableTime(entry.end_time);
  const sessionDateValue = toLocalDateString(sessionDate);
  const isToday = sessionDateValue === toLocalDateString(now);

  return {
    id: entry.id,
    subject: entry.subject,
    topic: entry.topic ?? undefined,
    session_date: sessionDateValue,
    start_time: entry.start_time,
    end_time: entry.end_time,
    faculty_name: entry.faculty_name?.trim() || "Assigned faculty",
    room: entry.room ?? undefined,
    is_active:
      isToday &&
      normalizedStart <= currentTime &&
      currentTime < normalizedEnd,
  };
};

const timetableSelect = `
  SELECT
    te.id,
    te.batch_id,
    te.faculty_id,
    te.subject,
    te.topic,
    te.room,
    te.weekday,
    te.start_time,
    te.end_time,
    b.name AS batch_name,
    d.name AS department_name,
    d.code AS department_code,
    au.full_name AS faculty_name,
    au.designation AS faculty_designation
  FROM timetable_entries te
  JOIN batches b ON te.batch_id = b.id
  JOIN departments d ON b.department_id = d.id
  LEFT JOIN auth_users au ON te.faculty_id = au.auth_user_id
`;

export const getBatchTimetableEntries = async (req: Request, res: Response) => {
  try {
    const { role } = (req as any).user ?? {};
    const batchId = Number(req.params.batchId);

    if (role !== "admin" && role !== "faculty") {
      return res.status(403).json({ error: "Only admin or faculty can view batch timetables" });
    }

    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({ error: "Valid batchId is required" });
    }

    const result = await pool.query<TimetableEntryRow>(
      `${timetableSelect}
       WHERE te.batch_id = $1
       ORDER BY te.weekday ASC, te.start_time ASC, te.subject ASC`,
      [batchId],
    );

    return res.json(result.rows.map(withWeekdayLabel));
  } catch (error) {
    console.error("Error fetching batch timetable entries:", error);
    return res.status(500).json({ error: "Failed to fetch batch timetable entries" });
  }
};

export const createTimetableEntry = async (req: Request, res: Response) => {
  try {
    const { userId, role } = (req as any).user ?? {};
    const { batchId, facultyId, subject, topic, room, weekday, startTime, endTime } = req.body;

    if (role !== "admin") {
      return res.status(403).json({ error: "Only admin can create timetable entries" });
    }

    const parsedBatchId = Number(batchId);
    const parsedFacultyId = Number(facultyId);
    const parsedWeekday = Number(weekday);
    const normalizedSubject = String(subject ?? "").trim();
    const normalizedTopic = String(topic ?? "").trim();
    const normalizedRoom = String(room ?? "").trim();

    if (
      !Number.isInteger(parsedBatchId) ||
      !Number.isInteger(parsedFacultyId) ||
      !Number.isInteger(parsedWeekday) ||
      !normalizedSubject ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        error:
          "batchId, facultyId, weekday, subject, startTime, and endTime are required",
      });
    }

    if (parsedWeekday < 1 || parsedWeekday > 7) {
      return res.status(400).json({ error: "weekday must be between 1 and 7" });
    }

    if (toComparableTime(endTime) <= toComparableTime(startTime)) {
      return res.status(400).json({ error: "endTime must be later than startTime" });
    }

    const batchResult = await pool.query(
      "SELECT id FROM batches WHERE id = $1 LIMIT 1",
      [parsedBatchId],
    );
    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const facultyResult = await pool.query(
      `SELECT auth_user_id
       FROM auth_users
       WHERE auth_user_id = $1 AND role = 'faculty'
       LIMIT 1`,
      [parsedFacultyId],
    );
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ error: "Faculty account not found" });
    }

    const batchConflictResult = await pool.query(
      `SELECT id
       FROM timetable_entries
       WHERE batch_id = $1
         AND weekday = $2
         AND start_time < $4::time
         AND end_time > $3::time
       LIMIT 1`,
      [parsedBatchId, parsedWeekday, startTime, endTime],
    );

    if (batchConflictResult.rows.length > 0) {
      return res.status(409).json({
        error: "This batch already has a timetable entry that overlaps this time range",
      });
    }

    const facultyConflictResult = await pool.query(
      `SELECT id
       FROM timetable_entries
       WHERE faculty_id = $1
         AND weekday = $2
         AND start_time < $4::time
         AND end_time > $3::time
       LIMIT 1`,
      [parsedFacultyId, parsedWeekday, startTime, endTime],
    );

    if (facultyConflictResult.rows.length > 0) {
      return res.status(409).json({
        error: "This faculty member already has a timetable entry that overlaps this time range",
      });
    }

    const insertResult = await pool.query<{ id: number }>(
      `INSERT INTO timetable_entries (
         batch_id,
         faculty_id,
         weekday,
         subject,
         topic,
         room,
         start_time,
         end_time,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        parsedBatchId,
        parsedFacultyId,
        parsedWeekday,
        normalizedSubject,
        normalizedTopic || null,
        normalizedRoom || null,
        startTime,
        endTime,
        Number(userId) || null,
      ],
    );

    const createdResult = await pool.query<TimetableEntryRow>(
      `${timetableSelect}
       WHERE te.id = $1
       LIMIT 1`,
      [insertResult.rows[0].id],
    );

    return res.status(201).json(withWeekdayLabel(createdResult.rows[0]));
  } catch (error) {
    console.error("Error creating timetable entry:", error);
    return res.status(500).json({ error: "Failed to create timetable entry" });
  }
};

export const getFacultyTodayTimetable = async (req: Request, res: Response) => {
  try {
    const { userId, role } = (req as any).user ?? {};
    if (role !== "faculty" && role !== "admin") {
      return res.status(403).json({ error: "Only faculty or admin can view faculty timetables" });
    }

    const now = new Date();
    const today = toLocalDateString(now);
    const todayWeekday = getIsoWeekday(now);
    const currentTime = now.toTimeString().slice(0, 8);

    const result = await pool.query<TimetableEntryRow>(
      `${timetableSelect}
       WHERE te.faculty_id = $1 AND te.weekday = $2
       ORDER BY te.start_time ASC`,
      [userId, todayWeekday],
    );

    return res.json(
      result.rows.map((row) => ({
        ...withWeekdayLabel(row),
        session_date: today,
        is_active:
          toComparableTime(row.start_time) <= currentTime &&
          currentTime < toComparableTime(row.end_time),
      })),
    );
  } catch (error) {
    console.error("Error fetching faculty timetable:", error);
    return res.status(500).json({ error: "Failed to fetch faculty timetable" });
  }
};

export const getFacultyNextTimetableClass = async (req: Request, res: Response) => {
  try {
    const { userId, role } = (req as any).user ?? {};
    if (role !== "faculty" && role !== "admin") {
      return res.status(403).json({ error: "Only faculty or admin can view faculty timetables" });
    }

    const now = new Date();
    const today = toLocalDateString(now);
    const todayWeekday = getIsoWeekday(now);
    const currentTime = now.toTimeString().slice(0, 8);

    const result = await pool.query<TimetableEntryRow>(
      `${timetableSelect}
       WHERE te.faculty_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.json({ message: "No timetable entries found" });
    }

    const nextEntries = result.rows
      .map((row) => {
        const rowWeekday = Number(row.weekday);
        const includeToday =
          rowWeekday === todayWeekday && toComparableTime(row.start_time) > currentTime;

        const occurrenceDate = getOccurrenceDate(rowWeekday, now, includeToday);
        return {
          row,
          occurrenceDate,
        };
      })
      .sort((left, right) => {
        const leftDate = toLocalDateString(left.occurrenceDate);
        const rightDate = toLocalDateString(right.occurrenceDate);
        if (leftDate !== rightDate) {
          return leftDate.localeCompare(rightDate);
        }
        return toComparableTime(left.row.start_time).localeCompare(
          toComparableTime(right.row.start_time),
        );
      });

    const nextEntry = nextEntries[0];
    const sessionDate = toLocalDateString(nextEntry.occurrenceDate);

    return res.json({
      ...withWeekdayLabel(nextEntry.row),
      session_date: sessionDate,
      nextClassType: sessionDate === today ? "today" : "upcoming",
    });
  } catch (error) {
    console.error("Error fetching next faculty timetable class:", error);
    return res.status(500).json({ error: "Failed to fetch next faculty timetable class" });
  }
};

export const getStudentTimetableSchedule = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user ?? {};
    const now = new Date();
    const todayWeekday = getIsoWeekday(now);

    const batchId = await getStudentBatchId(userId);

    if (batchId === null) {
      return res.json({ today: [], upcoming: [] });
    }

    let result;
    try {
      result = await pool.query<TimetableEntryRow>(
        `${timetableSelect}
         WHERE te.batch_id = $1
         ORDER BY te.weekday ASC, te.start_time ASC`,
        [batchId],
      );
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return res.json({ today: [], upcoming: [] });
      }

      throw error;
    }

    const today = result.rows
      .filter((row) => Number(row.weekday) === todayWeekday)
      .map((row) => buildStudentScheduleItem(row, now, now))
      .sort((left, right) =>
        toComparableTime(left.start_time).localeCompare(toComparableTime(right.start_time)),
      );

    const upcoming = result.rows
      .map((row) => ({
        row,
        occurrenceDate: getOccurrenceDate(Number(row.weekday), now, false),
      }))
      .sort((left, right) => {
        const leftDate = toLocalDateString(left.occurrenceDate);
        const rightDate = toLocalDateString(right.occurrenceDate);
        if (leftDate !== rightDate) {
          return leftDate.localeCompare(rightDate);
        }
        return toComparableTime(left.row.start_time).localeCompare(
          toComparableTime(right.row.start_time),
        );
      })
      .slice(0, 10)
      .map(({ row, occurrenceDate }) => buildStudentScheduleItem(row, occurrenceDate, now));

    return res.json({ today, upcoming });
  } catch (error) {
    console.error("Error fetching student timetable schedule:", error);
    return res.status(500).json({ error: "Failed to fetch student timetable schedule" });
  }
};
