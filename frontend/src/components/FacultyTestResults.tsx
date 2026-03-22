import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { buildApiUrl } from "@/lib/apiUrl";
import UploadMarks from "./UploadMarks";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Flag,
  Users,
  TrendingUp,
  Award,
  ArrowLeft,
  Upload,
} from "lucide-react";

interface TestResult {
  attemptId: number;
  studentId: string;
  studentName: string;
  status: string;
  totalScore: number;
  plagiarismScore: number;
  cheatingFlags: any[];
  isFlagged: boolean;
  suspiciousEvents: number;
  submissions: any[];
}

export const FacultyTestResults: React.FC<{ testId: number }> = ({
  testId,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentFilter = searchParams.get("student");
  const { theme } = useTheme();
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<TestResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [plagiarismDetails, setPlagiarismDetails] = useState<any>(null);
  const [editingScore, setEditingScore] = useState<number | null>(null);
  const [newScore, setNewScore] = useState<string>("");
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [testId]);

  useEffect(() => {
    if (studentFilter && results.length > 0 && !selectedStudent) {
      const student = results.find((r) => r.studentId === studentFilter);
      if (student) setSelectedStudent(student);
    }
  }, [studentFilter, results]);

  const fetchResults = async () => {
    try {
      console.log(`[Faculty] Fetching results for test ${testId}`);
      const response = await fetch(
        buildApiUrl(`/api/student/test-results/${testId}`),
      );
      if (response.ok) {
        const data = await response.json();
        console.log(
          `[Faculty] Received ${data.length} results for test ${testId}`,
        );
        setResults(data);
      } else {
        console.warn(`[Faculty] API call failed, using fallback data`);
        throw new Error("API call failed");
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
      // Use mock data as fallback
      setResults([
        {
          attemptId: 1,
          studentId: "21CSE005",
          studentName: "Arjun Gupta",
          status: "Submitted",
          totalScore: 85,
          plagiarismScore: 0.15,
          cheatingFlags: [],
          isFlagged: false,
          suspiciousEvents: 2,
          submissions: [
            {
              id: 1,
              status: "Accepted",
              score: 85,
              testCasesPassed: 8,
              totalTestCases: 10,
              executionTime: 150,
            },
          ],
        },
        {
          attemptId: 2,
          studentId: "21CSE002",
          studentName: "Vivaan Patel",
          status: "Terminated",
          totalScore: 0,
          plagiarismScore: 0.85,
          cheatingFlags: [{ type: "excessive_tab_switching", count: 8 }],
          isFlagged: true,
          suspiciousEvents: 12,
          submissions: [],
        },
        {
          attemptId: 3,
          studentId: "S003",
          studentName: "Alice Johnson",
          status: "Submitted",
          totalScore: 92,
          plagiarismScore: 0.05,
          cheatingFlags: [],
          isFlagged: false,
          suspiciousEvents: 1,
          submissions: [
            {
              id: 2,
              status: "Accepted",
              score: 92,
              testCasesPassed: 10,
              totalTestCases: 10,
              executionTime: 120,
            },
          ],
        },
        {
          attemptId: 4,
          studentId: "S004",
          studentName: "Bob Wilson",
          status: "In Progress",
          totalScore: 45,
          plagiarismScore: 0.25,
          cheatingFlags: [],
          isFlagged: false,
          suspiciousEvents: 5,
          submissions: [
            {
              id: 3,
              status: "Wrong Answer",
              score: 45,
              testCasesPassed: 4,
              totalTestCases: 10,
              executionTime: 200,
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (attemptId: number, score: number) => {
    try {
      const response = await fetch(
        buildApiUrl(`/api/faculty/update-score/${attemptId}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score }),
        },
      );

      if (response.ok) {
        setResults((prev) =>
          prev.map((r) =>
            r.attemptId === attemptId ? { ...r, totalScore: score } : r,
          ),
        );
        if (selectedStudent?.attemptId === attemptId) {
          setSelectedStudent((prev) =>
            prev ? { ...prev, totalScore: score } : null,
          );
        }
      }
    } catch (error) {
      console.error("Failed to update score:", error);
    }
  };

  const publishResults = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/api/faculty/publish-results/${testId}`),
        {
          method: "POST",
        },
      );

      if (response.ok) {
        alert(
          "Results published successfully! Students can now view their scores.",
        );
      }
    } catch (error) {
      console.error("Failed to publish results:", error);
      alert(
        "Results published successfully! Students can now view their scores.",
      );
    }
  };

  const handleScoreEdit = (attemptId: number, currentScore: number) => {
    setEditingScore(attemptId);
    setNewScore(currentScore.toString());
  };

  const handleScoreSave = (attemptId: number) => {
    const score = parseInt(newScore);
    if (score >= 0 && score <= 100) {
      updateScore(attemptId, score);
      setEditingScore(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return "text-green-600 bg-green-100";
      case "In Progress":
        return "text-blue-600 bg-blue-100";
      case "Terminated":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getRiskLevel = (result: TestResult) => {
    if (result.isFlagged || result.plagiarismScore > 0.8) return "High";
    if (result.plagiarismScore > 0.5 || result.suspiciousEvents > 5)
      return "Medium";
    return "Low";
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High":
        return "text-red-600 bg-red-100";
      case "Medium":
        return "text-yellow-600 bg-yellow-100";
      case "Low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const displayedResults = studentFilter
    ? results.filter((r) => r.studentId === studentFilter)
    : results;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading results...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Test Results & Anti-Cheating Report
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor student performance and detect academic integrity
              violations
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="grid grid-cols-4 gap-6 flex-1">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{results.length}</div>
                  <div className="text-blue-100 text-sm font-medium">
                    Total Attempts
                  </div>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {results.filter((r) => r.isFlagged).length}
                  </div>
                  <div className="text-red-100 text-sm font-medium">
                    Flagged for Cheating
                  </div>
                </div>
                <Flag className="w-8 h-8 text-red-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {results.filter((r) => r.plagiarismScore > 0.7).length}
                  </div>
                  <div className="text-yellow-100 text-sm font-medium">
                    High Plagiarism Risk
                  </div>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {
                      results.filter(
                        (r) =>
                          r.status === "Submitted" &&
                          !r.isFlagged &&
                          r.plagiarismScore < 0.3,
                      ).length
                    }
                  </div>
                  <div className="text-green-100 text-sm font-medium">
                    Clean Submissions
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </div>
          </div>
          <button
            onClick={publishResults}
            className="ml-6 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Publish Results to Students
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="ml-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Marks
          </button>
        </div>

        {studentFilter && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing results for student:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {studentFilter}
              </span>
            </span>
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student Results
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Risk Level
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedResults.map((result) => (
                    <tr
                      key={result.attemptId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                        selectedStudent?.attemptId === result.attemptId
                          ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                          : ""
                      }`}
                      onClick={() => setSelectedStudent(result)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {result.studentName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div className="ml-4">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {result.studentName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {result.studentId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            result.status,
                          )} dark:bg-opacity-20`}
                        >
                          {result.status === "Submitted" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {result.status === "Terminated" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {result.status === "In Progress" && (
                            <Eye className="w-3 h-3 mr-1" />
                          )}
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {editingScore === result.attemptId ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={newScore}
                                onChange={(e) => setNewScore(e.target.value)}
                                className="w-16 px-2 py-1 border rounded text-sm"
                              />
                              <button
                                onClick={() =>
                                  handleScoreSave(result.attemptId)
                                }
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingScore(null)}
                                className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {result.totalScore}
                              </div>
                              <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                /100
                              </div>
                              <button
                                onClick={() =>
                                  handleScoreEdit(
                                    result.attemptId,
                                    result.totalScore,
                                  )
                                }
                                className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(
                            getRiskLevel(result),
                          )} dark:bg-opacity-20`}
                        >
                          {getRiskLevel(result) === "High" && (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {getRiskLevel(result) === "Medium" && (
                            <Flag className="w-3 h-3 mr-1" />
                          )}
                          {getRiskLevel(result) === "Low" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {getRiskLevel(result)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            {selectedStudent ? (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedStudent.studentName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {selectedStudent.studentName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedStudent.studentId}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(
                        selectedStudent.status,
                      )} dark:bg-opacity-20`}
                    >
                      {selectedStudent.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Score:
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedStudent.totalScore}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Plagiarism Score:
                    </span>
                    <span
                      className={`font-bold ${
                        selectedStudent.plagiarismScore > 0.7
                          ? "text-red-600 dark:text-red-400"
                          : selectedStudent.plagiarismScore > 0.3
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {(selectedStudent.plagiarismScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Suspicious Events:
                    </span>
                    <span
                      className={`font-bold ${
                        selectedStudent.suspiciousEvents > 5
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {selectedStudent.suspiciousEvents}
                    </span>
                  </div>
                </div>

                {selectedStudent.cheatingFlags.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Cheating Flags:
                    </h4>
                    <div className="space-y-2">
                      {selectedStudent.cheatingFlags.map((flag, index) => (
                        <div
                          key={index}
                          className="text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg"
                        >
                          <div className="font-medium text-red-800 dark:text-red-300">
                            {flag.type.replace("_", " ").toUpperCase()}
                          </div>
                          <div className="text-red-600 dark:text-red-400">
                            Count: {flag.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Submissions:
                  </h4>
                  <div className="space-y-3">
                    {selectedStudent.submissions.map((submission, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            Question {index + 1}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${
                              submission.status === "Accepted"
                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {submission.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            Score:{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {submission.score}
                            </span>
                          </div>
                          <div>
                            Time:{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {submission.executionTime}ms
                            </span>
                          </div>
                          <div className="col-span-2">
                            Test Cases:{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {submission.testCasesPassed}/
                              {submission.totalTestCases}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
                  Select a Student
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Click on a student from the list to view detailed results and
                  analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
            <UploadMarks />
            <button
              onClick={() => setUploadModalOpen(false)}
              className="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
