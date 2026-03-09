import express from "express";
import { Pool } from "pg";
import { AntiCheatService } from "../services/AntiCheatService";
import { CodeExecutionService } from "../services/CodeExecutionService";

const router = express.Router();

export const createTestRoutes = (db: Pool) => {
  const antiCheatService = new AntiCheatService(db);
  const codeExecutionService = new CodeExecutionService();

  // Start test attempt
  router.post("/:testId/start", async (req: any, res) => {
    try {
      const { testId } = req.params;
      const studentId = req.user?.userId || 1; // From auth middleware

      // Check if test is active
      const testResult = await db.query(
        "SELECT * FROM coding_tests WHERE id = $1 AND is_active = true AND start_time <= NOW() AND end_time > NOW()",
        [testId],
      );

      if (testResult.rows.length === 0) {
        return res.status(400).json({ error: "Test not available" });
      }

      const test = testResult.rows[0];

      // Check existing attempt
      const existingAttempt = await db.query(
        "SELECT * FROM test_attempts WHERE test_id = $1 AND student_id = $2",
        [testId, studentId],
      );

      if (existingAttempt.rows.length > 0 && !test.allow_multiple_attempts) {
        return res.status(400).json({ error: "Test already attempted" });
      }

      // Create new attempt
      const attemptResult = await db.query(
        `INSERT INTO test_attempts (test_id, student_id, status) 
         VALUES ($1, $2, 'In Progress') RETURNING *`,
        [testId, studentId],
      );

      // Get test questions
      const questionsResult = await db.query(
        "SELECT * FROM test_questions WHERE test_id = $1 ORDER BY question_number",
        [testId],
      );

      res.json({
        attempt: attemptResult.rows[0],
        test: {
          ...test,
          questions: questionsResult.rows,
        },
      });
    } catch (error) {
      console.error("Error starting test:", error);
      res.status(500).json({ error: "Failed to start test" });
    }
  });

  // Submit code for question
  router.post("/submit-code", async (req: any, res) => {
    try {
      const { attemptId, questionId, code, language } = req.body;

      // Get question details
      const questionResult = await db.query(
        "SELECT * FROM test_questions WHERE id = $1",
        [questionId],
      );

      if (questionResult.rows.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }

      const question = questionResult.rows[0];

      // Execute code
      const executionResult = await codeExecutionService.executeCode(
        code,
        language,
        question.test_cases,
        question.time_limit_seconds,
        question.memory_limit_mb,
      );

      // Calculate score
      const score =
        executionResult.status === "Accepted"
          ? question.points
          : Math.floor(
              (executionResult.testCasesPassed /
                executionResult.totalTestCases) *
                question.points,
            );

      // Save submission
      const submissionResult = await db.query(
        `INSERT INTO question_submissions 
         (attempt_id, question_id, code, language, status, score, execution_time, memory_used, test_cases_passed, total_test_cases)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          attemptId,
          questionId,
          code,
          language,
          executionResult.status,
          score,
          executionResult.executionTime,
          executionResult.memoryUsed,
          executionResult.testCasesPassed,
          executionResult.totalTestCases,
        ],
      );

      // Run plagiarism detection
      const plagiarismResult = await antiCheatService.detectPlagiarism(
        submissionResult.rows[0].id,
      );

      res.json({
        submission: submissionResult.rows[0],
        execution: executionResult,
        plagiarism: plagiarismResult,
      });
    } catch (error) {
      console.error("Error submitting code:", error);
      res.status(500).json({ error: "Failed to submit code" });
    }
  });

  // Log cheating event
  router.post("/log-cheating", async (req: any, res) => {
    try {
      const { attemptId, type, data, timestamp } = req.body;

      await antiCheatService.logCheatingEvent(attemptId, {
        type,
        data,
        timestamp: new Date(timestamp),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error logging cheating event:", error);
      res.status(500).json({ error: "Failed to log event" });
    }
  });

  // Submit test
  router.post("/:attemptId/submit", async (req: any, res) => {
    try {
      const { attemptId } = req.params;

      // Calculate total score
      const scoreResult = await db.query(
        "SELECT SUM(score) as total_score FROM question_submissions WHERE attempt_id = $1",
        [attemptId],
      );

      const totalScore = scoreResult.rows[0].total_score || 0;

      // Update attempt
      await db.query(
        `UPDATE test_attempts 
         SET status = 'Submitted', end_time = CURRENT_TIMESTAMP, total_score = $2
         WHERE id = $1`,
        [attemptId, totalScore],
      );

      res.json({ success: true, totalScore });
    } catch (error) {
      console.error("Error submitting test:", error);
      res.status(500).json({ error: "Failed to submit test" });
    }
  });

  // Terminate test
  router.post("/:attemptId/terminate", async (req: any, res) => {
    try {
      const { attemptId } = req.params;
      const { reason } = req.body;

      await antiCheatService.terminateTest(parseInt(attemptId), reason);

      res.json({ success: true });
    } catch (error) {
      console.error("Error terminating test:", error);
      res.status(500).json({ error: "Failed to terminate test" });
    }
  });

  // Get test results (faculty)
  router.get("/:testId/results", async (req: any, res) => {
    try {
      const { testId } = req.params;

      const results = await antiCheatService.getCheatingReport(
        parseInt(testId),
      );

      // Get submissions for each attempt
      for (const result of results) {
        const submissionsResult = await db.query(
          "SELECT * FROM question_submissions WHERE attempt_id = $1",
          [result.attempt_id],
        );
        result.submissions = submissionsResult.rows;
      }

      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // Get plagiarism details
  router.get("/plagiarism/:submissionId", async (req: any, res) => {
    try {
      const { submissionId } = req.params;

      const plagiarismResult = await antiCheatService.detectPlagiarism(
        parseInt(submissionId),
      );

      res.json(plagiarismResult);
    } catch (error) {
      console.error("Error fetching plagiarism details:", error);
      res.status(500).json({ error: "Failed to fetch plagiarism details" });
    }
  });

  // Get list of available tests for student
  router.get("/available", async (req: any, res) => {
    try {
      const studentId = req.user?.userId || 1;

      // Get all active tests that haven't ended yet
      const testsResult = await db.query(
        `SELECT ct.*, 
         (SELECT COUNT(*) FROM test_attempts WHERE test_id = ct.id AND student_id = $1) as attempt_count
         FROM coding_tests ct 
         WHERE ct.is_active = true 
         AND ct.start_time <= NOW() 
         AND ct.end_time > NOW()
         ORDER BY ct.start_time DESC`,
        [studentId],
      );

      res.json(testsResult.rows);
    } catch (error) {
      console.error("Error fetching available tests:", error);
      res.status(500).json({ error: "Failed to fetch available tests" });
    }
  });

  // Get test details with questions
  router.get("/:testId", async (req: any, res) => {
    try {
      const { testId } = req.params;

      const testResult = await db.query(
        "SELECT * FROM coding_tests WHERE id = $1",
        [testId],
      );

      if (testResult.rows.length === 0) {
        return res.status(404).json({ error: "Test not found" });
      }

      const questionsResult = await db.query(
        "SELECT id, question_number, title, description, input_format, output_format, constraints, sample_input, sample_output, difficulty, points, time_limit_seconds, memory_limit_mb, starter_code FROM test_questions WHERE test_id = $1 ORDER BY question_number",
        [testId],
      );

      // Add starter code if not present in database
      const questions = questionsResult.rows.map((q: any) => ({
        ...q,
        starterCode: q.starter_code || getDefaultStarterCode(q.language || 'python'),
        testCases: q.sample_input ? [
          { input: q.sample_input, output: q.sample_output }
        ] : [],
      }));

      res.json({
        ...testResult.rows[0],
        questions,
      });
    } catch (error) {
      console.error("Error fetching test details:", error);
      res.status(500).json({ error: "Failed to fetch test details" });
    }
  });

  // Helper function to get default starter code
  const getDefaultStarterCode = (language: string) => {
    const starterCodes: Record<string, string> = {
      python: `class Solution:
    def solve(self):
        # Write your code here
        pass`,
      javascript: `function solve() {
    // Write your code here
}`,
      java: `public class Solution {
    public static void main(String[] args) {
        // Write your code here
    }
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    return 0;
}`,
    };
    return starterCodes[language.toLowerCase()] || starterCodes.python;
  };

  // Get student's test attempts
  router.get("/my-attempts", async (req: any, res) => {
    try {
      const studentId = req.user?.userId || 1;

      const attemptsResult = await db.query(
        `SELECT ta.*, ct.title as test_title, ct.duration_minutes
         FROM test_attempts ta
         JOIN coding_tests ct ON ta.test_id = ct.id
         WHERE ta.student_id = $1
         ORDER BY ta.start_time DESC`,
        [studentId],
      );

      res.json(attemptsResult.rows);
    } catch (error) {
      console.error("Error fetching test attempts:", error);
      res.status(500).json({ error: "Failed to fetch test attempts" });
    }
  });

  // Run code (test locally without saving)
  router.post("/run-code", async (req: any, res) => {
    try {
      const { code, language, questionId } = req.body;

      // Get question details
      const questionResult = await db.query(
        "SELECT * FROM test_questions WHERE id = $1",
        [questionId],
      );

      if (questionResult.rows.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }

      const question = questionResult.rows[0];
      
      // Parse test cases from JSON if stored as string
      let testCases = question.test_cases;
      if (typeof testCases === 'string') {
        testCases = JSON.parse(testCases);
      }

      // Execute code
      const executionResult = await codeExecutionService.executeCode(
        code,
        language,
        testCases || [],
        question.time_limit_seconds || 30,
        question.memory_limit_mb || 256,
      );

      res.json(executionResult);
    } catch (error) {
      console.error("Error running code:", error);
      res.status(500).json({ error: "Failed to run code" });
    }
  });

  return router;
};
