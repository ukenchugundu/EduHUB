import { useState, useEffect, useMemo } from "react";
import StudentLayout from "@/components/StudentLayout";
import { motion } from "framer-motion";
import {
  Trophy,
  Calendar,
  Award,
  Target,
  FileText,
  Code,
  Brain,
  Eye,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import TestResultDetail from "@/components/TestResultDetail";
import QuizResultDetail from "@/components/QuizResultDetail";
import AssignmentResultDetail from "@/components/AssignmentResultDetail";
import {
  fetchStudentPerformanceData,
  StudentAssignmentResult as AssignmentResult,
  StudentQuizResult as QuizResult,
  StudentTestResult as TestResult,
} from "@/lib/studentPerformance";

const StudentResults = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [assignmentResults, setAssignmentResults] = useState<
    AssignmentResult[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<{
    type: "test" | "quiz" | "assignment";
    data: TestResult | QuizResult | AssignmentResult;
  } | null>(null);
  const [filterType, setFilterType] = useState<
    "all" | "test" | "quiz" | "assignment" | "scores"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const data = await fetchStudentPerformanceData();
      setTestResults(data.tests);
      setQuizResults(data.quizzes);
      setAssignmentResults(data.assignments);
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500/10 text-green-500";
      case "Medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "Hard":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-yellow-600";
    return "text-red-600";
  };

  const allResults = useMemo(
    () => [...testResults, ...quizResults, ...assignmentResults],
    [testResults, quizResults, assignmentResults],
  );

  const filteredResults = useMemo(() => {
    let results = allResults;

    if (filterType !== "all" && filterType !== "scores") {
      results = results.filter((r) => {
        if (filterType === "test") return "testTitle" in r;
        if (filterType === "quiz") return "quizTitle" in r;
        if (filterType === "assignment") return "assignmentTitle" in r;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter((r) => {
        const title = (
          (r as any).testTitle ||
          (r as any).quizTitle ||
          (r as any).assignmentTitle ||
          ""
        ).toLowerCase();
        return title.includes(query);
      });
    }

    return results;
  }, [allResults, filterType, searchQuery]);

  const totalAttempts = allResults.length;
  const averageScore =
    totalAttempts > 0
      ? Math.round(
          allResults.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) /
            totalAttempts,
        )
      : 0;

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </StudentLayout>
    );
  }

  if (selectedResult) {
    return (
      <StudentLayout>
        {selectedResult.type === "test" && (
          <TestResultDetail
            result={selectedResult.data as TestResult}
            onBack={() => setSelectedResult(null)}
          />
        )}
        {selectedResult.type === "quiz" && (
          <QuizResultDetail
            result={selectedResult.data as QuizResult}
            onBack={() => setSelectedResult(null)}
          />
        )}
        {selectedResult.type === "assignment" && (
          <AssignmentResultDetail
            result={selectedResult.data as AssignmentResult}
            onBack={() => setSelectedResult(null)}
          />
        )}
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              My Results
            </h1>
            <p className="text-sm text-muted-foreground">
              View your complete academic performance
            </p>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            className={`glass-card rounded-2xl p-4 cursor-pointer transition-colors ${
              filterType === "all"
                ? "ring-2 ring-blue-500 bg-blue-500/5"
                : "hover:bg-card/50"
            }`}
            onClick={() => setFilterType("all")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {totalAttempts}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Results
                </div>
              </div>
            </div>
          </div>

          <div
            className={`glass-card rounded-2xl p-4 cursor-pointer transition-colors ${
              filterType === "scores"
                ? "ring-2 ring-green-500 bg-green-500/5"
                : "hover:bg-card/50"
            }`}
            onClick={() =>
              setFilterType(filterType === "scores" ? "all" : "scores")
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {averageScore}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Average Score
                </div>
              </div>
            </div>
          </div>

          <div
            className={`glass-card rounded-2xl p-4 cursor-pointer transition-colors ${
              filterType === "test"
                ? "ring-2 ring-purple-500 bg-purple-500/5"
                : "hover:bg-card/50"
            }`}
            onClick={() =>
              setFilterType(filterType === "test" ? "all" : "test")
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Code className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {testResults.length}
                </div>
                <div className="text-xs text-muted-foreground">Tests</div>
              </div>
            </div>
          </div>

          <div
            className={`glass-card rounded-2xl p-4 cursor-pointer transition-colors ${
              filterType === "quiz"
                ? "ring-2 ring-orange-500 bg-orange-500/5"
                : "hover:bg-card/50"
            }`}
            onClick={() =>
              setFilterType(filterType === "quiz" ? "all" : "quiz")
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {quizResults.length}
                </div>
                <div className="text-xs text-muted-foreground">Quizzes</div>
              </div>
            </div>
          </div>

          <div
            className={`glass-card rounded-2xl p-4 cursor-pointer transition-colors ${
              filterType === "assignment"
                ? "ring-2 ring-pink-500 bg-pink-500/5"
                : "hover:bg-card/50"
            }`}
            onClick={() =>
              setFilterType(filterType === "assignment" ? "all" : "assignment")
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {assignmentResults.length}
                </div>
                <div className="text-xs text-muted-foreground">Assignments</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search results by title..."
              className="pl-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* All Results Combined */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5" />
            {filterType === "all"
              ? "All Academic Results"
              : filterType === "test"
                ? "Test Results"
                : filterType === "quiz"
                  ? "Quiz Results"
                  : filterType === "assignment"
                    ? "Assignment Results"
                    : "Score Overview"}
          </h2>
          <div className="space-y-3">
            {/* Score Overview */}
            {filterType === "scores" && (
              <div className="space-y-3">
                {filteredResults.map((result, index) => (
                  <motion.div
                    key={`score-${(result as any).testId || (result as any).quizId || (result as any).assignmentId}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card rounded-2xl p-4 border-l-4 border-green-500 cursor-pointer hover:bg-card/50 transition-colors group"
                    onClick={() => {
                      if ("testTitle" in result) {
                        setSelectedResult({
                          type: "test",
                          data: result as TestResult,
                        });
                      } else if ("quizTitle" in result) {
                        setSelectedResult({
                          type: "quiz",
                          data: result as QuizResult,
                        });
                      } else {
                        setSelectedResult({
                          type: "assignment",
                          data: result as AssignmentResult,
                        });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {"testTitle" in result && (
                          <Code className="w-5 h-5 text-purple-500" />
                        )}
                        {"quizTitle" in result && (
                          <Brain className="w-5 h-5 text-orange-500" />
                        )}
                        {"assignmentTitle" in result && (
                          <FileText className="w-5 h-5 text-pink-500" />
                        )}
                        <h3 className="font-semibold text-foreground">
                          {"testTitle" in result
                            ? (result as TestResult).testTitle
                            : "quizTitle" in result
                              ? (result as QuizResult).quizTitle
                              : (result as AssignmentResult).assignmentTitle}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-xl font-bold ${getScoreColor(result.score, result.maxScore)}`}
                        >
                          {"quizTitle" in result
                            ? `${result.score}%`
                            : `${result.score}/${result.maxScore}`}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                          <Eye className="w-4 h-4" />
                          <span>View Summary</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Combined List */}
            {filterType !== "scores" && (
              <div className="space-y-3">
                {filteredResults.map((result, index) => (
                  <motion.div
                    key={`res-${(result as any).testId || (result as any).quizId || (result as any).assignmentId}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-card/50 transition-colors group"
                    onClick={() => {
                      if ("testTitle" in result) {
                        setSelectedResult({
                          type: "test",
                          data: result as TestResult,
                        });
                      } else if ("quizTitle" in result) {
                        setSelectedResult({
                          type: "quiz",
                          data: result as QuizResult,
                        });
                      } else {
                        setSelectedResult({
                          type: "assignment",
                          data: result as AssignmentResult,
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          "testTitle" in result
                            ? "bg-purple-500/10"
                            : "quizTitle" in result
                              ? "bg-orange-500/10"
                              : "bg-pink-500/10"
                        }`}
                      >
                        {"testTitle" in result && (
                          <Code className="w-6 h-6 text-purple-500" />
                        )}
                        {"quizTitle" in result && (
                          <Brain className="w-6 h-6 text-orange-500" />
                        )}
                        {"assignmentTitle" in result && (
                          <FileText className="w-6 h-6 text-pink-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {"testTitle" in result
                            ? (result as TestResult).testTitle
                            : "quizTitle" in result
                              ? (result as QuizResult).quizTitle
                              : (result as AssignmentResult).assignmentTitle}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(result.submittedAt).toLocaleDateString()}
                          </span>
                          {"difficulty" in result && (
                            <span
                              className={`px-2 py-0.5 rounded-full ${getDifficultyColor((result as TestResult).difficulty)}`}
                            >
                              {(result as TestResult).difficulty}
                            </span>
                          )}
                          {"grade" in result && (result as any).grade && (
                            <span
                              className={`font-bold ${getGradeColor((result as any).grade)}`}
                            >
                              Grade: {(result as any).grade}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-8">
                      <div className="text-right">
                        <div
                          className={`text-xl font-bold ${getScoreColor(result.score, result.maxScore)}`}
                        >
                          {result.score} / {result.maxScore}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((result.score / result.maxScore) * 100)}%
                          Score
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                        View Details
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredResults.length === 0 && (
              <div className="text-center py-12 glass-card rounded-2xl">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">
                  No results found matching your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentResults;
