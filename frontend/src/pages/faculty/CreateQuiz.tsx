import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Radio,
  Type,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { readStoredAuth } from "@/lib/authSession";

type QuestionType = "mcq" | "fill_blank" | "true_false";
const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface QuizData {
  title: string;
  cls: string;
  batchId?: number | null;
  subject: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
  instructions: string[];
  grading: any;
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const taskData = location.state?.taskData as QuizData;

  useEffect(() => {
    if (!taskData) {
      navigate("/faculty/tasks");
      toast.error("No quiz data found. Please start from the task manager.");
    }
  }, [taskData, navigate]);

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      question: "",
      type: "mcq",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 1,
    },
  ]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGenerate = async () => {
    const topicToUse = aiTopic.trim() || taskData?.subject || taskData?.title;
    if (!topicToUse) {
      toast.error("Please enter a topic to generate questions.");
      return;
    }
    setIsGenerating(true);
    try {
      const authSession = readStoredAuth();
      const res = await fetch(`${API_BASE}/api/ai/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authSession?.token ? { Authorization: `Bearer ${authSession.token}` } : {}),
        },
        body: JSON.stringify({
          topic: topicToUse,
          questionCount: aiCount,
          difficulty: aiDifficulty,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const generatedList: Question[] = data.questions.map((q: any, idx: number) => {
          const correctOpt = q.options.find((o: any) => o.is_correct);
          return {
            id: (questions.length + idx + 1).toString(),
            question: q.question_text,
            type: "mcq" as QuestionType,
            options: q.options.map((o: any) => o.option_text),
            correctAnswer: correctOpt ? correctOpt.option_text : q.options[0]?.option_text || "",
            points: 1,
          };
        });

        setQuestions((prev) =>
          prev.length === 1 && !prev[0].question.trim() ? generatedList : [...prev, ...generatedList],
        );
        toast.success(`Generated ${generatedList.length} questions using Gemini AI!`);
        setShowAiModal(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "AI generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: (questions.length + 1).toString(),
      question: "",
      type: "mcq",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length === 1) {
      toast.error("You must have at least one question.");
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    );
  };

  const handleOptionChange = (qId: string, optIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const newOptions = [...q.options];
          newOptions[optIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      }),
    );
  };

  const handleTypeChange = (qId: string, type: QuestionType) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          let options = ["", "", "", ""];
          const correctAnswer = "";
          if (type === "true_false") {
            options = ["True", "False"];
          } else if (type === "fill_blank") {
            options = [];
          }
          return { ...q, type, options, correctAnswer };
        }
        return q;
      }),
    );
  };

  const isQuizValid = () => {
    return questions.every((q) => {
      if (!q.question.trim()) return false;
      if (q.type === "mcq") {
        return (
          q.options.filter((opt) => opt.trim()).length >= 2 && q.correctAnswer
        );
      }
      if (q.type === "true_false") {
        return q.correctAnswer;
      }
      if (q.type === "fill_blank") {
        return q.correctAnswer.trim();
      }
      return true;
    });
  };

  const handleSaveQuiz = async () => {
    if (!isQuizValid()) {
      toast.error("Please complete all questions and select correct answers.");
      return;
    }

    const authSession = readStoredAuth();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (authSession?.token) {
      headers.Authorization = `Bearer ${authSession.token}`;
    }

    try {
      const createResponse = await fetch(`${API_BASE}/api/quizzes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: taskData.title,
          cls: taskData.cls,
          batchId: taskData.batchId ?? null,
          duration: `${taskData.duration} mins`,
          questions: questions.map((question) => ({
            question: question.question,
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
          })),
        }),
      });

      if (!createResponse.ok) {
        const body = (await createResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to create quiz.");
      }

      const createdQuiz = (await createResponse.json()) as {
        quiz_id?: number;
      };

      if (!createdQuiz.quiz_id) {
        throw new Error("Quiz was created but no quiz id was returned.");
      }

      const publishResponse = await fetch(
        `${API_BASE}/api/quizzes/${createdQuiz.quiz_id}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: "Published" }),
        },
      );

      if (!publishResponse.ok) {
        const body = (await publishResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Quiz was created but not published.");
      }

      toast.success("Quiz created successfully!");
      navigate("/faculty/quizzes");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save quiz.";
      toast.error(message);
    }
  };

  if (!taskData) return null;

  return (
    <FacultyLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/faculty/tasks")}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {taskData.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {[taskData.subject, taskData.cls, `${questions.length} Questions`]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/faculty/tasks")}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 gap-2 shadow-sm"
              onClick={() => {
                setAiTopic(taskData.subject || taskData.title || "");
                setShowAiModal(true);
              }}
            >
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              Generate with AI
            </Button>
            <Button
              className="gradient-accent text-white"
              onClick={handleSaveQuiz}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Quiz
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 border border-border/50 relative group"
            >
              <button
                onClick={() => handleRemoveQuestion(q.id)}
                className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-6">
                  {/* Question Title & Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Question Text</Label>
                      <Input
                        placeholder="Enter your question here..."
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(q.id, { question: e.target.value })
                        }
                        className="text-lg font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={q.type}
                        onValueChange={(value: QuestionType) =>
                          handleTypeChange(q.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">
                            True / False
                          </SelectItem>
                          <SelectItem value="fill_blank">
                            Fill in the Blank
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      {q.type === "mcq" ? (
                        <Radio className="w-4 h-4" />
                      ) : q.type === "fill_blank" ? (
                        <Type className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {q.type === "mcq"
                        ? "Options (Mark the correct one)"
                        : q.type === "fill_blank"
                          ? "Answer"
                          : "Correct Answer"}
                    </Label>

                    {q.type === "fill_blank" ? (
                      <Input
                        placeholder="Enter the correct answer..."
                        value={q.correctAnswer}
                        onChange={(e) =>
                          updateQuestion(q.id, {
                            correctAnswer: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <RadioGroup
                        value={q.correctAnswer}
                        onValueChange={(value) =>
                          updateQuestion(q.id, { correctAnswer: value })
                        }
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {q.options.map((opt, optIndex) => (
                          <div
                            key={optIndex}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              q.correctAnswer === opt && opt !== ""
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem
                              value={opt}
                              id={`q-${q.id}-opt-${optIndex}`}
                              disabled={!opt.trim()}
                            />
                            {q.type === "mcq" ? (
                              <Input
                                placeholder={`Option ${optIndex + 1}`}
                                value={opt}
                                onChange={(e) =>
                                  handleOptionChange(
                                    q.id,
                                    optIndex,
                                    e.target.value,
                                  )
                                }
                                className="border-none bg-transparent p-0 focus-visible:ring-0"
                              />
                            ) : (
                              <Label
                                htmlFor={`q-${q.id}-opt-${optIndex}`}
                                className="flex-1 cursor-pointer"
                              >
                                {opt}
                              </Label>
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Points
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        className="w-20 h-8"
                        value={q.points}
                        onChange={(e) =>
                          updateQuestion(q.id, {
                            points: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          <Button
            variant="outline"
            className="w-full py-8 border-dashed border-2 rounded-2xl hover:bg-secondary/50 transition-all flex flex-col gap-2"
            onClick={handleAddQuestion}
          >
            <Plus className="w-6 h-6 text-primary" />
            <span className="font-semibold">Add Another Question</span>
          </Button>
        </div>

        {/* AI Quiz Generation Modal */}
        <AnimatePresence>
          {showAiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Generate Questions with AI</h3>
                    <p className="text-xs text-muted-foreground">Powered by Google Gemini 2.5 Flash</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-300">Topic or Subject</Label>
                    <Input
                      placeholder="e.g. Binary Search Trees, SQL Joins, Cloud Computing"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-300">Question Count</Label>
                      <Select
                        value={aiCount.toString()}
                        onValueChange={(val) => setAiCount(parseInt(val) || 5)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Questions</SelectItem>
                          <SelectItem value="5">5 Questions</SelectItem>
                          <SelectItem value="10">10 Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-300">Difficulty</Label>
                      <Select
                        value={aiDifficulty}
                        onValueChange={(val: any) => setAiDifficulty(val)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <Button
                      variant="ghost"
                      onClick={() => setShowAiModal(false)}
                      disabled={isGenerating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAiGenerate}
                      disabled={isGenerating}
                      className="gradient-primary text-white gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate MCQs
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </FacultyLayout>
  );
};

export default CreateQuiz;
