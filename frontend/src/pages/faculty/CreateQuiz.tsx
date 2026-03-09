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

type QuestionType = "mcq" | "fill_blank" | "true_false";

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

  const handleSaveQuiz = () => {
    if (!isQuizValid()) {
      toast.error("Please complete all questions and select correct answers.");
      return;
    }

    const fullQuizData = {
      ...taskData,
      id: Date.now().toString(),
      type: "quiz",
      questions,
      createdAt: new Date().toISOString(),
      status: "scheduled",
      students: 45,
      submissions: 0,
    };

    // Store in localStorage for demo
    const existingTasks = JSON.parse(
      localStorage.getItem("faculty_tasks") || "[]",
    );
    existingTasks.push(fullQuizData);
    localStorage.setItem("faculty_tasks", JSON.stringify(existingTasks));

    toast.success("Quiz created successfully!");
    navigate("/faculty/tasks");
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
                {taskData.subject} • {questions.length} Questions
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
      </div>
    </FacultyLayout>
  );
};

export default CreateQuiz;
