import { useState, useEffect, useMemo } from "react";
import StudentLayout from "@/components/StudentLayout";
import { motion } from "framer-motion";
import {
  Clock,
  Calendar,
  BookOpen,
  FileText,
  Brain,
  Code,
  BarChart3,
  Award,
  CheckCircle,
  Timer,
  TrendingUp,
  Loader2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

const StudentHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const auth = useMemo(() => readStoredAuth(), []);
  const studentId = auth?.studentId || auth?.rollNumber || "";

  useEffect(() => {
    if (!studentId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    fetchHistory();
  }, [studentId]);

  const fetchHistory = async () => {
    const token = auth?.token?.trim();
    try {
      const response = await fetch(`${API_BASE}/api/student/history/${studentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    let results = history;
    if (filterType !== "all") {
      results = results.filter((item) => item.type === filterType);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subject?.toLowerCase().includes(query),
      );
    }
    return results;
  }, [history, filterType, searchQuery]);

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return Brain;
      case "test":
        return Code;
      case "assignment":
        return FileText;
      default:
        return Clock;
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Activity History
            </h1>
            <p className="text-muted-foreground font-medium">
              Track your academic progress and submissions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                className="pl-9 rounded-xl glass-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">
              Loading history...
            </p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="grid gap-4">
            {filteredHistory.map((item, index) => {
              const Icon = getIcon(item.type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-2xl p-4 flex items-center justify-between cursor-pointer card-hover border-border/50 group"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        item.type === "quiz"
                          ? "bg-orange-500/10"
                          : item.type === "test"
                            ? "bg-purple-500/10"
                            : "bg-pink-500/10"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          item.type === "quiz"
                            ? "text-orange-500"
                            : item.type === "test"
                              ? "text-purple-500"
                              : "text-pink-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                          {item.type}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        {item.subject && (
                          <span className="font-medium text-primary/70">
                            {item.subject}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="hidden sm:block">
                      <div
                        className={`text-lg font-bold ${
                          item.score &&
                          item.score !== "Pending" &&
                          item.score !== "Submitted"
                            ? parseInt(item.score) >= 75
                              ? "text-green-500"
                              : "text-yellow-500"
                            : "text-primary"
                        }`}
                      >
                        {item.score}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                        Result
                      </div>
                    </div>
                    <BarChart3 className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 glass-card rounded-3xl">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground">
              No history found
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your filters or search query."
                : "Complete your first quiz, test or assignment to see it here!"}
            </p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  {(() => {
                    const Icon = getIcon(selectedItem.type);
                    return <Icon className="w-6 h-6 text-primary" />;
                  })()}
                  {selectedItem.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Score/Status Banner */}
                {selectedItem.score && (
                  <div className="glass-card p-6 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Your Score
                        </div>
                        <div className="text-4xl font-bold text-primary">
                          {selectedItem.score}
                        </div>
                      </div>
                      <Award className="w-16 h-16 text-primary/30" />
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      Type
                    </div>
                    <div className="font-semibold capitalize">
                      {selectedItem.type}
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      Date
                    </div>
                    <div className="font-semibold">{selectedItem.date}</div>
                  </div>
                  {selectedItem.subject && (
                    <div className="glass-card p-4 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">
                        Subject
                      </div>
                      <div className="font-semibold">
                        {selectedItem.subject}
                      </div>
                    </div>
                  )}
                  {selectedItem.timeTaken && (
                    <div className="glass-card p-4 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">
                        Time Taken
                      </div>
                      <div className="font-semibold flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {selectedItem.timeTaken}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quiz Specific Details */}
                {selectedItem.type === "quiz" && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-3">
                      Quiz Performance
                    </div>
                    <div className="space-y-3">
                      {selectedItem.totalQuestions && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Total Questions
                          </span>
                          <span className="font-semibold">
                            {selectedItem.totalQuestions}
                          </span>
                        </div>
                      )}
                      {selectedItem.correctAnswers && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Correct Answers
                          </span>
                          <span className="font-semibold text-green-600">
                            {selectedItem.correctAnswers}
                          </span>
                        </div>
                      )}
                      {selectedItem.totalQuestions &&
                        selectedItem.correctAnswers && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                Accuracy
                              </span>
                              <span className="text-xs font-semibold">
                                {Math.round(
                                  (selectedItem.correctAnswers /
                                    selectedItem.totalQuestions) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${(selectedItem.correctAnswers / selectedItem.totalQuestions) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Test Specific Details */}
                {selectedItem.type === "test" && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-3">
                      Test Results
                    </div>
                    <div className="space-y-3">
                      {selectedItem.totalMarks && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <Award className="w-4 h-4 text-primary" />
                            Total Marks
                          </span>
                          <span className="font-semibold">
                            {selectedItem.totalMarks}
                          </span>
                        </div>
                      )}
                      {selectedItem.obtainedMarks && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Marks Obtained
                          </span>
                          <span className="font-semibold text-green-600">
                            {selectedItem.obtainedMarks}
                          </span>
                        </div>
                      )}
                      {selectedItem.duration && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <Timer className="w-4 h-4 text-primary" />
                            Duration
                          </span>
                          <span className="font-semibold">
                            {selectedItem.duration}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assignment Specific Details */}
                {selectedItem.type === "assignment" && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-3">
                      Assignment Details
                    </div>
                    <div className="space-y-3">
                      {selectedItem.status && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status</span>
                          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                            {selectedItem.status}
                          </span>
                        </div>
                      )}
                      {selectedItem.submittedOn && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Submitted On
                          </span>
                          <span className="font-semibold">
                            {selectedItem.submittedOn}
                          </span>
                        </div>
                      )}
                      {selectedItem.grade && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-2">
                            <Award className="w-4 h-4 text-primary" />
                            Grade
                          </span>
                          <span className="font-semibold text-lg text-primary">
                            {selectedItem.grade}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {selectedItem.feedback && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">
                      Faculty Feedback
                    </div>
                    <p className="text-sm leading-relaxed">
                      {selectedItem.feedback}
                    </p>
                  </div>
                )}

                {/* Remarks */}
                {selectedItem.remarks && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">
                      Remarks
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {selectedItem.remarks}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    Completed on{" "}
                    {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </span>
                  {selectedItem.score && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                      Score: {selectedItem.score}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default StudentHistory;
