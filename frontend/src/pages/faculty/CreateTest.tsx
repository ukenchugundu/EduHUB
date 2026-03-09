import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Save,
  Eye,
  Trash2,
  Clock,
  Users,
  Calendar,
  Settings,
  Target,
  CheckCircle2,
  AlertCircle,
  FileText,
  Code,
  Type,
  ToggleLeft,
} from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";

interface Question {
  id: string;
  type: "mcq" | "coding" | "short_answer" | "true_false";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  points: number;
  explanation?: string;
  // Coding question specific fields
  language?: string;
  testCases?: TestCase[];
  timeComplexity?: string;
  spaceComplexity?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

interface TestData {
  title: string;
  subject: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
  instructions: string[];
  proctoring: {
    level: "basic" | "standard" | "strict";
    enableWebcam: boolean;
    enableScreenShare: boolean;
    lockdownMode: boolean;
    allowedAttempts: number;
    maxViolations: number;
  };
  grading: any;
}

const CreateTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const taskData = location.state?.taskData as TestData;

  useEffect(() => {
    if (!taskData) {
      navigate("/faculty/tasks");
    }
  }, [taskData, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: "mcq",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    points: 1,
    language: "python",
    testCases: [],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    difficulty: "medium",
    tags: [],
  });

  const [currentTestCase, setCurrentTestCase] = useState({
    input: "",
    expectedOutput: "",
    isHidden: false,
    points: 1,
  });

  const programmingLanguages = [
    { value: "python", label: "Python 3.9", icon: "🐍" },
    { value: "java", label: "Java 17", icon: "☕" },
    { value: "cpp", label: "C++ 17", icon: "⚡" },
    { value: "c", label: "C (GCC)", icon: "🔧" },
    { value: "javascript", label: "Node.js", icon: "🟨" },
    { value: "go", label: "Go 1.19", icon: "🔵" },
    { value: "rust", label: "Rust", icon: "🦀" },
    { value: "kotlin", label: "Kotlin", icon: "🟣" },
  ];

  const complexityOptions = [
    {
      value: "O(1)",
      label: "O(1) - Constant",
      color: "text-green-600",
      description: "Best",
    },
    {
      value: "O(log n)",
      label: "O(log n) - Logarithmic",
      color: "text-green-500",
      description: "Excellent",
    },
    {
      value: "O(n)",
      label: "O(n) - Linear",
      color: "text-blue-600",
      description: "Good",
    },
    {
      value: "O(n log n)",
      label: "O(n log n) - Linearithmic",
      color: "text-yellow-600",
      description: "Fair",
    },
    {
      value: "O(n²)",
      label: "O(n²) - Quadratic",
      color: "text-orange-600",
      description: "Poor",
    },
    {
      value: "O(n³)",
      label: "O(n³) - Cubic",
      color: "text-red-500",
      description: "Bad",
    },
    {
      value: "O(2^n)",
      label: "O(2^n) - Exponential",
      color: "text-red-600",
      description: "Terrible",
    },
    {
      value: "O(n!)",
      label: "O(n!) - Factorial",
      color: "text-red-700",
      description: "Worst",
    },
  ];

  const difficultyLevels = [
    { value: "easy", label: "Easy", color: "text-green-600 bg-green-500/10" },
    {
      value: "medium",
      label: "Medium",
      color: "text-yellow-600 bg-yellow-500/10",
    },
    { value: "hard", label: "Hard", color: "text-red-600 bg-red-500/10" },
  ];

  const questionTypes = [
    { type: "mcq", label: "Multiple Choice", icon: CheckCircle2 },
    { type: "coding", label: "Coding Problem", icon: Code },
    { type: "short_answer", label: "Short Answer", icon: Type },
    { type: "true_false", label: "True/False", icon: ToggleLeft },
  ];

  const addTestCase = () => {
    if (
      !currentTestCase.input.trim() ||
      !currentTestCase.expectedOutput.trim()
    ) {
      alert("Please fill in both input and expected output");
      return;
    }

    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: currentTestCase.input,
      expectedOutput: currentTestCase.expectedOutput,
      isHidden: currentTestCase.isHidden,
      points: currentTestCase.points,
    };

    setCurrentQuestion({
      ...currentQuestion,
      testCases: [...(currentQuestion.testCases || []), newTestCase],
    });

    setCurrentTestCase({
      input: "",
      expectedOutput: "",
      isHidden: false,
      points: 1,
    });
  };

  const removeTestCase = (id: string) => {
    setCurrentQuestion({
      ...currentQuestion,
      testCases: currentQuestion.testCases?.filter((tc) => tc.id !== id),
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.question?.trim()) {
      alert("Please enter a question");
      return;
    }

    if (
      currentQuestion.type === "coding" &&
      (!currentQuestion.testCases || currentQuestion.testCases.length === 0)
    ) {
      alert("Please add at least one test case for coding questions");
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: currentQuestion.type as Question["type"],
      question: currentQuestion.question,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer!,
      points: currentQuestion.points || 1,
      explanation: currentQuestion.explanation,
      language: currentQuestion.language,
      testCases: currentQuestion.testCases,
      timeComplexity: currentQuestion.timeComplexity,
      spaceComplexity: currentQuestion.spaceComplexity,
      difficulty: currentQuestion.difficulty,
      tags: currentQuestion.tags,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      type: "mcq",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 1,
      language: "python",
      testCases: [],
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      difficulty: "medium",
      tags: [],
    });
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handlePublishTest = () => {
    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    const testData = {
      ...taskData,
      questions,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    };

    // Store test data
    const existingTests = JSON.parse(
      localStorage.getItem("faculty_tests") || "[]",
    );
    existingTests.push(testData);
    localStorage.setItem("faculty_tests", JSON.stringify(existingTests));

    alert(`Test "${taskData?.title}" published successfully!`);
    navigate("/faculty/tasks");
  };

  if (!taskData) return null;

  const renderQuestionForm = () => {
    switch (currentQuestion.type) {
      case "mcq":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <textarea
                value={currentQuestion.question}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    question: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-border bg-background"
                rows={3}
                placeholder="Enter your question..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Options</label>
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={currentQuestion.correctAnswer === index}
                    onChange={() =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        correctAnswer: index,
                      })
                    }
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(currentQuestion.options || [])];
                      newOptions[index] = e.target.value;
                      setCurrentQuestion({
                        ...currentQuestion,
                        options: newOptions,
                      });
                    }}
                    className="flex-1 p-2 rounded-lg border border-border bg-background"
                    placeholder={`Option ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case "coding":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Problem Statement
              </label>
              <textarea
                value={currentQuestion.question}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    question: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-border bg-background"
                rows={5}
                placeholder="Describe the coding problem with examples..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Programming Language
                </label>
                <select
                  value={currentQuestion.language}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      language: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-border bg-background"
                >
                  {programmingLanguages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.icon} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Difficulty
                </label>
                <select
                  value={currentQuestion.difficulty}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      difficulty: e.target.value as "easy" | "medium" | "hard",
                    })
                  }
                  className="w-full p-3 rounded-xl border border-border bg-background"
                >
                  {difficultyLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Time Complexity
                </label>
                <select
                  value={currentQuestion.timeComplexity}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      timeComplexity: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {complexityOptions.map((complexity) => (
                    <option
                      key={complexity.value}
                      value={complexity.value}
                      className={complexity.color}
                    >
                      {complexity.label} ({complexity.description})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-muted-foreground">
                  Expected algorithmic time complexity
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Space Complexity
                </label>
                <select
                  value={currentQuestion.spaceComplexity}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      spaceComplexity: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {complexityOptions.map((complexity) => (
                    <option
                      key={complexity.value}
                      value={complexity.value}
                      className={complexity.color}
                    >
                      {complexity.label} ({complexity.description})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-muted-foreground">
                  Expected memory space complexity
                </div>
              </div>
            </div>

            {/* Test Cases Section */}
            <div className="border-t border-border pt-6">
              <h4 className="text-lg font-medium mb-4">Test Cases</h4>

              {/* Add Test Case Form */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border mb-4">
                <h5 className="font-medium mb-3">Add Test Case</h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Input
                    </label>
                    <textarea
                      value={currentTestCase.input}
                      onChange={(e) =>
                        setCurrentTestCase({
                          ...currentTestCase,
                          input: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-lg border border-border bg-background"
                      rows={3}
                      placeholder="Enter test input..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Expected Output
                    </label>
                    <textarea
                      value={currentTestCase.expectedOutput}
                      onChange={(e) =>
                        setCurrentTestCase({
                          ...currentTestCase,
                          expectedOutput: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-lg border border-border bg-background"
                      rows={3}
                      placeholder="Enter expected output..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currentTestCase.isHidden}
                        onChange={(e) =>
                          setCurrentTestCase({
                            ...currentTestCase,
                            isHidden: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span className="text-sm">Hidden from students</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <label className="text-sm">Points:</label>
                      <input
                        type="number"
                        value={currentTestCase.points}
                        onChange={(e) =>
                          setCurrentTestCase({
                            ...currentTestCase,
                            points: parseInt(e.target.value),
                          })
                        }
                        className="w-16 p-1 rounded border border-border bg-background"
                        min="1"
                      />
                    </div>
                  </div>

                  <button
                    onClick={addTestCase}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Test Case
                  </button>
                </div>
              </div>

              {/* Test Cases List */}
              {currentQuestion.testCases &&
                currentQuestion.testCases.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium">
                      Test Cases ({currentQuestion.testCases.length})
                    </h5>
                    {currentQuestion.testCases.map((testCase, index) => (
                      <div
                        key={testCase.id}
                        className="p-4 rounded-lg bg-background border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Case {index + 1}
                            </span>
                            {testCase.isHidden && (
                              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-600">
                                Hidden
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                              {testCase.points} pts
                            </span>
                          </div>

                          <button
                            onClick={() => removeTestCase(testCase.id)}
                            className="w-6 h-6 rounded bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">
                              Input:
                            </div>
                            <pre className="bg-secondary/50 p-2 rounded text-xs overflow-x-auto">
                              {testCase.input}
                            </pre>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">
                              Expected Output:
                            </div>
                            <pre className="bg-secondary/50 p-2 rounded text-xs overflow-x-auto">
                              {testCase.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        );

      case "short_answer":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <textarea
                value={currentQuestion.question}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    question: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-border bg-background"
                rows={3}
                placeholder="Enter your question..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sample Answer
              </label>
              <textarea
                value={currentQuestion.correctAnswer as string}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    correctAnswer: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-border bg-background"
                rows={2}
                placeholder="Enter a sample correct answer..."
              />
            </div>
          </div>
        );

      case "true_false":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Statement
              </label>
              <textarea
                value={currentQuestion.question}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    question: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-border bg-background"
                rows={3}
                placeholder="Enter the statement..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Correct Answer
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tf_answer"
                    checked={currentQuestion.correctAnswer === true}
                    onChange={() =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        correctAnswer: true,
                      })
                    }
                  />
                  <span>True</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tf_answer"
                    checked={currentQuestion.correctAnswer === false}
                    onChange={() =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        correctAnswer: false,
                      })
                    }
                  />
                  <span>False</span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/faculty/tasks")}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Create Test
              </h1>
              <p className="text-sm text-muted-foreground">
                {taskData?.title || "New Test"} • Step {currentStep} of 3
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Step 1: Task Settings */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold mb-6">Test Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Test Title
                  </label>
                  <div className="p-3 rounded-xl bg-secondary/50 text-foreground">
                    {taskData?.title || "Test Title"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject
                  </label>
                  <div className="p-3 rounded-xl bg-secondary/50 text-foreground">
                    {taskData?.subject || "Subject"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duration
                  </label>
                  <div className="p-3 rounded-xl bg-secondary/50 text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {taskData?.duration || 60} minutes
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Schedule
                  </label>
                  <div className="p-3 rounded-xl bg-secondary/50 text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {taskData?.startDate} at {taskData?.startTime}
                  </div>
                </div>

                  <div>
                  <label className="block text-sm font-medium mb-2">
                    Security Level
                  </label>
                  <div className="p-3 rounded-xl bg-secondary/50 text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {taskData?.proctoring?.level || "Standard"} Monitoring
                    {taskData?.proctoring?.maxViolations && (
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-600">
                        {taskData.proctoring.maxViolations} violations allowed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Add Questions
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Add Questions */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Question Type Selector */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Add Question</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {questionTypes.map((type) => (
                  <button
                    key={type.type}
                    onClick={() =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        type: type.type as Question["type"],
                      })
                    }
                    className={`p-3 rounded-xl border-2 transition-colors ${
                      currentQuestion.type === type.type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <type.icon className="w-5 h-5 mx-auto mb-2" />
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>

              {renderQuestionForm()}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        points: parseInt(e.target.value),
                      })
                    }
                    className="w-20 p-2 rounded-lg border border-border bg-background"
                    min="1"
                  />
                </div>

                <button
                  onClick={addQuestion}
                  className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            {questions.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Questions ({questions.length})
                </h3>

                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="p-4 rounded-xl bg-secondary/30 border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              Q{index + 1}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {question.type.replace("_", " ")}
                            </span>
                            {question.language && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">
                                {
                                  programmingLanguages.find(
                                    (l) => l.value === question.language,
                                  )?.label
                                }
                              </span>
                            )}
                            {question.difficulty && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  difficultyLevels.find(
                                    (d) => d.value === question.difficulty,
                                  )?.color
                                }`}
                              >
                                {question.difficulty}
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                              {question.points} pts
                            </span>
                            {question.testCases &&
                              question.testCases.length > 0 && (
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-600">
                                  {question.testCases.length} test cases
                                </span>
                              )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">
                            {question.question}
                          </p>
                          {question.type === "coding" && (
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span className="text-muted-foreground">
                                  Time:
                                </span>
                                <span
                                  className={
                                    complexityOptions.find(
                                      (c) =>
                                        c.value === question.timeComplexity,
                                    )?.color || "text-foreground"
                                  }
                                >
                                  {question.timeComplexity}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                <span className="text-muted-foreground">
                                  Space:
                                </span>
                                <span
                                  className={
                                    complexityOptions.find(
                                      (c) =>
                                        c.value === question.spaceComplexity,
                                    )?.color || "text-foreground"
                                  }
                                >
                                  {question.spaceComplexity}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => removeQuestion(question.id)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Review & Publish
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Review & Publish */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold mb-6">Review & Publish</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Test Details</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{taskData?.title}</p>
                    <p>{taskData?.subject}</p>
                    <p>{taskData?.duration} minutes</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Questions</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{questions.length} questions</p>
                    <p>
                      {questions.reduce((sum, q) => sum + q.points, 0)} total
                      points
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Schedule</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{taskData?.startDate}</p>
                    <p>
                      {taskData?.startTime} - {taskData?.endTime}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground"
                >
                  Back to Questions
                </button>

                <button
                  onClick={handlePublishTest}
                  className="px-6 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Publish Test
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default CreateTest;
