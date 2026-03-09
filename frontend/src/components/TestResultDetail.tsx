import { motion } from "framer-motion";
import {
  ArrowLeft,
  Code,
  Clock,
  Calendar,
  Trophy,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface TestResult {
  testId: string;
  testTitle: string;
  score: number;
  maxScore: number;
  status: string;
  submittedAt: string;
  timeSpent: number;
  difficulty: string;
  feedback?: string;
  problems?: Array<{
    id: string;
    title: string;
    difficulty: string;
    status: "solved" | "attempted" | "not_attempted";
    score: number;
    maxScore: number;
  }>;
}

interface TestResultDetailProps {
  result: TestResult;
  onBack: () => void;
}

const TestResultDetail = ({ result, onBack }: TestResultDetailProps) => {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500/10 text-green-500";
      case "Medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "Hard":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "solved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "attempted":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
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
            Test Summary
          </h1>
          <p className="text-sm text-muted-foreground">{result.testTitle}</p>
        </div>
      </div>

      {/* Test Overview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {result.testTitle}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${getDifficultyColor(result.difficulty)}`}
                >
                  {result.difficulty}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/10 text-purple-500">
                  Coding Test
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-bold ${getScoreColor(result.score, result.maxScore)}`}
            >
              {result.score}/{result.maxScore}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round((result.score / result.maxScore) * 100)}% Score
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-xl bg-blue-500/5">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {result.timeSpent}m
            </div>
            <div className="text-xs text-muted-foreground">Time Spent</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-500/5">
            <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {Math.round((result.score / result.maxScore) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-500/5">
            <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {new Date(result.submittedAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">Submitted</div>
          </div>
        </div>

        {result.feedback && (
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <h3 className="font-medium text-foreground mb-2">Feedback</h3>
            <p className="text-sm text-muted-foreground">{result.feedback}</p>
          </div>
        )}
      </div>

      {/* Problems Breakdown */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Problems Attempted
        </h3>
        <div className="space-y-3">
          {result.problems?.map((problem, index) => (
            <div
              key={problem.id}
              className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(problem.status)}
                <div>
                  <div className="font-medium text-foreground">
                    {problem.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(problem.difficulty)}`}
                    >
                      {problem.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-semibold ${getScoreColor(problem.score, problem.maxScore)}`}
                >
                  {problem.score}/{problem.maxScore}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((problem.score / problem.maxScore) * 100)}%
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-muted-foreground">
              <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Problem details not available</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TestResultDetail;
