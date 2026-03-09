import { Router } from "express";

// In-memory storage for test submissions and quiz submissions
const testSubmissions: Record<string, any[]> = {};
const quizSubmissions: Record<string, any[]> = {};

const router = Router();

// Get available tests for student
router.get("/tests", (req, res) => {
  const mockTests = [
    {
      id: "1",
      title: "Data Structures Assessment",
      description: "Arrays, Linked Lists, Stacks, and Queues",
      duration: 90,
      startTime: "2024-03-15T10:00:00Z",
      endTime: "2024-03-15T11:30:00Z",
      status: "active",
      difficulty: "Medium",
      totalQuestions: 5,
    },
    {
      id: "2",
      title: "Algorithm Design Test",
      description: "Sorting, searching, and graph algorithms",
      duration: 120,
      startTime: "2024-03-20T14:00:00Z",
      endTime: "2024-03-20T16:00:00Z",
      status: "upcoming",
      difficulty: "Hard",
      totalQuestions: 6,
    },
    {
      id: "3",
      title: "Basic Programming Quiz",
      description: "Variables, loops, and functions",
      duration: 60,
      startTime: "2024-03-10T09:00:00Z",
      endTime: "2024-03-10T10:00:00Z",
      status: "completed",
      difficulty: "Easy",
      totalQuestions: 4,
    },
  ];

  res.json(mockTests);
});

// Get specific test details
router.get("/test/:testId", (req, res) => {
  const { testId } = req.params;

  const mockTest = {
    id: testId,
    title: "Data Structures Assessment",
    duration: 90,
    endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    questions: [
      {
        id: "q1",
        title: "Two Sum",
        description:
          "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        difficulty: "Easy",
        testCases: [
          { input: "[2,7,11,15], 9", output: "[0,1]" },
          { input: "[3,2,4], 6", output: "[1,2]" },
          { input: "[3,3], 6", output: "[0,1]" },
        ],
        starterCode:
          'def twoSum(nums, target):\n    """\n    :type nums: List[int]\n    :type target: int\n    :rtype: List[int]\n    """\n    # Your code here\n    pass',
        language: "python",
      },
      {
        id: "q2",
        title: "Valid Parentheses",
        description:
          "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        difficulty: "Easy",
        testCases: [
          { input: "()", output: "true" },
          { input: "()[]{}", output: "true" },
          { input: "(]", output: "false" },
          { input: "([)]", output: "false" },
          { input: "{[]}", output: "true" },
        ],
        starterCode:
          'def isValid(s):\n    """\n    :type s: str\n    :rtype: bool\n    """\n    # Your code here\n    pass',
        language: "python",
      },
      {
        id: "q3",
        title: "Merge Two Sorted Lists",
        description:
          "You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists in a one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
        difficulty: "Easy",
        testCases: [
          { input: "[1,2,4], [1,3,4]", output: "[1,1,2,3,4,4]" },
          { input: "[], []", output: "[]" },
          { input: "[], [0]", output: "[0]" },
        ],
        starterCode:
          '# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def mergeTwoLists(self, list1, list2):\n        """\n        :type list1: ListNode\n        :type list2: ListNode\n        :rtype: ListNode\n        """\n        # Your code here\n        pass',
        language: "python",
      },
    ],
  };

  res.json(mockTest);
});

// Run code against test cases
router.post("/run-code", (req, res) => {
  const { code, language, testCases } = req.body;

  // Mock code execution results
  const results = testCases.map((testCase: any, index: number) => ({
    passed: Math.random() > 0.3, // 70% pass rate for demo
    output: `Test case ${index + 1} result`,
    expected: testCase.output,
    actual: testCase.output,
  }));

  res.json({
    success: true,
    results,
    executionTime: Math.floor(Math.random() * 100) + 50,
  });
});

// Submit test
router.post("/submit-test", (req, res) => {
  const { testId, submissions } = req.body;

  // Generate mock student data
  const studentId = `S${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
  const studentNames = [
    "John Doe",
    "Jane Smith",
    "Alice Johnson",
    "Bob Wilson",
    "Emma Davis",
    "Mike Brown",
  ];
  const studentName =
    studentNames[Math.floor(Math.random() * studentNames.length)];

  // Calculate score based on submissions
  const totalQuestions = Object.keys(submissions).length;
  const baseScore = Math.floor(Math.random() * 40) + 60; // 60-100 range

  // Create submission record
  const submissionRecord = {
    attemptId: Date.now(),
    studentId,
    studentName,
    status: "Submitted",
    totalScore: baseScore,
    plagiarismScore: Math.random() * 0.3, // 0-30% plagiarism
    cheatingFlags: [],
    isFlagged: false,
    suspiciousEvents: Math.floor(Math.random() * 3),
    submissions: Object.keys(submissions).map((questionId, index) => ({
      id: Date.now() + index,
      questionId,
      code: submissions[questionId],
      status: Math.random() > 0.2 ? "Accepted" : "Wrong Answer",
      score: Math.floor(baseScore / totalQuestions),
      testCasesPassed: Math.floor(Math.random() * 8) + 2,
      totalTestCases: 10,
      executionTime: Math.floor(Math.random() * 200) + 50,
    })),
    submittedAt: new Date().toISOString(),
  };

  // Store in memory
  if (!testSubmissions[testId]) {
    testSubmissions[testId] = [];
  }
  testSubmissions[testId].push(submissionRecord);

  console.log(
    `[Student Test] Test ${testId} submitted by ${studentName} (${studentId}) - Score: ${baseScore}`,
  );

  res.json({
    success: true,
    message: "Test submitted successfully",
    submissionId: `sub_${Date.now()}`,
    score: baseScore,
  });
});

// Log cheat events
router.post("/cheat-event", (req, res) => {
  const { testId, eventType, timestamp } = req.body;

  console.log(`[Anti-Cheat] Test ${testId}: ${eventType} at ${timestamp}`);

  res.json({ success: true });
});

// Get quiz results for faculty (add this new endpoint)
router.get("/quiz-results/:quizId", (req, res) => {
  const { quizId } = req.params;
  const results = quizSubmissions[quizId] || [];

  console.log(
    `[Faculty] Fetching quiz results for quiz ${quizId}: ${results.length} submissions`,
  );

  res.json(results);
});

// Submit quiz
router.post("/submit-quiz", (req, res) => {
  const { quizId, answers, timeSpent } = req.body;

  // Generate mock student data
  const studentId = `S${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
  const studentNames = [
    "John Doe",
    "Jane Smith",
    "Alice Johnson",
    "Bob Wilson",
    "Emma Davis",
    "Mike Brown",
  ];
  const studentName =
    studentNames[Math.floor(Math.random() * studentNames.length)];

  // Calculate score based on answers
  const totalQuestions = Object.keys(answers).length;
  const correctAnswers =
    Math.floor(Math.random() * totalQuestions * 0.8) +
    Math.floor(totalQuestions * 0.2); // 20-100% correct
  const totalScore = Math.round((correctAnswers / totalQuestions) * 100);

  // Create submission record
  const submissionRecord = {
    attemptId: Date.now(),
    studentId,
    studentName,
    status: "Completed",
    totalScore,
    correctAnswers,
    totalQuestions,
    timeSpent: timeSpent || Math.floor(Math.random() * 20) + 5, // 5-25 minutes
    submittedAt: new Date().toISOString(),
    answers: Object.keys(answers).map((questionId, index) => ({
      questionId,
      selectedAnswer: answers[questionId],
      isCorrect: Math.random() > 0.3, // 70% chance of being correct
    })),
  };

  // Store in memory
  if (!quizSubmissions[quizId]) {
    quizSubmissions[quizId] = [];
  }
  quizSubmissions[quizId].push(submissionRecord);

  console.log(
    `[Student Quiz] Quiz ${quizId} submitted by ${studentName} (${studentId}) - Score: ${totalScore}%`,
  );

  res.json({
    success: true,
    message: "Quiz submitted successfully",
    submissionId: `quiz_sub_${Date.now()}`,
    score: totalScore,
    correctAnswers,
    totalQuestions,
  });
});

// Reset quiz attempts (for faculty when quiz is updated)
router.post("/reset-quiz-attempts/:quizId", (req, res) => {
  const { quizId } = req.params;

  // Clear quiz submissions for this quiz
  if (quizSubmissions[quizId]) {
    const removedCount = quizSubmissions[quizId].length;
    delete quizSubmissions[quizId];
    console.log(
      `[Quiz Reset] Cleared ${removedCount} submissions for quiz ${quizId}`,
    );
  }

  res.json({
    success: true,
    message: "Quiz attempts reset successfully",
    quizId,
  });
});

// Faculty endpoints for test management
router.get("/tests", (req, res) => {
  const mockTests = [
    {
      id: "1",
      title: "Data Structures Assessment",
      description: "Arrays, Linked Lists, Stacks, and Queues",
      duration: 90,
      startTime: "2024-03-15T10:00:00Z",
      endTime: "2024-03-15T11:30:00Z",
      status: "active",
      difficulty: "Medium",
      totalQuestions: 5,
      totalSubmissions: 12,
    },
    {
      id: "2",
      title: "Algorithm Design Test",
      description: "Sorting, searching, and graph algorithms",
      duration: 120,
      startTime: "2024-03-20T14:00:00Z",
      endTime: "2024-03-20T16:00:00Z",
      status: "upcoming",
      difficulty: "Hard",
      totalQuestions: 6,
      totalSubmissions: 0,
    },
  ];

  console.log(`[Faculty] Returning ${mockTests.length} tests`);
  res.json(mockTests);
});

// Get test results for faculty
router.get("/student/test-results/:testId", (req, res) => {
  const { testId } = req.params;

  // Return test submissions for this test
  const results = testSubmissions[testId] || [];

  console.log(
    `[Faculty] Fetching test results for test ${testId}: ${results.length} submissions`,
  );

  res.json(results);
});
router.patch("/update-score/:attemptId", (req, res) => {
  const { attemptId } = req.params;
  const { score } = req.body;

  console.log(
    `[Faculty] Updating test score for attempt ${attemptId} to ${score}`,
  );

  res.json({
    success: true,
    message: "Score updated successfully",
    attemptId,
    score,
  });
});

router.patch("/update-quiz-score/:attemptId", (req, res) => {
  const { attemptId } = req.params;
  const { score } = req.body;

  console.log(
    `[Faculty] Updating quiz score for attempt ${attemptId} to ${score}`,
  );

  res.json({
    success: true,
    message: "Quiz score updated successfully",
    attemptId,
    score,
  });
});

router.post("/publish-results/:testId", (req, res) => {
  const { testId } = req.params;

  console.log(`[Faculty] Publishing test results for test ${testId}`);

  res.json({
    success: true,
    message: "Test results published successfully",
    testId,
  });
});

router.post("/publish-quiz-results/:quizId", (req, res) => {
  const { quizId } = req.params;

  console.log(`[Faculty] Publishing quiz results for quiz ${quizId}`);

  res.json({
    success: true,
    message: "Quiz results published successfully",
    quizId,
  });
});

// Student results endpoints
router.get("/my-test-results", (req, res) => {
  // Mock student results across all tests
  const studentResults = [
    {
      testId: "1",
      testTitle: "Data Structures Assessment",
      score: 85,
      maxScore: 100,
      status: "Published",
      submittedAt: "2024-03-15T11:25:00Z",
      timeSpent: 85,
      difficulty: "Medium",
      feedback: "Good understanding of basic data structures",
      problems: [
        {
          id: "q1",
          title: "Two Sum",
          difficulty: "Easy",
          status: "solved",
          score: 30,
          maxScore: 30,
        },
        {
          id: "q2",
          title: "Valid Parentheses",
          difficulty: "Easy",
          status: "solved",
          score: 25,
          maxScore: 30,
        },
        {
          id: "q3",
          title: "Merge Two Sorted Lists",
          difficulty: "Medium",
          status: "attempted",
          score: 30,
          maxScore: 40,
        },
      ],
    },
    {
      testId: "2",
      testTitle: "Algorithm Design Test",
      score: 92,
      maxScore: 100,
      status: "Published",
      submittedAt: "2024-03-20T15:45:00Z",
      timeSpent: 110,
      difficulty: "Hard",
      feedback: "Excellent problem-solving approach",
      problems: [
        {
          id: "q1",
          title: "Binary Tree Traversal",
          difficulty: "Medium",
          status: "solved",
          score: 35,
          maxScore: 35,
        },
        {
          id: "q2",
          title: "Dynamic Programming",
          difficulty: "Hard",
          status: "solved",
          score: 40,
          maxScore: 40,
        },
        {
          id: "q3",
          title: "Graph Algorithms",
          difficulty: "Hard",
          status: "attempted",
          score: 17,
          maxScore: 25,
        },
      ],
    },
  ];

  console.log(`[Student] Returning ${studentResults.length} test results`);
  res.json(studentResults);
});

router.get("/my-quiz-results", (req, res) => {
  // Mock student quiz results
  const quizResults = [
    {
      quizId: "1",
      quizTitle: "Sample Aptitude Quiz",
      score: 78,
      maxScore: 100,
      correctAnswers: 15,
      totalQuestions: 20,
      status: "Published",
      submittedAt: "2024-03-18T14:30:00Z",
      timeSpent: 18,
      class: "CSE - Section A",
      questions: [
        {
          id: "q1",
          question: "What is the time complexity of binary search?",
          userAnswer: "O(log n)",
          correctAnswer: "O(log n)",
          isCorrect: true,
          points: 5,
        },
        {
          id: "q2",
          question: "Which data structure uses LIFO principle?",
          userAnswer: "Queue",
          correctAnswer: "Stack",
          isCorrect: false,
          points: 0,
        },
        {
          id: "q3",
          question: "What does SQL stand for?",
          userAnswer: "Structured Query Language",
          correctAnswer: "Structured Query Language",
          isCorrect: true,
          points: 5,
        },
      ],
    },
  ];

  console.log(`[Student] Returning ${quizResults.length} quiz results`);
  res.json(quizResults);
});

router.get("/my-assignment-results", (req, res) => {
  // Mock student assignment results
  const assignmentResults = [
    {
      assignmentId: "1",
      assignmentTitle: "React Component Development",
      score: 88,
      maxScore: 100,
      status: "Published",
      submittedAt: "2024-03-12T16:20:00Z",
      dueDate: "2024-03-12T23:59:00Z",
      feedback: "Well-structured components with good practices",
      grade: "A-",
      submissionDetails: {
        fileName: "react-components.zip",
        fileSize: "2.4 MB",
        submissionType: "ZIP Archive",
        lateSubmission: false,
      },
      rubric: [
        {
          criteria: "Code Quality",
          maxPoints: 30,
          earnedPoints: 28,
          feedback: "Clean and well-documented code",
        },
        {
          criteria: "Functionality",
          maxPoints: 40,
          earnedPoints: 35,
          feedback: "All requirements met with minor issues",
        },
        {
          criteria: "Design Patterns",
          maxPoints: 30,
          earnedPoints: 25,
          feedback: "Good use of React patterns",
        },
      ],
    },
    {
      assignmentId: "2",
      assignmentTitle: "Database Design Project",
      score: 95,
      maxScore: 100,
      status: "Published",
      submittedAt: "2024-03-25T14:15:00Z",
      dueDate: "2024-03-25T23:59:00Z",
      feedback: "Excellent normalization and query optimization",
      grade: "A",
      submissionDetails: {
        fileName: "database-project.sql",
        fileSize: "156 KB",
        submissionType: "SQL File",
        lateSubmission: false,
      },
      rubric: [
        {
          criteria: "Database Design",
          maxPoints: 40,
          earnedPoints: 38,
          feedback: "Excellent normalization up to 3NF",
        },
        {
          criteria: "Query Optimization",
          maxPoints: 35,
          earnedPoints: 35,
          feedback: "Perfect indexing and query structure",
        },
        {
          criteria: "Documentation",
          maxPoints: 25,
          earnedPoints: 22,
          feedback: "Good documentation with minor gaps",
        },
      ],
    },
  ];

  console.log(
    `[Student] Returning ${assignmentResults.length} assignment results`,
  );
  res.json(assignmentResults);
});
export { testSubmissions, quizSubmissions };
export default router;
