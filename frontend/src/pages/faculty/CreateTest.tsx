import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FacultyLayout from "@/components/FacultyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface TestCaseForm {
  id: string;
  input: string;
  expectedOutput: string;
}

interface QuestionForm {
  id: string;
  title: string;
  description: string;
  sampleInput: string;
  sampleOutput: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  timeLimitSeconds: number;
  testCases: TestCaseForm[];
}

const createEmptyQuestion = (suffix: number): QuestionForm => ({
  id: `question-${Date.now()}-${suffix}`,
  title: "",
  description: "",
  sampleInput: "",
  sampleOutput: "",
  difficulty: "Medium",
  points: 10,
  timeLimitSeconds: 30,
  testCases: [
    {
      id: `case-${Date.now()}-${suffix}`,
      input: "",
      expectedOutput: "",
    },
  ],
});

const CreateTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTaskData = location.state?.taskData as
    | {
        title?: string;
        subject?: string;
        cls?: string;
        description?: string;
        duration?: number;
      }
    | undefined;

  const [title, setTitle] = useState(initialTaskData?.title ?? "");
  const [subject, setSubject] = useState(initialTaskData?.subject ?? "");
  const [cls, setCls] = useState(initialTaskData?.cls ?? "");
  const [description, setDescription] = useState(
    initialTaskData?.description ?? "",
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    Number(initialTaskData?.duration) > 0
      ? Number(initialTaskData?.duration)
      : 90,
  );
  const [questions, setQuestions] = useState<QuestionForm[]>([
    createEmptyQuestion(1),
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.points || 0), 0),
    [questions],
  );

  const updateQuestion = (
    questionId: string,
    updates: Partial<QuestionForm>,
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question,
      ),
    );
  };

  const addQuestion = () => {
    setQuestions((current) => [...current, createEmptyQuestion(current.length + 1)]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((current) => {
      if (current.length === 1) {
        return current;
      }
      return current.filter((question) => question.id !== questionId);
    });
  };

  const addTestCase = (questionId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              testCases: [
                ...question.testCases,
                {
                  id: `case-${Date.now()}-${question.testCases.length + 1}`,
                  input: "",
                  expectedOutput: "",
                },
              ],
            }
          : question,
      ),
    );
  };

  const updateTestCase = (
    questionId: string,
    caseId: string,
    updates: Partial<TestCaseForm>,
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              testCases: question.testCases.map((testCase) =>
                testCase.id === caseId ? { ...testCase, ...updates } : testCase,
              ),
            }
          : question,
      ),
    );
  };

  const removeTestCase = (questionId: string, caseId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId || question.testCases.length === 1) {
          return question;
        }

        return {
          ...question,
          testCases: question.testCases.filter((testCase) => testCase.id !== caseId),
        };
      }),
    );
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast.error("Test title is required.");
      return false;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      toast.error("Duration must be a positive number.");
      return false;
    }

    for (const question of questions) {
      if (!question.title.trim() || !question.description.trim()) {
        toast.error("Each question needs a title and problem statement.");
        return false;
      }

      if (!Number.isFinite(question.points) || question.points <= 0) {
        toast.error("Each question must have positive points.");
        return false;
      }

      if (
        !Number.isFinite(question.timeLimitSeconds) ||
        question.timeLimitSeconds <= 0
      ) {
        toast.error("Each question needs a valid time limit.");
        return false;
      }

      if (question.testCases.length === 0) {
        toast.error("Each question needs at least one test case.");
        return false;
      }

      for (const testCase of question.testCases) {
        if (!testCase.input.trim() || !testCase.expectedOutput.trim()) {
          toast.error("All test cases need input and expected output.");
          return false;
        }
      }
    }

    return true;
  };

  const buildDescription = () => {
    const parts = [description.trim()];
    if (subject.trim()) {
      parts.push(`Subject: ${subject.trim()}`);
    }
    if (cls.trim()) {
      parts.push(`Class: ${cls.trim()}`);
    }
    return parts.filter(Boolean).join("\n\n");
  };

  const handlePublishTest = async () => {
    if (!validateForm()) {
      return;
    }

    const token = readStoredAuth()?.token?.trim();
    if (!token) {
      toast.error("Faculty session expired. Please sign in again.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/faculty/tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: buildDescription(),
          duration_minutes: Number(durationMinutes),
          questions: questions.map((question) => ({
            title: question.title.trim(),
            description: question.description.trim(),
            sample_input:
              question.sampleInput.trim() ||
              question.testCases[0]?.input.trim() ||
              "",
            sample_output:
              question.sampleOutput.trim() ||
              question.testCases[0]?.expectedOutput.trim() ||
              "",
            test_cases: question.testCases.map((testCase) => ({
              input: testCase.input.trim(),
              expected_output: testCase.expectedOutput.trim(),
            })),
            difficulty: question.difficulty,
            points: Number(question.points),
            time_limit_seconds: Number(question.timeLimitSeconds),
          })),
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to create coding test.");
      }

      toast.success("Coding test saved to the database.");
      navigate("/faculty/tests");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create coding test.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FacultyLayout title="Create Coding Test">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Create Coding Test
              </h1>
              <p className="text-sm text-muted-foreground">
                This flow now publishes directly to the coding test tables in the
                database.
              </p>
            </div>
          </div>
          <Button onClick={handlePublishTest} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Publish Test"}
          </Button>
        </div>

        <div className="glass-card rounded-2xl border border-border/50 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Test Title
              </label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Duration (minutes)
              </label>
              <Input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(Number(event.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Subject
              </label>
              <Input
                placeholder="Optional subject label"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Class
              </label>
              <Input
                placeholder="Optional class label"
                value={cls}
                onChange={(event) => setCls(event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">
                Test Description
              </label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what this coding assessment covers."
                className="min-h-[120px]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-secondary/30 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-muted-foreground">
              Total score: {totalPoints} points
            </p>
          </div>
          <Button variant="outline" onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        <div className="grid gap-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="glass-card rounded-2xl border border-border/50 p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Question {index + 1}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Define the prompt and evaluation cases that should be stored in
                    the database.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={questions.length === 1}
                  onClick={() => removeQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Problem Title
                  </label>
                  <Input
                    value={question.title}
                    onChange={(event) =>
                      updateQuestion(question.id, { title: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Problem Statement
                  </label>
                  <Textarea
                    className="min-h-[140px]"
                    value={question.description}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Difficulty
                  </label>
                  <select
                    value={question.difficulty}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        difficulty: event.target.value as QuestionForm["difficulty"],
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Points
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={question.points}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        points: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Time Limit (seconds)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={question.timeLimitSeconds}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        timeLimitSeconds: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Sample Input
                  </label>
                  <Textarea
                    value={question.sampleInput}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        sampleInput: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Sample Output
                  </label>
                  <Textarea
                    value={question.sampleOutput}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        sampleOutput: event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Test Cases</h3>
                    <p className="text-xs text-muted-foreground">
                      These are stored as the real evaluation cases for code execution.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => addTestCase(question.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Test Case
                  </Button>
                </div>

                {question.testCases.map((testCase, testCaseIndex) => (
                  <div
                    key={testCase.id}
                    className="rounded-2xl border border-border/50 bg-background/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        Test Case {testCaseIndex + 1}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={question.testCases.length === 1}
                        onClick={() => removeTestCase(question.id, testCase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Input
                        </label>
                        <Textarea
                          value={testCase.input}
                          onChange={(event) =>
                            updateTestCase(question.id, testCase.id, {
                              input: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Expected Output
                        </label>
                        <Textarea
                          value={testCase.expectedOutput}
                          onChange={(event) =>
                            updateTestCase(question.id, testCase.id, {
                              expectedOutput: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handlePublishTest} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Publish Test"}
          </Button>
        </div>
      </div>
    </FacultyLayout>
  );
};

export default CreateTest;
