import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Users,
  Play,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Target,
  Trophy,
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  subject: string;
  duration: number;
  instructions: string;
  questions: any[];
  totalPoints: number;
  status: string;
  createdAt: string;
}

interface QuizAttempt {
  quizId: string;
  studentId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  submittedAt: string;
}

const StudentQuizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    // Load published quizzes
    const publishedQuizzes = JSON.parse(
      localStorage.getItem("published_quizzes") || "[]",
    );
    setQuizzes(publishedQuizzes);

    // Load student attempts
    const quizAttempts = JSON.parse(
      localStorage.getItem("quiz_attempts") || "[]",
    );
    setAttempts(quizAttempts);
  }, []);

  const getAttemptForQuiz = (quizId: string) => {
    return attempts.find((attempt) => attempt.quizId === quizId);
  };

  const startQuiz = (quizId: string) => {
    navigate(`/student/quizzes/${quizId}`);
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Quizzes
              </h1>
              <p className="text-sm text-muted-foreground">
                Test your knowledge with interactive quizzes
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {quizzes.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Available Quizzes
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {attempts.length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {attempts.length > 0
                    ? Math.round(
                        attempts.reduce((acc, att) => acc + att.percentage, 0) /
                          attempts.length,
                      )
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes List */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Available Quizzes
          </h2>

          {quizzes.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No quizzes available
              </h3>
              <p className="text-muted-foreground">
                Check back later for new quizzes from your instructors
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => {
                const attempt = getAttemptForQuiz(quiz.id);
                const isCompleted = !!attempt;

                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-card rounded-2xl p-6 ${isCompleted ? "border-l-4 border-l-green-500" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isCompleted ? "bg-green-500/10" : "bg-blue-500/10"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-blue-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {quiz.subject}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {quiz.duration} minutes
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {quiz.questions.length} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {quiz.totalPoints} points
                            </span>
                          </div>

                          {isCompleted && attempt && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                                Score: {attempt.score}/{attempt.totalPoints} (
                                {attempt.percentage}%)
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Completed on{" "}
                                {new Date(
                                  attempt.submittedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600 font-medium">
                              Completed
                            </span>
                            <button
                              onClick={() => navigate("/student/results")}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                            >
                              <Trophy className="w-4 h-4" />
                              View Results
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startQuiz(quiz.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                          >
                            <Play className="w-4 h-4" />
                            Start Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentQuizzes;
