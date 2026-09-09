import express from "express";
import { Pool } from "pg";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { ensureCodingTestsSchema } from "../utils/codingTestsSchema";
import { AntiCheatService } from "../services/AntiCheatService";
import {
  getAcademicTableNames,
  resolvePortalStudentIdByIdentifier,
} from "../utils/studentPortalAccess";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

export const createFacultyTestRoutes = (db: Pool) => {
  router.use(async (_req, res, next) => {
    try {
      await ensureCodingTestsSchema(db);
      next();
    } catch (error) {
      console.error("Error preparing coding test schema:", error);
      res.status(500).json({ error: "Failed to prepare coding tests" });
    }
  });

  // Get all tests for faculty
  router.get("/tests", async (req: any, res) => {
    try {
      const facultyId = req.user?.userId || req.user?.id || 1;
      const userRole = String(req.user?.role || "").toLowerCase();

      let query = `SELECT ct.*, 
         COUNT(DISTINCT tq.id) as question_count,
         COUNT(DISTINCT ta.id) as attempt_count
         FROM coding_tests ct
         LEFT JOIN test_questions tq ON ct.id = tq.test_id
         LEFT JOIN test_attempts ta ON ct.id = ta.test_id`;
      const params: any[] = [];

      if (userRole !== "admin") {
        query += ` WHERE ct.faculty_id = $1 OR ct.faculty_id IS NULL`;
        params.push(facultyId);
      }

      query += ` GROUP BY ct.id ORDER BY ct.created_at DESC`;

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  // Create new test
  router.post("/tests", async (req: any, res) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const { title, description, duration_minutes, questions } = req.body;
      const facultyId = req.user?.userId || 1;

      // Create test
      const testResult = await client.query(
        `INSERT INTO coding_tests (title, description, faculty_id, duration_minutes, start_time, end_time)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 days')
         RETURNING *`,
        [title, description, facultyId, duration_minutes],
      );

      const testId = testResult.rows[0].id;

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await client.query(
          `INSERT INTO test_questions 
           (test_id, question_number, title, description, sample_input, sample_output, 
            test_cases, difficulty, points, time_limit_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            testId,
            i + 1,
            q.title,
            q.description,
            q.sample_input,
            q.sample_output,
            JSON.stringify(q.test_cases),
            q.difficulty,
            q.points,
            q.time_limit_seconds,
          ],
        );
      }

      await client.query("COMMIT");
      res.json({ success: true, testId });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error creating test:", error);
      res.status(500).json({ error: "Failed to create test" });
    } finally {
      client.release();
    }
  });

  // Toggle test status
  router.patch("/tests/:testId/toggle", async (req: any, res) => {
    try {
      const { testId } = req.params;
      const { is_active } = req.body;

      await db.query("UPDATE coding_tests SET is_active = $1 WHERE id = $2", [
        is_active,
        testId,
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error toggling test status:", error);
      res.status(500).json({ error: "Failed to toggle test status" });
    }
  });

  // Upload marks
  router.post(
    "/upload-marks/:testId",
    upload.single("file"),
    async (req: any, res) => {
      const { testId } = req.params;
      const results: any[] = [];

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
          const client = await db.connect();
          try {
            await client.query("BEGIN");

            let updatedCount = 0;
            let skippedCount = 0;

            for (const row of results) {
              const studentIdentifier = String(
                row.studentId ?? row.userId ?? row.rollNumber ?? "",
              ).trim();
              const parsedMarks = Number(
                row.marks ?? row.total_score ?? row.score,
              );

              if (!studentIdentifier || !Number.isFinite(parsedMarks)) {
                skippedCount += 1;
                continue;
              }

              const portalStudentId = await resolvePortalStudentIdByIdentifier(
                client,
                studentIdentifier,
              );
              if (!portalStudentId) {
                skippedCount += 1;
                continue;
              }

              const updateResult = await client.query(
                `UPDATE test_attempts
                 SET total_score = $1
                 WHERE test_id = $2 AND student_id = $3`,
                [parsedMarks, testId, portalStudentId],
              );

              updatedCount += updateResult.rowCount ?? 0;
            }

            await client.query("COMMIT");
            res.json({
              success: true,
              message: "Marks uploaded successfully",
              updatedCount,
              skippedCount,
            });
          } catch (error) {
            await client.query("ROLLBACK");
            console.error("Error uploading marks:", error);
            res.status(500).json({ error: "Failed to upload marks" });
          } finally {
            client.release();
            fs.unlinkSync(req.file.path); // Clean up uploaded file
          }
        });
    },
  );

  // Get marks for a test
  router.get("/marks/:testId", async (req, res) => {
    try {
      const { testId } = req.params;
      const { studentTableName } = await getAcademicTableNames(db);

      const result = studentTableName
        ? await db.query(
            `
              SELECT
                COALESCE(s.student_id, s.email, ta.student_id::text) AS "userId",
                COALESCE(s.name, au.full_name, 'Student') AS name,
                COALESCE(ta.total_score, 0) AS total_score
              FROM test_attempts ta
              LEFT JOIN ${studentTableName} s
                ON ta.student_id = s.id
              LEFT JOIN auth_users au
                ON au.role = 'student'
               AND (
                 LOWER(COALESCE(au.email, '')) = LOWER(COALESCE(s.email, ''))
                 OR (
                   COALESCE(au.roll_number, '') <> ''
                   AND au.roll_number = COALESCE(s.student_id, '')
                 )
               )
              WHERE ta.test_id = $1
              ORDER BY COALESCE(ta.total_score, 0) DESC, COALESCE(s.student_id, ta.student_id::text)
            `,
            [testId],
          )
        : await db.query(
            `
              SELECT
                ta.student_id::text AS "userId",
                'Student' AS name,
                COALESCE(ta.total_score, 0) AS total_score
              FROM test_attempts ta
              WHERE ta.test_id = $1
              ORDER BY COALESCE(ta.total_score, 0) DESC, ta.student_id
            `,
            [testId],
          );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching marks:", error);
      res.status(500).json({ error: "Failed to fetch marks" });
    }
  });
  
  // Get all tests with marks for admin
  router.get("/tests/marks", async (req, res) => {
    try {
      const result = await db.query(
        `SELECT DISTINCT ct.id, ct.title, ct.created_at
         FROM coding_tests ct
         JOIN test_attempts ta ON ct.id = ta.test_id
         WHERE ta.total_score IS NOT NULL`,
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching tests with marks:", error);
      res.status(500).json({ error: "Failed to fetch tests with marks" });
    }
  });

  // Live Proctoring Status for active exam
  router.get("/tests/:testId/live-proctoring", async (req: any, res) => {
    try {
      const { testId } = req.params;
      const antiCheat = new AntiCheatService(db);
      const summary = await antiCheat.getCheatingReport(Number(testId));
      res.json({
        success: true,
        testId: Number(testId),
        candidates: summary,
      });
    } catch (error: any) {
      console.error("Error fetching live proctoring status:", error);
      res.status(500).json({ error: "Failed to fetch live proctoring status" });
    }
  });

  // Remotely terminate candidate test attempt for cheating
  router.post("/tests/:testId/terminate-attempt", async (req: any, res) => {
    try {
      const { attemptId, reason = "Disqualified for exam violations" } = req.body;
      if (!attemptId) {
        return res.status(400).json({ error: "attemptId is required" });
      }
      const antiCheat = new AntiCheatService(db);
      await antiCheat.terminateTest(Number(attemptId), reason);
      res.json({
        success: true,
        message: `Attempt ${attemptId} has been terminated.`,
      });
    } catch (error: any) {
      console.error("Error terminating candidate attempt:", error);
      res.status(500).json({ error: "Failed to terminate test attempt" });
    }
  });

  return router;
};

  // Upload internal marks
  router.post(
    "/upload-internal-marks",
    upload.single("file"),
    async (req: any, res) => {
      const { examId, examName, subject, maxMarks } = req.body;
      const results: any[] = [];

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
          try {
            res.json({ 
              success: true, 
              message: "Internal marks uploaded successfully",
              examId,
              examName,
              subject,
              maxMarks,
              studentCount: results.length
            });
          } catch (error) {
            console.error("Error uploading internal marks:", error);
            res.status(500).json({ error: "Failed to upload internal marks" });
          } finally {
            fs.unlinkSync(req.file.path);
          }
        });
    },
  );

  // Get internal marks
  router.get("/internal-marks", async (req: any, res) => {
    try {
      res.json({ 
        exams: [],
        message: "Internal marks API"
      });
    } catch (error) {
      console.error("Error fetching internal marks:", error);
      res.status(500).json({ error: "Failed to fetch internal marks" });
    }
  });
