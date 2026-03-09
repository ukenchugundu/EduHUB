import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  ArrowLeft,
  BookOpen,
  Loader2,
} from "lucide-react";
import EduHubAIAgent from "@/components/EduHubAIAgent";

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
  answers: Record<number, string>;
  quiz: Quiz;
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const QUIZ_API_URL = `${API_BASE}/api/quizzes`;

const parseDurationToMinutes = (duration: string): number => {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1]) : 30;
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
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptIdRef = useRef<number | null>(null);

  // Start quiz attempt
  useEffect(() => {
    const startAttempt = async () => {
      try {
        const response = await fetch(`${QUIZ_API_URL}/${quizId}/attempts/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: "student-demo" }),
        });

        if (!response.ok) {
          // If attempt already exists, try to get it
          const getResponse = await fetch(`${QUIZ_API_URL}/${quizId}/attempts/1`);
          if (getResponse.ok) {
            const data = await getResponse.json();
            setAttempt(data);
            setQuiz(data.quiz);
            setAnswers(data.answers || {});
            setTimeLeft(data.remaining_seconds || parseDurationToMinutes(data.quiz?.duration || "30") * 60);
            if (data.status === "Submitted") {
              setIsSubmitted(true);
              setShowResults(true);
              setScore(data.score || 0);
            }
            setLoading(false);
            return;
          }
          throw new Error("Failed to start quiz");
        }

        const data = await response.json();
        setAttempt(data);
        setQuiz(data.quiz);
        attemptIdRef.current = data.attempt_id;
        setAnswers(data.answers || {});
        setTimeLeft(data.remaining_seconds || parseDurationToMinutes(data.quiz?.duration || "30") * 60);
      } catch (err) {
        console.error("Error starting attempt:", err);
        // Try to continue without starting an attempt
        try {
          const response = await fetch(`${QUIZ_API_URL}/${quizId}`);
          if (response.ok) {
            const data = await response.json();
            setQuiz(data);
            setTimeLeft(parseDurationToMinutes(data.duration || "30") * 60);
          }
        } catch (e) {
          setError("Failed to load quiz. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      startAttempt();
    }
  }, [quizId]);

  // Auto-save answers every 10 seconds
  useEffect(() => {
    if (attempt && !isSubmitted && Object.keys(answers).length > 0) {
      saveIntervalRef.current = setInterval(async () => {
        try {
          const answerArray = Object.entries(answers).map(([questionId, answerText]) => ({
            questionId: parseInt(questionId),
            answerText,
          }));
          
          await fetch(`${QUIZ_API_URL}/${quizId}/attempts/${attempt.attempt_id}/answers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: answerArray }),
          });
        } catch (err) {
          console.error("Error auto-saving answers:", err);
        }
      }, 10000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [attempt, answers, isSubmitted, quizId]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted && quiz) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted && quiz) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, quiz]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Calculate score locally
    let totalScore = 0;
    quiz.questions.forEach((question) => {
      const studentAnswer = answers[question.question_id] || "";
      // Check if answer matches any option
      const correctOption = question.options.find((opt) => 
        opt.option_text.toLowerCase().trim() === studentAnswer.toLowerCase().trim()
      );
      if (correctOption) {
        totalScore += 1;
      }
    });

    setScore(totalScore);
    setIsSubmitted(true);
    setShowResults(true);

    // Submit to backend
    try {
      const attemptId = attempt?.attempt_id || 1;
      const response = await fetch(`${QUIZ_API_URL}/${quiz.quiz_id}/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.score !== undefined) {
          setScore(result.score);
        }
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
    }
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter((key) => answers[parseInt(key)]?.trim() !== "").length;
  };

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
    const totalQuestions = quiz.questions.length;
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
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${passed ? "bg-green-500/10" : "bg-red-500/10"}`}>
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
                <div className="text-2xl font-bold text-purple-600">{percentage}%</div>
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
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

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
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${timeLeft < 300 ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={getAnsweredCount() === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Submit ({getAnsweredCount()}/{quiz.questions.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
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
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
                    onChange={(e) => handleAnswerChange(currentQ.question_id, e.target.value)}
                    className="text-primary"
                  />
                  <span className="text-foreground">{option.option_text}</span>
                </label>
              ))
            ) : (
              <textarea
                value={answers[currentQ.question_id] || ""}
                onChange={(e) => handleAnswerChange(currentQ.question_id, e.target.value)}
                className="w-full p-4 rounded-xl border border-border bg-background text-foreground"
                placeholder="Type your answer here..."
                rows={4}
              />
            )}
          </div>
        </motion.div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  index === currentQuestion
                    ? "bg-primary text-primary-foreground"
                    : answers[quiz.questions[index].question_id]
                      ? "bg-green-500/20 text-green-600"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
            disabled={currentQuestion === quiz.questions.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
      <EduHubAIAgent role="student" disabled defaultOpen />
    </div>
  );
};

export default StudentQuizAttempt;

