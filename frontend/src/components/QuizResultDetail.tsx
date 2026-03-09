import { motion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Clock,
  Calendar,
  Trophy,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";

interface QuizResult {
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
  status: string;
  submittedAt: string;
  timeSpent: number;
  class: string;
  questions?: Array<{
    id: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
  }>;
}

interface QuizResultDetailProps {
  result: QuizResult;
  onBack: () => void;
}

const QuizResultDetail = ({ result, onBack }: QuizResultDetailProps) => {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Quiz Summary
          </h1>
          <p className="text-sm text-muted-foreground">{result.quizTitle}</p>
        </div>
      </div>

      {/* Quiz Overview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {result.quizTitle}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/10 text-blue-500">
                  {result.class}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-orange-500/10 text-orange-500">
                  Quiz
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-bold ${getScoreColor(result.score, result.maxScore)}`}
            >
              {result.score}%
            </div>
            <div className="text-sm text-muted-foreground">
              {result.correctAnswers}/{result.totalQuestions} Correct
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 rounded-xl bg-blue-500/5">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {result.timeSpent}m
            </div>
            <div className="text-xs text-muted-foreground">Time Spent</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-500/5">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {result.correctAnswers}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-red-500/5">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {result.totalQuestions - result.correctAnswers}
            </div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-500/5">
            <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {new Date(result.submittedAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">Submitted</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-foreground">
              Performance Summary
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            You answered {result.correctAnswers} out of {result.totalQuestions}{" "}
            questions correctly, achieving a score of {result.score}% in{" "}
            {result.timeSpent} minutes.
          </p>
        </div>
      </div>

      {/* Questions Review */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Question Review
        </h3>
        <div className="space-y-4">
          {result.questions?.map((question, index) => (
            <div
              key={question.id}
              className={`p-4 rounded-xl border-l-4 ${
                question.isCorrect
                  ? "border-green-500 bg-green-500/5"
                  : "border-red-500 bg-red-500/5"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {question.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium text-foreground">
                    Question {index + 1}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${question.isCorrect ? "text-green-600" : "text-red-600"}`}
                >
                  {question.points} pts
                </span>
              </div>

              <div className="mb-3">
                <p className="text-sm text-foreground font-medium mb-2">
                  {question.question}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Your Answer:
                  </span>
                  <span
                    className={`text-sm ${question.isCorrect ? "text-green-600" : "text-red-600"}`}
                  >
                    {question.userAnswer}
                  </span>
                </div>
                {!question.isCorrect && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Correct Answer:
                    </span>
                    <span className="text-sm text-green-600">
                      {question.correctAnswer}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Question details not available</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default QuizResultDetail;
