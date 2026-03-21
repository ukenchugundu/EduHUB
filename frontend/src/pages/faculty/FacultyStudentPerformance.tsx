import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import FacultyLayout from "@/components/FacultyLayout";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users,
  Search,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  PieChart,
  Target,
  BookOpen,
  ArrowLeft,
  FileText,
  MessageSquare,
  CheckCircle,
  GraduationCap,
} from "lucide-react";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const buildAuthHeaders = (): HeadersInit => {
  const token = readStoredAuth()?.token?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface FacultyQuizResult {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  cls: string;
  student_id: string;
  submitted_at: string | null;
  auto_score: number | null;
  total_questions: number;
  faculty_score: number | null;
  reviewed_at: string | null;
}

interface FacultyAssignmentSubmission {
  submission_id: number;
  assignment_id: number;
  student_id: string;
  submission_text: string;
  submitted_at: string;
  faculty_score: number | null;
  reviewed_at: string | null;
  assignment_title?: string;
  subject?: string;
  cls?: string;
  max_score?: number;
}

interface StudentPerformanceData {
  studentId: string;
  quizzesAttempted: number;
  quizzesReviewed: number;
  quizAveragePercent: number | null;
  assignmentsSubmitted: number;
  assignmentsReviewed: number;
  assignmentAveragePercent: number | null;
  lastSubmissionAt: string | null;
  quizResults: FacultyQuizResult[];
  assignmentResults: FacultyAssignmentSubmission[];
}

const withTimeoutSignal = (
  timeoutMs = 6000,
): {
  signal: AbortSignal;
  clear: () => void;
  abort: () => void;
} => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
    abort: () => controller.abort(),
  };
};

const parseScorePercent = (
  score: number | null,
  maxScore: number | null,
): number | null => {
  if (
    score === null ||
    score === undefined ||
    maxScore === null ||
    maxScore === undefined
  ) {
    return null;
  }
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return null;
  }
  return (score / maxScore) * 100;
};

const formatPercent = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }
  return `${value.toFixed(1)}%`;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const fetchFacultyQuizResults = async (
  signal?: AbortSignal,
): Promise<FacultyQuizResult[]> => {
  const request = withTimeoutSignal(6000);
  const onAbort = () => request.abort();
  if (signal) {
    signal.addEventListener("abort", onAbort);
  }

  try {
    const response = await fetch(`${API_BASE}/api/faculty/results`, {
      headers: buildAuthHeaders(),
      signal: request.signal,
    });
    if (!response.ok) {
      throw new Error("Failed to load quiz performance data");
    }
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Cannot reach backend API for quiz performance data");
    }
    if (error instanceof TypeError) {
      throw new Error("Cannot reach backend API for quiz performance data");
    }
    throw error;
  } finally {
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
    request.clear();
  }
};

const fetchFacultyAssignmentSubmissions = async (
  signal?: AbortSignal,
): Promise<FacultyAssignmentSubmission[]> => {
  const request = withTimeoutSignal(6000);
  const onAbort = () => request.abort();
  if (signal) {
    signal.addEventListener("abort", onAbort);
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/faculty/assignments/submissions`,
      {
        headers: buildAuthHeaders(),
        signal: request.signal,
      },
    );
    if (!response.ok) {
      throw new Error("Failed to load assignment performance data");
    }
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Cannot reach backend API for assignment performance data",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach backend API for assignment performance data",
      );
    }
    throw error;
  } finally {
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
    request.clear();
  }
};

const calculateAverage = (
  values: Array<number | null | undefined>,
): number | null => {
  const valid = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  if (!valid.length) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const FacultyStudentPerformance = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const quizQuery = useQuery<FacultyQuizResult[], Error>({
    queryKey: ["faculty-student-quiz"],
    queryFn: ({ signal }) => fetchFacultyQuizResults(signal),
    refetchInterval: 7000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const assignmentQuery = useQuery<FacultyAssignmentSubmission[], Error>({
    queryKey: ["faculty-student-assignments"],
    queryFn: ({ signal }) => fetchFacultyAssignmentSubmissions(signal),
    refetchInterval: 7000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
  });

  const isLoading = quizQuery.isLoading || assignmentQuery.isLoading;
  const isError = quizQuery.isError || assignmentQuery.isError;
  const errorMessage =
    quizQuery.error?.message || assignmentQuery.error?.message;

  const quizRows = useMemo(() => quizQuery.data ?? [], [quizQuery.data]);
  const assignmentRows = useMemo(
    () => assignmentQuery.data ?? [],
    [assignmentQuery.data],
  );

  // Build student performance data from API
  const studentPerformanceMap = useMemo(() => {
    const studentMap = new Map<string, StudentPerformanceData>();

    // Process quiz results
    for (const quiz of quizRows) {
      const sid = quiz.student_id.trim() || "unknown";
      let student = studentMap.get(sid);
      if (!student) {
        student = {
          studentId: sid,
          quizzesAttempted: 0,
          quizzesReviewed: 0,
          quizAveragePercent: null,
          assignmentsSubmitted: 0,
          assignmentsReviewed: 0,
          assignmentAveragePercent: null,
          lastSubmissionAt: null,
          quizResults: [],
          assignmentResults: [],
        };
        studentMap.set(sid, student);
      }
      student.quizzesAttempted++;
      if (quiz.faculty_score !== null) {
        student.quizzesReviewed++;
      }
      student.quizResults.push(quiz);
      if (
        quiz.submitted_at &&
        (!student.lastSubmissionAt ||
          new Date(quiz.submitted_at) > new Date(student.lastSubmissionAt))
      ) {
        student.lastSubmissionAt = quiz.submitted_at;
      }
    }

    // Process assignment results
    for (const assignment of assignmentRows) {
      const sid = assignment.student_id.trim() || "unknown";
      let student = studentMap.get(sid);
      if (!student) {
        student = {
          studentId: sid,
          quizzesAttempted: 0,
          quizzesReviewed: 0,
          quizAveragePercent: null,
          assignmentsSubmitted: 0,
          assignmentsReviewed: 0,
          assignmentAveragePercent: null,
          lastSubmissionAt: null,
          quizResults: [],
          assignmentResults: [],
        };
        studentMap.set(sid, student);
      }
      student.assignmentsSubmitted++;
      if (assignment.faculty_score !== null) {
        student.assignmentsReviewed++;
      }
      student.assignmentResults.push(assignment);
      if (
        assignment.submitted_at &&
        (!student.lastSubmissionAt ||
          new Date(assignment.submitted_at) >
            new Date(student.lastSubmissionAt))
      ) {
        student.lastSubmissionAt = assignment.submitted_at;
      }
    }

    // Calculate averages
    for (const student of studentMap.values()) {
      const quizPercents = student.quizResults
        .map((q) => parseScorePercent(q.faculty_score, q.total_questions))
        .filter((p) => p !== null);
      student.quizAveragePercent = calculateAverage(quizPercents);

      const assignmentPercents = student.assignmentResults
        .map((a) => parseScorePercent(a.faculty_score, a.max_score ?? 100))
        .filter((p) => p !== null);
      student.assignmentAveragePercent = calculateAverage(assignmentPercents);
    }

    return studentMap;
  }, [quizRows, assignmentRows]);

  // Get unique classes
  const classes = useMemo(() => {
    const classSet = new Set<string>();
    for (const quiz of quizRows) {
      if (quiz.cls) classSet.add(quiz.cls);
    }
    for (const assignment of assignmentRows) {
      if (assignment.cls) classSet.add(assignment.cls);
    }
    return Array.from(classSet).sort();
  }, [quizRows, assignmentRows]);

  // Get all students
  const allStudents = useMemo(() => {
    return Array.from(studentPerformanceMap.values()).sort((a, b) =>
      a.studentId.localeCompare(b.studentId),
    );
  }, [studentPerformanceMap]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = allStudents;

    if (classFilter !== "all") {
      filtered = filtered.filter((student) => {
        const studentClasses = new Set<string>();
        for (const quiz of student.quizResults) {
          if (quiz.cls) studentClasses.add(quiz.cls);
        }
        for (const assignment of student.assignmentResults) {
          if (assignment.cls) studentClasses.add(assignment.cls);
        }
        return studentClasses.has(classFilter);
      });
    }

    if (searchTerm) {
      filtered = filtered.filter((student) =>
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [allStudents, classFilter, searchTerm]);

  // Get selected student if studentId is provided
  const selectedStudentData = useMemo(() => {
    if (!studentId) return null;
    return studentPerformanceMap.get(studentId) ?? null;
  }, [studentId, studentPerformanceMap]);

  const stats = useMemo(() => {
    const students = allStudents;
    const high = students.filter((s) => {
      const avg = calculateAverage([
        s.quizAveragePercent,
        s.assignmentAveragePercent,
      ]);
      return avg !== null && avg >= 75;
    }).length;
    const medium = students.filter((s) => {
      const avg = calculateAverage([
        s.quizAveragePercent,
        s.assignmentAveragePercent,
      ]);
      return avg !== null && avg >= 60 && avg < 75;
    }).length;
    const low = students.filter((s) => {
      const avg = calculateAverage([
        s.quizAveragePercent,
        s.assignmentAveragePercent,
      ]);
      return avg === null || avg < 60;
    }).length;

    const avgQuiz = calculateAverage(students.map((s) => s.quizAveragePercent));
    const avgAssignment = calculateAverage(
      students.map((s) => s.assignmentAveragePercent),
    );
    const avgOverall = calculateAverage([avgQuiz, avgAssignment]);

    return {
      total: students.length,
      high,
      medium,
      low,
      avgQuiz: avgQuiz ?? 0,
      avgAssignment: avgAssignment ?? 0,
      avgOverall: avgOverall ?? 0,
    };
  }, [allStudents]);

  const getLevel = (percent: number | null): string => {
    if (percent === null) return "Low";
    if (percent >= 75) return "High";
    if (percent >= 60) return "Medium";
    return "Low";
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "High":
        return "text-green-600 bg-green-100";
      case "Medium":
        return "text-yellow-600 bg-yellow-100";
      case "Low":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPerformanceIcon = (percentage: number | null) => {
    if (percentage === null)
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    if (percentage >= 80)
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (percentage >= 60) return <Target className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // If studentId is provided and student exists, show individual student detail
  if (studentId && selectedStudentData) {
    const overallAvg = calculateAverage([
      selectedStudentData.quizAveragePercent,
      selectedStudentData.assignmentAveragePercent,
    ]);
    const level = getLevel(overallAvg);

    return (
      <FacultyLayout>
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => navigate("/faculty/performance")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student Performance
          </button>

          {/* Student Detail Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {selectedStudentData.studentId.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedStudentData.studentId}
                </h2>
                <p className="text-muted-foreground">
                  Student Performance Details
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                    level === "High"
                      ? "bg-green-500/10 text-green-600"
                      : level === "Medium"
                        ? "bg-yellow-500/10 text-yellow-600"
                        : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {level} Level
                </span>
              </div>
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Quiz Average
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {formatPercent(selectedStudentData.quizAveragePercent)}
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(100, selectedStudentData.quizAveragePercent ?? 0)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Assignment Average
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {formatPercent(selectedStudentData.assignmentAveragePercent)}
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${Math.min(100, selectedStudentData.assignmentAveragePercent ?? 0)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-muted-foreground">
                    Quizzes Reviewed
                  </span>
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {selectedStudentData.quizzesReviewed}/
                  {selectedStudentData.quizzesAttempted}
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${selectedStudentData.quizzesAttempted ? (selectedStudentData.quizzesReviewed / selectedStudentData.quizzesAttempted) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-muted-foreground">
                    Assignments Reviewed
                  </span>
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {selectedStudentData.assignmentsReviewed}/
                  {selectedStudentData.assignmentsSubmitted}
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{
                      width: `${selectedStudentData.assignmentsSubmitted ? (selectedStudentData.assignmentsReviewed / selectedStudentData.assignmentsSubmitted) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Overall Performance */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Overall Performance
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Combined score based on quizzes and assignments
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-primary">
                    {formatPercent(overallAvg)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Overall Average
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Results */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              Quiz Performance ({selectedStudentData.quizResults.length})
            </h3>
            {selectedStudentData.quizResults.length === 0 ? (
              <p className="text-muted-foreground">No quiz attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedStudentData.quizResults.map((quiz) => (
                  <div
                    key={quiz.attempt_id}
                    className="p-4 rounded-xl bg-secondary/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {quiz.quiz_title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {quiz.cls} • Submitted:{" "}
                        {formatDateTime(quiz.submitted_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {quiz.faculty_score ?? "-"} / {quiz.total_questions}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {quiz.reviewed_at
                          ? `Reviewed: ${formatDateTime(quiz.reviewed_at)}`
                          : "Pending review"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment Results */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Assignment Performance (
              {selectedStudentData.assignmentResults.length})
            </h3>
            {selectedStudentData.assignmentResults.length === 0 ? (
              <p className="text-muted-foreground">
                No assignment submissions yet.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedStudentData.assignmentResults.map((assignment) => (
                  <div
                    key={assignment.submission_id}
                    className="p-4 rounded-xl bg-secondary/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {assignment.assignment_title ?? "Assignment"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.cls} • Submitted:{" "}
                        {formatDateTime(assignment.submitted_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {assignment.faculty_score ?? "-"} /{" "}
                        {assignment.max_score ?? 100}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.reviewed_at
                          ? `Reviewed: ${formatDateTime(assignment.reviewed_at)}`
                          : "Pending review"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FacultyLayout>
    );
  }

  // Default: Show all students list
  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/faculty/roster")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Roster
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Students Performance
            </h1>
            <p className="text-sm text-muted-foreground">
              View individual student performance details
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading performance data...</p>
        ) : null}
        {isError ? (
          <p className="text-sm text-destructive">
            {errorMessage ?? "Failed to load performance."}
          </p>
        ) : null}

        {!isLoading && !isError && allStudents.length === 0 ? (
          <div className="glass-card rounded-2xl p-5 text-sm text-muted-foreground">
            No student performance data available.
          </div>
        ) : null}

        {!isLoading && !isError && allStudents.length > 0 ? (
          <>
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by student ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-border/70 bg-background/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-border/70 bg-background/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Student List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Student Performance ({filteredStudents.length})
              </h3>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredStudents.map((student, index) => {
                  const overallAvg = calculateAverage([
                    student.quizAveragePercent,
                    student.assignmentAveragePercent,
                  ]);
                  const level = getLevel(overallAvg);

                  return (
                    <motion.div
                      key={student.studentId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-all cursor-pointer"
                      onClick={() =>
                        navigate(`/faculty/performance/${student.studentId}`)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {student.studentId.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">
                              {student.studentId}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {student.quizzesAttempted} quizzes •{" "}
                              {student.assignmentsSubmitted} assignments
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              Quiz Avg
                            </p>
                            <p className="font-medium text-foreground">
                              {formatPercent(student.quizAveragePercent)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              Assignment Avg
                            </p>
                            <p className="font-medium text-foreground">
                              {formatPercent(student.assignmentAveragePercent)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              Overall
                            </p>
                            <div className="flex items-center gap-2">
                              {getPerformanceIcon(overallAvg)}
                              <p className="font-medium text-foreground">
                                {formatPercent(overallAvg)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(level)}`}
                        >
                          {level}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        ) : null}
      </div>
    </FacultyLayout>
  );
};

export default FacultyStudentPerformance;
