import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Clock,
  Calendar,
  Trophy,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AssignmentResult {
  assignmentId: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  status: string;
  submittedAt: string;
  dueDate: string;
  fileUrl?: string | null;
  feedback?: string;
  grade?: string;
  submissionDetails?: {
    fileName: string;
    fileSize: string;
    submissionType: string;
    lateSubmission: boolean;
    daysLate?: number;
  };
  rubric?: Array<{
    criteria: string;
    maxPoints: number;
    earnedPoints: number;
    feedback?: string;
  }>;
}

interface AssignmentResultDetailProps {
  result: AssignmentResult;
  onBack: () => void;
}

const AssignmentResultDetail = ({
  result,
  onBack,
}: AssignmentResultDetailProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-yellow-600";
    return "text-red-600";
  };

  const isLateSubmission = result.submissionDetails?.lateSubmission;

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
            Assignment Summary
          </h1>
          <p className="text-sm text-muted-foreground">
            {result.assignmentTitle}
          </p>
        </div>
      </div>

      {/* Assignment Overview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {result.assignmentTitle}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-pink-500/10 text-pink-500">
                  Assignment
                </span>
                {result.grade && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium bg-gray-500/10 ${getGradeColor(result.grade)}`}
                  >
                    Grade: {result.grade}
                  </span>
                )}
                {isLateSubmission && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-500/10 text-red-500">
                    Late Submission
                  </span>
                )}
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
            <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {new Date(result.submittedAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">Submitted</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-500/5">
            <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {new Date(result.dueDate).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">Due Date</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-500/5">
            <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-foreground">
              {Math.round((result.score / result.maxScore) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>

        {isLateSubmission && (
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-600">Late Submission</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This assignment was submitted {result.submissionDetails?.daysLate}{" "}
              day(s) after the due date.
            </p>
          </div>
        )}

        {result.feedback && (
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <h3 className="font-medium text-foreground mb-2">
              Instructor Feedback
            </h3>
            <p className="text-sm text-muted-foreground">{result.feedback}</p>
          </div>
        )}
      </div>

      {/* Submission Details */}
      {result.submissionDetails && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Submission Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-pink-500" />
                <div>
                  <div className="font-medium text-foreground">
                    {result.submissionDetails.fileName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.submissionDetails.fileSize} •{" "}
                    {result.submissionDetails.submissionType}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.fileUrl && (
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                    title="View Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {result.fileUrl && (
                  <a
                    href={result.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {result.submissionDetails.fileName}
                  </span>
                  <Button variant="ghost" size="sm" asChild className="mr-6">
                    <a
                      href={result.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in New Tab
                    </a>
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 bg-secondary/20 relative">
                {result.fileUrl ? (
                  result.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={result.fileUrl}
                        alt="Submission Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : result.fileUrl.match(/\.(pdf)$/i) ? (
                    <iframe
                      src={`${result.fileUrl}#toolbar=0`}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground mb-1">
                          No Preview Available
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          This file type cannot be previewed directly.
                        </p>
                        <Button asChild>
                          <a
                            href={result.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download to View
                          </a>
                        </Button>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Grading Rubric */}
      {result.rubric && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Grading Rubric
          </h3>
          <div className="space-y-4">
            {result.rubric.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">
                    {item.criteria}
                  </h4>
                  <div
                    className={`font-semibold ${getScoreColor(item.earnedPoints, item.maxPoints)}`}
                  >
                    {item.earnedPoints}/{item.maxPoints}
                  </div>
                </div>
                {item.feedback && (
                  <p className="text-sm text-muted-foreground">
                    {item.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AssignmentResultDetail;
