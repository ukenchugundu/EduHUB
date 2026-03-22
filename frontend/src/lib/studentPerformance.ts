import { getStudentIdentity, readStoredAuth } from "@/lib/authSession";
import { requestJson as apiRequestJson } from "@/lib/apiClient";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export interface StudentTestResult {
  testId: string;
  testTitle: string;
  score: number;
  maxScore: number;
  status: string;
  submittedAt: string;
  timeSpent: number;
  difficulty: string;
  feedback?: string;
  problems?: Array<{
    id: string;
    title: string;
    difficulty: string;
    status: "solved" | "attempted" | "not_attempted";
    score: number;
    maxScore: number;
  }>;
}

export interface StudentQuizResult {
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
  status: string;
  submittedAt: string;
  timeSpent: number;
  class: string;
  questions?: Array<{
    id: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
  }>;
}

export interface StudentAssignmentResult {
  assignmentId: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  status: string;
  submittedAt: string;
  dueDate: string;
  fileUrl?: string | null;
  feedback?: string;
  grade?: string;
  submissionDetails?: {
    fileName: string;
    fileSize: string;
    submissionType: string;
    lateSubmission: boolean;
    daysLate?: number;
  };
  rubric?: Array<{
    criteria: string;
    maxPoints: number;
    earnedPoints: number;
    feedback?: string;
  }>;
}

export interface StudentPerformanceData {
  tests: StudentTestResult[];
  quizzes: StudentQuizResult[];
  assignments: StudentAssignmentResult[];
}

export interface StudentPerformanceSummaryResult {
  id: string;
  type: "test" | "quiz" | "assignment";
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  status: string;
  subtitle: string;
}

export interface StudentPerformanceSummary {
  allResults: StudentPerformanceSummaryResult[];
  recentResults: StudentPerformanceSummaryResult[];
  overallPercentage: number | null;
  derivedCgpa: number | null;
  averageTestPercentage: number | null;
  averageQuizPercentage: number | null;
  averageAssignmentPercentage: number | null;
}

const getAuthToken = (): string => readStoredAuth()?.token?.trim() ?? "";

const buildHeaders = (includeStudentId = false): HeadersInit => {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (includeStudentId) {
    const studentId = getStudentIdentity().trim();
    if (studentId) {
      headers["x-student-id"] = studentId;
    }
  }
  return headers;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const calculatePercentage = (score: number, maxScore: number): number =>
  maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

export const calculateDerivedCgpa = (
  percentage: number | null,
): number | null => {
  if (percentage === null || !Number.isFinite(percentage)) {
    return null;
  }

  return Number(Math.min(10, percentage / 10).toFixed(2));
};

const mapTestResult = (item: unknown): StudentTestResult | null => {
  if (!isObject(item)) {
    return null;
  }

  const score = toNumber(item.score);
  const maxScore = Math.max(1, toNumber(item.maxScore, 100));

  return {
    testId: String(item.testId ?? item.test_id ?? ""),
    testTitle: toStringValue(item.testTitle ?? item.test_title, "Coding Test"),
    score,
    maxScore,
    status: toStringValue(item.status, "Submitted"),
    submittedAt: toStringValue(item.submittedAt ?? item.submitted_at),
    timeSpent: Math.max(0, toNumber(item.timeSpent ?? item.time_spent)),
    difficulty: toStringValue(item.difficulty, "Coding Test"),
    feedback: toStringValue(item.feedback),
    problems: Array.isArray(item.problems)
      ? item.problems
          .filter(isObject)
          .map((problem) => ({
            id: String(problem.id ?? ""),
            title: toStringValue(problem.title, "Question"),
            difficulty: toStringValue(problem.difficulty, "Coding Test"),
            status:
              problem.status === "solved" ||
              problem.status === "attempted" ||
              problem.status === "not_attempted"
                ? problem.status
                : "attempted",
            score: toNumber(problem.score),
            maxScore: Math.max(1, toNumber(problem.maxScore, 1)),
          }))
      : [],
  };
};

const mapQuizResult = (item: unknown): StudentQuizResult | null => {
  if (!isObject(item)) {
    return null;
  }

  const totalQuestions = Math.max(1, toNumber(item.total_questions, 1));
  const finalScore =
    item.faculty_score === null || item.faculty_score === undefined
      ? toNumber(item.auto_score)
      : toNumber(item.faculty_score);
  const questionCount = Math.max(totalQuestions, finalScore || 0);

  return {
    quizId: String(item.quizId ?? item.quiz_id ?? ""),
    quizTitle: toStringValue(item.quizTitle ?? item.quiz_title, "Quiz"),
    score: finalScore,
    maxScore: questionCount,
    correctAnswers: finalScore,
    totalQuestions: questionCount,
    status: item.reviewed_at ? "Reviewed" : "Published",
    submittedAt: toStringValue(item.submittedAt ?? item.submitted_at),
    timeSpent: Math.max(0, toNumber(item.timeSpent ?? item.time_spent)),
    class: toStringValue(item.class ?? item.cls),
    questions: Array.isArray(item.questions)
      ? item.questions
          .filter(isObject)
          .map((question) => ({
            id: String(question.id ?? ""),
            question: toStringValue(question.question, "Question"),
            userAnswer: toStringValue(question.userAnswer ?? question.user_answer),
            correctAnswer: toStringValue(
              question.correctAnswer ?? question.correct_answer,
            ),
            isCorrect: Boolean(question.isCorrect ?? question.is_correct),
            points: toNumber(question.points),
          }))
      : [],
  };
};

const mapAssignmentResult = (item: unknown): StudentAssignmentResult | null => {
  if (!isObject(item)) {
    return null;
  }

  const score = toNumber(item.score ?? item.faculty_score);
  const maxScore = Math.max(1, toNumber(item.maxScore ?? item.max_score, 100));
  const dueDate = toStringValue(item.dueDate ?? item.due_date);
  const submittedAt = toStringValue(item.submittedAt ?? item.submitted_at);
  const fileUrl = item.fileUrl ?? item.file_url;
  const grade =
    typeof item.grade === "string" && item.grade.trim()
      ? item.grade.trim()
      : score >= 90
        ? "A"
        : score >= 80
          ? "B"
          : score >= 70
            ? "C"
            : score > 0
              ? "D"
              : undefined;
  const lateDays =
    dueDate && submittedAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(submittedAt).getTime() - new Date(dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  return {
    assignmentId: String(item.assignmentId ?? item.assignment_id ?? ""),
    assignmentTitle: toStringValue(
      item.assignmentTitle ?? item.assignment_title,
      "Assignment",
    ),
    score,
    maxScore,
    status: item.reviewed_at ? "Published" : "Submitted",
    submittedAt,
    dueDate,
    fileUrl: typeof fileUrl === "string" ? fileUrl : null,
    feedback: toStringValue(item.feedback),
    grade,
    submissionDetails: {
      fileName:
        typeof fileUrl === "string" && fileUrl
          ? fileUrl.split("/").pop() || "Submission"
          : "Submission",
      fileSize: "Unavailable",
      submissionType: "Document",
      lateSubmission: lateDays > 0,
      daysLate: lateDays > 0 ? lateDays : undefined,
    },
    rubric: [],
  };
};

export const fetchStudentPerformanceData =
  async (): Promise<StudentPerformanceData> => {
    const [testsResult, quizzesResult, assignmentsResult] =
      await Promise.allSettled([
        apiRequestJson<unknown[]>(
          `${API_BASE}/api/student/my-test-results`,
          {
            headers: buildHeaders(),
          },
          {
            fallbackError: "Failed to load test results.",
            retries: 1,
            timeoutMs: 8000,
            includeAuth: false,
          },
        ),
        apiRequestJson<unknown[]>(
          `${API_BASE}/api/student/results`,
          {
            headers: buildHeaders(true),
          },
          {
            fallbackError: "Failed to load quiz results.",
            retries: 1,
            timeoutMs: 8000,
            includeAuth: false,
          },
        ),
        apiRequestJson<unknown[]>(
          `${API_BASE}/api/student/assignments/results`,
          {
            headers: buildHeaders(true),
          },
          {
            fallbackError: "Failed to load assignment results.",
            retries: 1,
            timeoutMs: 8000,
            includeAuth: false,
          },
        ),
      ]);

    const testsRaw =
      testsResult.status === "fulfilled" && Array.isArray(testsResult.value)
        ? testsResult.value
        : [];
    const quizzesRaw =
      quizzesResult.status === "fulfilled" && Array.isArray(quizzesResult.value)
        ? quizzesResult.value
        : [];
    const assignmentsRaw =
      assignmentsResult.status === "fulfilled" &&
      Array.isArray(assignmentsResult.value)
        ? assignmentsResult.value
        : [];

    return {
      tests: testsRaw.map(mapTestResult).filter(Boolean) as StudentTestResult[],
      quizzes: quizzesRaw
        .map(mapQuizResult)
        .filter(Boolean) as StudentQuizResult[],
      assignments: assignmentsRaw
        .map(mapAssignmentResult)
        .filter(Boolean) as StudentAssignmentResult[],
    };
  };

const averagePercentage = (values: Array<{ score: number; maxScore: number }>) =>
  values.length > 0
    ? Math.round(
        values.reduce(
          (total, item) => total + calculatePercentage(item.score, item.maxScore),
          0,
        ) / values.length,
      )
    : null;

export const buildStudentPerformanceSummary = (
  data: StudentPerformanceData,
): StudentPerformanceSummary => {
  const testResults: StudentPerformanceSummaryResult[] = data.tests.map((item) => ({
    id: item.testId,
    type: "test",
    title: item.testTitle,
    score: item.score,
    maxScore: item.maxScore,
    percentage: calculatePercentage(item.score, item.maxScore),
    submittedAt: item.submittedAt,
    status: item.status,
    subtitle: item.difficulty || "Coding Test",
  }));

  const quizResults: StudentPerformanceSummaryResult[] = data.quizzes.map((item) => ({
    id: item.quizId,
    type: "quiz",
    title: item.quizTitle,
    score: item.score,
    maxScore: item.maxScore,
    percentage: calculatePercentage(item.score, item.maxScore),
    submittedAt: item.submittedAt,
    status: item.status,
    subtitle: item.class || "Quiz",
  }));

  const assignmentResults: StudentPerformanceSummaryResult[] = data.assignments.map(
    (item) => ({
      id: item.assignmentId,
      type: "assignment",
      title: item.assignmentTitle,
      score: item.score,
      maxScore: item.maxScore,
      percentage: calculatePercentage(item.score, item.maxScore),
      submittedAt: item.submittedAt,
      status: item.status,
      subtitle: item.grade ? `Grade ${item.grade}` : "Assignment",
    }),
  );

  const allResults = [...testResults, ...quizResults, ...assignmentResults].sort(
    (left, right) =>
      new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );

  const overallPercentage =
    allResults.length > 0
      ? Math.round(
          allResults.reduce((total, item) => total + item.percentage, 0) /
            allResults.length,
        )
      : null;

  return {
    allResults,
    recentResults: allResults.slice(0, 5),
    overallPercentage,
    derivedCgpa: calculateDerivedCgpa(overallPercentage),
    averageTestPercentage: averagePercentage(data.tests),
    averageQuizPercentage: averagePercentage(data.quizzes),
    averageAssignmentPercentage: averagePercentage(data.assignments),
  };
};
