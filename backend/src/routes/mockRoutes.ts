import express from "express";
import { testSubmissions } from "./studentTestRoutes";

const router = express.Router();

// Mock test data
const mockTests = [
  {
    id: 1,
    title: "Data Structures Test",
    description: "Test on arrays, linked lists, and trees",
    duration_minutes: 120,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    question_count: 3,
    attempt_count: 5,
    questions: [
      {
        id: 1,
        title: "Two Sum",
        description:
          "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        sample_input: "[2,7,11,15]\n9",
        sample_output: "[0,1]",
        test_cases: [
          { input: "[2,7,11,15]\n9", expected_output: "[0,1]" },
          { input: "[3,2,4]\n6", expected_output: "[1,2]" },
        ],
        difficulty: "Easy",
        points: 10,
        time_limit_seconds: 30,
      },
    ],
  },
  {
    id: 2,
    title: "Algorithms Assessment",
    description: "Sorting, searching, and graph algorithms",
    duration_minutes: 90,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: false,
    question_count: 2,
    attempt_count: 3,
    questions: [],
  },
];

const mockResults = [
  {
    attempt_id: 1,
    student_id: "S001",
    student_name: "John Doe",
    status: "Submitted",
    total_score: 85,
    plagiarism_score: 0.15,
    cheating_flags: [],
    is_flagged: false,
    suspicious_events: 2,
    submissions: [
      {
        id: 1,
        status: "Accepted",
        score: 85,
        test_cases_passed: 8,
        total_test_cases: 10,
        execution_time: 150,
      },
    ],
  },
  {
    attempt_id: 2,
    student_id: "S002",
    student_name: "Jane Smith",
    status: "Terminated",
    total_score: 0,
    plagiarism_score: 0.85,
    cheating_flags: [{ type: "excessive_tab_switching", count: 8 }],
    is_flagged: true,
    suspicious_events: 12,
    submissions: [],
  },
];

export const createMockRoutes = () => {
  // Faculty test routes
  router.get("/faculty/tests", (req, res) => {
    res.json(mockTests);
  });

  router.post("/faculty/tests", (req, res) => {
    const { title, description, duration_minutes } = req.body;
    const newTest = {
      id: Date.now(),
      title,
      description,
      duration_minutes,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      question_count: 0,
      attempt_count: 0,
      questions: [],
    };
    mockTests.push(newTest);
    res.json({ success: true, testId: newTest.id });
  });

  router.patch("/faculty/tests/:testId/toggle", (req, res) => {
    const { testId } = req.params;
    const { is_active } = req.body;
    const test = mockTests.find((t) => t.id === parseInt(testId));
    if (test) {
      test.is_active = is_active;
    }
    res.json({ success: true });
  });

  // Test routes
  router.post("/tests/:testId/start", (req, res) => {
    const { testId } = req.params;
    const test = mockTests.find((t) => t.id === parseInt(testId));

    if (!test || !test.is_active) {
      return res.status(400).json({ error: "Test not available" });
    }

    const attempt = {
      id: Date.now(),
      test_id: parseInt(testId),
      student_id: 1,
      start_time: new Date().toISOString(),
      status: "In Progress",
    };

    res.json({
      attempt,
      test,
    });
  });

  router.post("/tests/submit-code", (req, res) => {
    const { attemptId, questionId, code, language } = req.body;

    const submission = {
      id: Date.now(),
      attempt_id: attemptId,
      question_id: questionId,
      code,
      language,
      status: "Accepted",
      score: 85,
      execution_time: 150,
      memory_used: 1024,
      test_cases_passed: 8,
      total_test_cases: 10,
    };

    const execution = {
      status: "Accepted",
      executionTime: 150,
      memoryUsed: 1024,
      testCasesPassed: 8,
      totalTestCases: 10,
    };

    const plagiarism = {
      submissionId: submission.id,
      similarSubmissions: [],
      overallScore: 0.1,
    };

    res.json({
      submission,
      execution,
      plagiarism,
    });
  });

  router.post("/tests/log-cheating", (req, res) => {
    res.json({ success: true });
  });

  router.post("/tests/:attemptId/submit", (req, res) => {
    res.json({ success: true, totalScore: 85 });
  });

  router.post("/tests/:attemptId/terminate", (req, res) => {
    res.json({ success: true });
  });

  router.get("/tests/:testId/results", (req, res) => {
    const { testId } = req.params;
    const results = testSubmissions[testId] || mockResults;

    console.log(
      `[Faculty Results] Test ${testId}: ${results.length} submissions found`,
    );

    res.json(results);
  });

  router.get("/tests/plagiarism/:submissionId", (req, res) => {
    res.json({
      submissionId: parseInt(req.params.submissionId),
      similarSubmissions: [],
      overallScore: 0.1,
    });
  });

  return router;
};
