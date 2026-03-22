import { Request, Response } from "express";
import pool from "../utils/db";
import {
  getAcademicTableNames,
  getStudentBatchIdForAuthUser,
} from "../utils/studentPortalAccess";

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
  return getStudentBatchIdForAuthUser(pool, userId);
};

let timetableTablesReadyPromise: Promise<void> | null = null;

const ensureTimetableTables = async (): Promise<void> => {
  if (!timetableTablesReadyPromise) {
    timetableTablesReadyPromise = (async () => {
      const { batchTableName } = await getAcademicTableNames(pool);
      const batchReferenceClause = batchTableName
        ? ` REFERENCES ${batchTableName}(id) ON DELETE CASCADE`
        : "";

      await pool.query(`
        CREATE TABLE IF NOT EXISTS timetable_entries (
          id SERIAL PRIMARY KEY,
          batch_id INTEGER NOT NULL${batchReferenceClause},
          faculty_id INTEGER REFERENCES auth_users(auth_user_id) ON DELETE SET NULL,
          subject VARCHAR(255) NOT NULL,
          topic TEXT,
          room VARCHAR(255),
          weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          created_by INTEGER REFERENCES auth_users(auth_user_id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS batch_id INTEGER",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS faculty_id INTEGER",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS subject VARCHAR(255)",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS topic TEXT",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS room VARCHAR(255)",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS weekday INTEGER",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS start_time TIME",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS end_time TIME",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS created_by INTEGER",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      );
      await pool.query(
        "ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      );

      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_timetable_entries_batch_weekday ON timetable_entries (batch_id, weekday, start_time)",
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_timetable_entries_faculty_weekday ON timetable_entries (faculty_id, weekday, start_time)",
      );
    })().catch((error) => {
      timetableTablesReadyPromise = null;
      throw error;
    });
  }

  await timetableTablesReadyPromise;
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

const getTimetableSelect = async (): Promise<string | null> => {
  const { batchTableName, departmentTableName } = await getAcademicTableNames(pool);
  if (!batchTableName || !departmentTableName) {
    return null;
  }

  return `
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
    JOIN ${batchTableName} b ON te.batch_id = b.id
    JOIN ${departmentTableName} d ON b.department_id = d.id
    LEFT JOIN auth_users au ON te.faculty_id = au.auth_user_id
  `;
};

export const getBatchTimetableEntries = async (req: Request, res: Response) => {
  try {
    await ensureTimetableTables();
    const { role } = (req as any).user ?? {};
    const batchId = Number(req.params.batchId);
    const timetableSelect = await getTimetableSelect();

    if (role !== "admin" && role !== "faculty") {
      return res.status(403).json({ error: "Only admin or faculty can view batch timetables" });
    }

    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({ error: "Valid batchId is required" });
    }
    if (!timetableSelect) {
      return res.json([]);
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
    await ensureTimetableTables();
    const { userId, role } = (req as any).user ?? {};
    const { batchId, facultyId, subject, topic, room, weekday, startTime, endTime } = req.body;
    const timetableSelect = await getTimetableSelect();
    const { batchTableName } = await getAcademicTableNames(pool);

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
    if (!batchTableName || !timetableSelect) {
      return res.status(500).json({ error: "Batch timetable tables are not configured" });
    }

    const batchResult = await pool.query(
      `SELECT id FROM ${batchTableName} WHERE id = $1 LIMIT 1`,
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

const AUTO_GENERATE_SUBJECTS = [
  "Data Structures & Algorithms",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Machine Learning",
  "Artificial Intelligence",
  "Web Technologies",
  "Cloud Computing",
  "Cybersecurity",
];

const AUTO_GENERATE_SLOTS = [
  { startTime: "08:30:00", endTime: "09:30:00" },
  { startTime: "09:30:00", endTime: "10:30:00" },
  { startTime: "10:45:00", endTime: "11:45:00" },
  { startTime: "11:45:00", endTime: "12:45:00" },
  { startTime: "13:30:00", endTime: "14:30:00" },
  { startTime: "14:30:00", endTime: "15:30:00" },
];

const WEEKDAY_KEYWORDS: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

export const clearBatchTimetableEntries = async (req: Request, res: Response) => {
  try {
    await ensureTimetableTables();
    const { role } = (req as any).user ?? {};
    if (role !== "admin") {
      return res.status(403).json({ error: "Only admin can clear timetable entries" });
    }

    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({ error: "Valid batchId is required" });
    }

    await pool.query(
      `DELETE FROM timetable_entries WHERE batch_id = $1`,
      [batchId],
    );

    return res.status(204).send();
  } catch (error) {
    console.error("Error clearing batch timetable entries:", error);
    return res.status(500).json({ error: "Failed to clear batch timetable entries" });
  }
};

export const autoGenerateBatchTimetable = async (req: Request, res: Response) => {
  try {
    await ensureTimetableTables();
    const { role } = (req as any).user ?? {};
    const timetableSelect = await getTimetableSelect();
    const { batchTableName } = await getAcademicTableNames(pool);
    if (role !== "admin") {
      return res.status(403).json({ error: "Only admin can auto-generate timetables" });
    }

    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({ error: "Valid batchId is required" });
    }

    const { query = "", clearExisting = true } = req.body ?? {};
    const normalizedQuery = String(query ?? "").toLowerCase();
    if (!batchTableName || !timetableSelect) {
      return res.status(500).json({ error: "Batch timetable tables are not configured" });
    }

    // Verify batch exists
    const batchResult = await pool.query(
      `SELECT id FROM ${batchTableName} WHERE id = $1 LIMIT 1`,
      [batchId],
    );
    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }

    if (clearExisting) {
      await pool.query(
        `DELETE FROM timetable_entries WHERE batch_id = $1`,
        [batchId],
      );
    }

    // Determine subjects to use based on query keywords (fallback to all)
    const preferredSubjects = AUTO_GENERATE_SUBJECTS.filter((subject) => {
      const lower = subject.toLowerCase();
      return normalizedQuery.includes(lower) || normalizedQuery.includes(lower.split(" ")[0]);
    });
    const subjects = preferredSubjects.length > 0 ? preferredSubjects : AUTO_GENERATE_SUBJECTS;

    // Determine weekdays to generate
    const selectedWeekdays = Object.entries(WEEKDAY_KEYWORDS)
      .filter(([word]) => normalizedQuery.includes(word))
      .map(([, day]) => day);

    const weekdays = selectedWeekdays.length > 0 ? selectedWeekdays : [1, 2, 3, 4, 5];

    // Fetch faculty list to assign sessions
    const facultyResult = await pool.query<{ auth_user_id: number }>(
      `SELECT auth_user_id FROM auth_users WHERE role = 'faculty' ORDER BY full_name`,
    );
    const facultyIds = facultyResult.rows.map((row) => Number(row.auth_user_id));

    if (facultyIds.length === 0) {
      return res.status(400).json({ error: "No faculty accounts available for timetable generation" });
    }

    // Load existing entries for conflict checking (excluding this batch)
    const existingEntries = await pool.query<
      { faculty_id: number; weekday: number; start_time: string; end_time: string }
    >(
      `SELECT faculty_id, weekday, start_time, end_time
       FROM timetable_entries
       WHERE batch_id != $1
         AND weekday = ANY($2::int[])
         AND start_time = ANY($3::time[])
         AND end_time = ANY($4::time[])`,
      [batchId, weekdays, AUTO_GENERATE_SLOTS.map((s) => s.startTime), AUTO_GENERATE_SLOTS.map((s) => s.endTime)],
    );

    const occupied = new Set(
      existingEntries.rows.map(
        (entry) => `${entry.faculty_id}-${entry.weekday}-${entry.start_time}-${entry.end_time}`,
      ),
    );

    const createdEntries: TimetableEntryRow[] = [];

    let subjectIndex = 0;
    let facultyIndex = 0;

    for (const weekday of weekdays) {
      for (const slot of AUTO_GENERATE_SLOTS) {
        const subject = subjects[subjectIndex % subjects.length];
        subjectIndex += 1;

        // Attempt to find an available faculty member
        let assignedFacultyId = facultyIds[facultyIndex % facultyIds.length];
        let attempts = 0;
        while (
          attempts < facultyIds.length &&
          occupied.has(`${assignedFacultyId}-${weekday}-${slot.startTime}-${slot.endTime}`)
        ) {
          facultyIndex += 1;
          attempts += 1;
          assignedFacultyId = facultyIds[facultyIndex % facultyIds.length];
        }

        facultyIndex += 1;

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
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            batchId,
            assignedFacultyId,
            weekday,
            subject,
            null,
            null,
            slot.startTime,
            slot.endTime,
            null,
          ],
        );

        const created = await pool.query<TimetableEntryRow>(
          `${timetableSelect}
           WHERE te.id = $1
           LIMIT 1`,
          [insertResult.rows[0].id],
        );

        if (created.rows.length > 0) {
          createdEntries.push(withWeekdayLabel(created.rows[0]));
        }
      }
    }

    return res.json(createdEntries);
  } catch (error) {
    console.error("Error auto-generating timetable entries:", error);
    return res.status(500).json({ error: "Failed to auto-generate timetable entries" });
  }
};

export const getFacultyTodayTimetable = async (req: Request, res: Response) => {
  try {
    await ensureTimetableTables();
    const { userId, role } = (req as any).user ?? {};
    const timetableSelect = await getTimetableSelect();
    if (role !== "faculty" && role !== "admin") {
      return res.status(403).json({ error: "Only faculty or admin can view faculty timetables" });
    }
    if (!timetableSelect) {
      return res.json([]);
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
    await ensureTimetableTables();
    const { userId, role } = (req as any).user ?? {};
    const timetableSelect = await getTimetableSelect();
    if (role !== "faculty" && role !== "admin") {
      return res.status(403).json({ error: "Only faculty or admin can view faculty timetables" });
    }
    if (!timetableSelect) {
      return res.json({ message: "No timetable entries found" });
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
    await ensureTimetableTables();
    const { userId } = (req as any).user ?? {};
    const now = new Date();
    const todayWeekday = getIsoWeekday(now);
    const timetableSelect = await getTimetableSelect();

    const batchId = await getStudentBatchId(userId);

    if (batchId === null || !timetableSelect) {
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
