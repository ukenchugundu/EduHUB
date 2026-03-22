import React, { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/apiUrl";

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
      const response = await fetch(buildApiUrl("/api/faculty/tests"));
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    }
  };

  const createTest = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/faculty/tests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTest),
      });

      if (response.ok) {
        fetchTests();
        setShowCreateModal(false);
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
      await fetch(buildApiUrl(`/api/faculty/tests/${testId}/toggle`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      fetchTests();
    } catch (error) {
      console.error("Failed to toggle test status:", error);
    }
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

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setNewTest((prev) => ({
      ...prev,
      questions:
        prev.questions?.map((q, i) =>
          i === index ? { ...q, [field]: value } : q,
        ) || [],
    }));
  };

  const addTestCase = (questionIndex: number) => {
    setNewTest((prev) => ({
      ...prev,
      questions:
        prev.questions?.map((q, i) =>
          i === questionIndex
            ? {
                ...q,
                test_cases: [
                  ...q.test_cases,
                  { input: "", expected_output: "" },
                ],
              }
            : q,
        ) || [],
    }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Test Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create New Test
        </button>
      </div>

      {/* Tests List */}
      <div className="grid gap-4">
        {tests.map((test) => (
          <div key={test.id} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{test.title}</h3>
                <p className="text-gray-600 text-sm">{test.description}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>Duration: {test.duration_minutes} min</span>
                  <span>Questions: {test.questions?.length || 0}</span>
                  <span>
                    Start: {new Date(test.start_time).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleTestStatus(test.id, test.is_active)}
                  className={`px-3 py-1 rounded text-sm ${
                    test.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {test.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() =>
                    window.open(`/faculty/test-results/${test.id}`, "_blank")
                  }
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                >
                  View Results
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Test</h2>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Test Title
                </label>
                <input
                  type="text"
                  value={newTest.title || ""}
                  onChange={(e) =>
                    setNewTest((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
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
                className="w-full border rounded px-3 py-2 h-20"
              />
            </div>

            {/* Questions */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Questions</h3>
                <button
                  onClick={addQuestion}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Add Question
                </button>
              </div>

              {newTest.questions?.map((question, qIndex) => (
                <div key={qIndex} className="border rounded p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Question Title
                      </label>
                      <input
                        type="text"
                        value={question.title}
                        onChange={(e) =>
                          updateQuestion(qIndex, "title", e.target.value)
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Difficulty
                        </label>
                        <select
                          value={question.difficulty}
                          onChange={(e) =>
                            updateQuestion(qIndex, "difficulty", e.target.value)
                          }
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              "points",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Time Limit (s)
                        </label>
                        <input
                          type="number"
                          value={question.time_limit_seconds}
                          onChange={(e) =>
                            updateQuestion(
                              qIndex,
                              "time_limit_seconds",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Problem Description
                    </label>
                    <textarea
                      value={question.description}
                      onChange={(e) =>
                        updateQuestion(qIndex, "description", e.target.value)
                      }
                      className="w-full border rounded px-3 py-2 h-24"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Sample Input
                      </label>
                      <textarea
                        value={question.sample_input}
                        onChange={(e) =>
                          updateQuestion(qIndex, "sample_input", e.target.value)
                        }
                        className="w-full border rounded px-3 py-2 h-16"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Sample Output
                      </label>
                      <textarea
                        value={question.sample_output}
                        onChange={(e) =>
                          updateQuestion(
                            qIndex,
                            "sample_output",
                            e.target.value,
                          )
                        }
                        className="w-full border rounded px-3 py-2 h-16"
                      />
                    </div>
                  </div>

                  {/* Test Cases */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">
                        Test Cases (Hidden)
                      </label>
                      <button
                        onClick={() => addTestCase(qIndex)}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                      >
                        Add Test Case
                      </button>
                    </div>
                    {question.test_cases.map((testCase, tcIndex) => (
                      <div
                        key={tcIndex}
                        className="grid grid-cols-2 gap-2 mb-2"
                      >
                        <input
                          type="text"
                          placeholder="Input"
                          value={testCase.input}
                          onChange={(e) => {
                            const newTestCases = [...question.test_cases];
                            newTestCases[tcIndex].input = e.target.value;
                            updateQuestion(qIndex, "test_cases", newTestCases);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Expected Output"
                          value={testCase.expected_output}
                          onChange={(e) => {
                            const newTestCases = [...question.test_cases];
                            newTestCases[tcIndex].expected_output =
                              e.target.value;
                            updateQuestion(qIndex, "test_cases", newTestCases);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createTest}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
