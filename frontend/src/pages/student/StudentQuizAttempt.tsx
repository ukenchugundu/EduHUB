import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import EduHubAIAgent from "@/components/EduHubAIAgent";
import { getStudentIdentity, readStoredAuth } from "@/lib/authSession";

interface QuizQuestion {
  question_id: number;
  question_text: string;
  question_type: string;
  options: Array<{ option_id: number; option_text: string }>;
}

interface Quiz {
  quiz_id: number;
  cls: string;
  title: string;
  duration: string;
  status: string;
  questions: QuizQuestion[];
}

interface QuizAttempt {
  attempt_id: number;
  quiz_id: number;
  status: string;
  remaining_seconds: number;
  score?: number | null;
  faculty_score?: number | null;
  answers: Record<number, string>;
  quiz: Quiz;
}

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");
const QUIZ_API_URL = `${API_BASE}/api/quizzes`;

const getQuizRequestHeaders = (): HeadersInit => {
  const session = readStoredAuth();
  const studentId = getStudentIdentity();

  return {
    "Content-Type": "application/json",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(studentId ? { "x-student-id": studentId } : {}),
  };
};

const parseDurationToMinutes = (duration: string): number => {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 30;
};

const readApiErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
};

const StudentQuizAttempt = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secureModeArmed, setSecureModeArmed] = useState(false);
  const [secureModeActive, setSecureModeActive] = useState(false);
  const [securityViolations, setSecurityViolations] = useState(0);
  const [securityWarning, setSecurityWarning] = useState("");
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptIdRef = useRef<number | null>(null);
  const answersRef = useRef<Record<number, string>>({});
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const persistAnswers = async (
    activeAttemptId: number,
    nextAnswers: Record<number, string>,
  ) => {
    const answerArray = Object.entries(nextAnswers)
      .filter(([, answerText]) => answerText.trim() !== "")
      .map(([questionId, answerText]) => ({
        questionId: parseInt(questionId, 10),
        answerText,
      }));

    if (answerArray.length === 0) {
      return;
    }

    const response = await fetch(
      `${QUIZ_API_URL}/${quizId}/attempts/${activeAttemptId}/answers`,
      {
        method: "PUT",
        headers: getQuizRequestHeaders(),
        body: JSON.stringify({ answers: answerArray }),
      },
    );

    if (!response.ok) {
      throw new Error(
        await readApiErrorMessage(response, "Failed to save quiz answers."),
      );
    }
  };

  const enterSecureMode = async () => {
    if (document.fullscreenElement) {
      setSecureModeActive(true);
      setSecureModeArmed(true);
      setSecurityWarning("");
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      setSecureModeActive(true);
      setSecureModeArmed(true);
      setSecurityWarning("");
    } catch (enterError) {
      console.error("Unable to enter secure mode:", enterError);
      setSecurityWarning(
        "Fullscreen permission was denied. Please allow fullscreen to start the secure quiz.",
      );
    }
  };

  const handleSubmit = async (
    reason: "manual" | "auto" | "security" = "manual",
  ) => {
    if (!quiz || submitInFlightRef.current) {
      return;
    }

    const activeAttemptId = attempt?.attempt_id ?? attemptIdRef.current;
    if (!activeAttemptId) {
      setSubmitError("Quiz attempt was not initialized. Please reopen the quiz.");
      return;
    }

    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await persistAnswers(activeAttemptId, answersRef.current);

      const response = await fetch(
        `${QUIZ_API_URL}/${quiz.quiz_id}/attempts/${activeAttemptId}/submit`,
        {
          method: "POST",
          headers: getQuizRequestHeaders(),
          body: JSON.stringify({
            reason,
            answers: Object.entries(answersRef.current)
              .filter(([, answerText]) => answerText.trim() !== "")
              .map(([questionId, answerText]) => ({
                questionId: parseInt(questionId, 10),
                answerText,
              })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Failed to submit quiz."),
        );
      }

      const result = (await response.json()) as QuizAttempt;
      setAttempt(result);
      attemptIdRef.current = result.attempt_id;
      setQuiz(result.quiz ?? quiz);
      setAnswers(result.answers ?? answersRef.current);
      setScore(Number(result.faculty_score ?? result.score ?? 0) || 0);
      setIsSubmitted(true);
      setShowResults(true);
    } catch (submitAttemptError) {
      console.error("Error submitting quiz:", submitAttemptError);
      setSubmitError(
        submitAttemptError instanceof Error
          ? submitAttemptError.message
          : "Failed to submit quiz.",
      );
    } finally {
      setIsSubmitting(false);
      submitInFlightRef.current = false;
    }
  };

  useEffect(() => {
    const startAttempt = async () => {
      try {
        const response = await fetch(`${QUIZ_API_URL}/${quizId}/attempts/start`, {
          method: "POST",
          headers: getQuizRequestHeaders(),
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(
            await readApiErrorMessage(response, "Failed to start quiz."),
          );
        }

        const data = (await response.json()) as QuizAttempt;
        setAttempt(data);
        setQuiz(data.quiz);
        attemptIdRef.current = data.attempt_id;
        setAnswers(data.answers || {});
        setTimeLeft(
          data.remaining_seconds ||
            parseDurationToMinutes(data.quiz?.duration || "30") * 60,
        );

        if (data.status === "Submitted") {
          setScore(Number(data.faculty_score ?? data.score ?? 0) || 0);
          setIsSubmitted(true);
          setShowResults(true);
        }
      } catch (startError) {
        console.error("Error starting attempt:", startError);
        setError(
          startError instanceof Error
            ? startError.message
            : "Failed to load quiz. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      void startAttempt();
    }
  }, [quizId]);

  useEffect(() => {
    if (attempt && !isSubmitted && Object.keys(answers).length > 0) {
      saveIntervalRef.current = setInterval(() => {
        void persistAnswers(attempt.attempt_id, answersRef.current).catch(
          (saveError) => {
            console.error("Error auto-saving answers:", saveError);
          },
        );
      }, 10000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [attempt, isSubmitted, quizId, answers]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted && quiz) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (timeLeft === 0 && !isSubmitted && quiz) {
      void handleSubmit("auto");
    }
  }, [timeLeft, isSubmitted, quiz]);

  useEffect(() => {
    if (!quiz || isSubmitted) {
      setSecureModeArmed(false);
      setSecureModeActive(false);
      setSecurityViolations(0);
      setSecurityWarning("");
      return;
    }

    setSecureModeActive(Boolean(document.fullscreenElement));
  }, [quiz, isSubmitted]);

  useEffect(() => {
    if (!quiz || isSubmitted || !secureModeArmed) {
      return;
    }

    const registerViolation = (message: string) => {
      setSecurityWarning(message);
      setSecurityViolations((current) => {
        const next = current + 1;
        if (next >= 3 && !submitInFlightRef.current) {
          void handleSubmit("security");
        }
        return next;
      });
    };

    const handleFullscreenChange = () => {
      const nextActive = Boolean(document.fullscreenElement);
      setSecureModeActive(nextActive);
      if (!nextActive) {
        registerViolation(
          "Secure mode was exited. Re-enter fullscreen to continue the quiz.",
        );
      } else {
        setSecurityWarning("");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation(
          "Tab switching was detected. Please stay on the quiz screen.",
        );
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleClipboardEvent = (event: ClipboardEvent) => {
      event.preventDefault();
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      registerViolation("Navigation away from the quiz was blocked.");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const lowerKey = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;
      const blockedShortcut =
        event.key === "F11" ||
        event.key === "F12" ||
        event.key === "Escape" ||
        (hasModifier &&
          ["r", "p", "s", "u", "c", "x", "v", "a"].includes(lowerKey)) ||
        (hasModifier &&
          event.shiftKey &&
          ["i", "j", "c"].includes(lowerKey));

      if (blockedShortcut) {
        event.preventDefault();
        registerViolation("Restricted keyboard shortcut detected.");
      }
    };

    window.history.pushState(null, "", window.location.href);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleClipboardEvent);
    document.addEventListener("cut", handleClipboardEvent);
    document.addEventListener("paste", handleClipboardEvent);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboardEvent);
      document.removeEventListener("cut", handleClipboardEvent);
      document.removeEventListener("paste", handleClipboardEvent);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [quiz, isSubmitted, secureModeArmed]);

  useEffect(() => {
    if (!isSubmitted || !document.fullscreenElement) {
      return;
    }

    void document.exitFullscreen().catch(() => undefined);
  }, [isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const getAnsweredCount = () =>
    Object.keys(answers).filter(
      (key) => answers[parseInt(key, 10)]?.trim() !== "",
    ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{error || "Quiz not found"}</p>
          <button
            onClick={() => navigate("/student/quizzes")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const totalQuestions = Math.max(1, quiz.questions.length);
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 60;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 text-center"
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                passed ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              {passed ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              )}
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              {passed ? "Quiz Completed!" : "Quiz Submitted"}
            </h1>

            <p className="text-muted-foreground mb-6">
              {quiz.title} • {quiz.cls}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-500/5 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-muted-foreground">Points Scored</div>
              </div>
              <div className="p-4 bg-purple-500/5 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">
                  {percentage}%
                </div>
                <div className="text-sm text-muted-foreground">Percentage</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-6">
              You scored {score} out of {totalQuestions} points
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/student/quizzes")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Quizzes
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / Math.max(quiz.questions.length, 1)) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">{quiz.cls}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                timeLeft < 300
                  ? "bg-red-500/10 text-red-600"
                  : "bg-blue-500/10 text-blue-600"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => void handleSubmit("manual")}
              disabled={
                getAnsweredCount() === 0 || isSubmitting || !secureModeArmed
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSubmitting
                ? "Submitting..."
                : `Submit (${getAnsweredCount()}/${quiz.questions.length})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {securityWarning ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700">
            {securityWarning} Violations: {securityViolations}/3
          </div>
        ) : null}

        {submitError ? (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-2xl p-8"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Question {currentQuestion + 1}
            </h2>
            <p className="text-foreground text-lg leading-relaxed">
              {currentQ.question_text}
            </p>
          </div>

          <div className="space-y-3">
            {currentQ.options && currentQ.options.length > 0 ? (
              currentQ.options.map((option) => (
                <label
                  key={option.option_id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    answers[currentQ.question_id] === option.option_text
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQ.question_id}`}
                    value={option.option_text}
                    checked={answers[currentQ.question_id] === option.option_text}
                    onChange={(event) =>
                      handleAnswerChange(currentQ.question_id, event.target.value)
                    }
                    className="text-primary"
                  />
                  <span className="text-foreground">{option.option_text}</span>
                </label>
              ))
            ) : (
              <textarea
                value={answers[currentQ.question_id] || ""}
                onChange={(event) =>
                  handleAnswerChange(currentQ.question_id, event.target.value)
                }
                className="w-full p-4 rounded-xl border border-border bg-background text-foreground"
                placeholder="Type your answer here..."
                rows={4}
              />
            )}
          </div>
        </motion.div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() =>
              setCurrentQuestion(Math.max(0, currentQuestion - 1))
            }
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-2">
            {quiz.questions.map((question, index) => (
              <button
                key={question.question_id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  index === currentQuestion
                    ? "bg-primary text-primary-foreground"
                    : answers[question.question_id]
                      ? "bg-green-500/20 text-green-600"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              setCurrentQuestion(
                Math.min(quiz.questions.length - 1, currentQuestion + 1),
              )
            }
            disabled={currentQuestion === quiz.questions.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>

      {!secureModeArmed || !secureModeActive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6">
          <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Enter Secure Quiz Mode
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This quiz requires fullscreen mode. Tab switching, right-click,
              copy/paste, refresh, and developer shortcuts are blocked. Three
              violations will auto-submit the quiz.
            </p>
            {securityWarning ? (
              <p className="mb-4 text-sm text-amber-700">{securityWarning}</p>
            ) : null}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => void enterSecureMode()}
                className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Enter Fullscreen and Start
              </button>
              <button
                onClick={() => navigate("/student/quizzes")}
                className="rounded-xl bg-secondary px-5 py-3 font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Exit Quiz
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EduHubAIAgent role="student" disabled defaultOpen />
    </div>
  );
};

export default StudentQuizAttempt;
