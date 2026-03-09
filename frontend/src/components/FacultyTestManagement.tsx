import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Test {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  questions: Question[];
}

interface Question {
  id?: number;
  title: string;
  description: string;
  sample_input: string;
  sample_output: string;
  test_cases: TestCase[];
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  time_limit_seconds: number;
}

interface TestCase {
  input: string;
  expected_output: string;
}

export const FacultyTestManagement: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [newTest, setNewTest] = useState<Partial<Test>>({
    title: "",
    description: "",
    duration_minutes: 120,
    questions: [],
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch("/api/faculty/tests");
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      // Use mock data as fallback
      setTests([
        {
          id: 1,
          title: "Data Structures Test",
          description: "Test on arrays, linked lists, and trees",
          duration_minutes: 120,
          start_time: new Date().toISOString(),
          end_time: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_active: true,
          questions: [],
        },
        {
          id: 2,
          title: "Algorithms Assessment",
          description: "Sorting, searching, and graph algorithms",
          duration_minutes: 90,
          start_time: new Date().toISOString(),
          end_time: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_active: false,
          questions: [],
        },
      ]);
    }
  };

  const createTest = async () => {
    try {
      const response = await fetch("/api/faculty/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTest),
      });

      if (response.ok) {
        fetchTests();
        setShowCreateModal(false);
        setEditingTest(null);
        setNewTest({
          title: "",
          description: "",
          duration_minutes: 120,
          questions: [],
        });
      }
    } catch (error) {
      console.error("Failed to create test:", error);
    }
  };

  const toggleTestStatus = async (testId: number, isActive: boolean) => {
    try {
      await fetch(`/api/faculty/tests/${testId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      fetchTests();
    } catch (error) {
      console.error("Failed to toggle test status:", error);
    }
  };

  const viewResults = (testId: number) => {
    navigate(`/faculty/test-results/${testId}`);
  };

  const editTest = (test: Test) => {
    setEditingTest(test);
    setNewTest(test);
    setShowCreateModal(true);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      title: "",
      description: "",
      sample_input: "",
      sample_output: "",
      test_cases: [{ input: "", expected_output: "" }],
      difficulty: "Easy",
      points: 10,
      time_limit_seconds: 30,
    };

    setNewTest((prev) => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion],
    }));
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Test Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage coding tests for your students
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setEditingTest(null);
              setNewTest({
                title: "",
                description: "",
                duration_minutes: 120,
                questions: [],
              });
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Test
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {tests.map((test) => (
          <div
            key={test.id}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {test.title}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      test.is_active
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    {test.is_active ? "● Active" : "○ Inactive"}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {test.description}
                </p>
                <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span>Duration: {test.duration_minutes} min</span>
                  <span>Questions: {test.questions?.length || 0}</span>
                  <span>Attempts: 0</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => toggleTestStatus(test.id, test.is_active)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    test.is_active
                      ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800 border border-orange-200 dark:border-orange-700"
                      : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border border-green-200 dark:border-green-700"
                  }`}
                >
                  {test.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => viewResults(test.id)}
                  className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 border border-blue-200 dark:border-blue-700"
                >
                  View Results
                </button>
                <button
                  onClick={() => editTest(test)}
                  className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors duration-200 border border-purple-200 dark:border-purple-700"
                >
                  Edit Test
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {editingTest ? "Edit Test" : "Create New Test"}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTest(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Test Title
                </label>
                <input
                  type="text"
                  value={newTest.title || ""}
                  onChange={(e) =>
                    setNewTest((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter test title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newTest.duration_minutes || 120}
                  onChange={(e) =>
                    setNewTest((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value),
                    }))
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="120"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newTest.description || ""}
                onChange={(e) =>
                  setNewTest((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe what this test covers..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTest(null);
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createTest}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg font-medium"
              >
                {editingTest ? "Update Test" : "Create Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
