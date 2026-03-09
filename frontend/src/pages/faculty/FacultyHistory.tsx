import { useState, useEffect } from "react";
import FacultyLayout from "@/components/FacultyLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  BookOpen,
  FileText,
  Target,
  Filter,
  X,
  Users,
  Timer,
  Award,
  CheckCircle,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FacultyHistory = () => {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const storedTasks = JSON.parse(
      localStorage.getItem("faculty_tasks") || "[]",
    );
    setHistory(
      storedTasks.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  }, []);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subject &&
        item.subject.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const getIcon = (type) => {
    switch (type) {
      case "quiz":
        return BookOpen;
      case "test":
        return Target;
      case "assignment":
        return FileText;
      case "event":
        return Calendar;
      default:
        return Clock;
    }
  };

  return (
    <FacultyLayout title="Creation History">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            View all your previous creations and activities
          </p>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary/50 border-transparent focus:bg-background focus:border-primary/20 focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-2xl">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No history records found.</p>
            </div>
          ) : (
            filteredHistory.map((item, index) => {
              const Icon = getIcon(item.type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-xl p-4 flex items-center justify-between group hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1 capitalize">
                          {item.type}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{item.subject || item.eventType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-medium">
                      Created
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
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
                      Created Date
                    </div>
                    <div className="font-semibold">
                      {new Date(selectedItem.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </div>
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
                  {selectedItem.duration && (
                    <div className="glass-card p-4 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">
                        Duration
                      </div>
                      <div className="font-semibold flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {selectedItem.duration}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedItem.description && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">
                      Description
                    </div>
                    <p className="text-sm leading-relaxed">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                {/* Quiz/Test Specific Details */}
                {(selectedItem.type === "quiz" ||
                  selectedItem.type === "test") && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-3">
                      Assessment Details
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedItem.questions && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            <span className="font-semibold">
                              {selectedItem.questions}
                            </span>{" "}
                            Questions
                          </span>
                        </div>
                      )}
                      {selectedItem.totalMarks && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            <span className="font-semibold">
                              {selectedItem.totalMarks}
                            </span>{" "}
                            Total Marks
                          </span>
                        </div>
                      )}
                      {selectedItem.difficulty && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Difficulty:{" "}
                            <span className="font-semibold capitalize">
                              {selectedItem.difficulty}
                            </span>
                          </span>
                        </div>
                      )}
                      {selectedItem.passingMarks && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Passing:{" "}
                            <span className="font-semibold">
                              {selectedItem.passingMarks}
                            </span>
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
                    <div className="space-y-2">
                      {selectedItem.dueDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Due Date:{" "}
                            <span className="font-semibold">
                              {selectedItem.dueDate}
                            </span>
                          </span>
                        </div>
                      )}
                      {selectedItem.maxMarks && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Max Marks:{" "}
                            <span className="font-semibold">
                              {selectedItem.maxMarks}
                            </span>
                          </span>
                        </div>
                      )}
                      {selectedItem.submissionType && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Submission Type:{" "}
                            <span className="font-semibold capitalize">
                              {selectedItem.submissionType}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Specific Details */}
                {selectedItem.type === "event" && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-3">
                      Event Details
                    </div>
                    <div className="space-y-2">
                      {selectedItem.eventType && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Event Type:{" "}
                            <span className="font-semibold capitalize">
                              {selectedItem.eventType}
                            </span>
                          </span>
                        </div>
                      )}
                      {selectedItem.location && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Location:{" "}
                            <span className="font-semibold">
                              {selectedItem.location}
                            </span>
                          </span>
                        </div>
                      )}
                      {selectedItem.attendees && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Expected Attendees:{" "}
                            <span className="font-semibold">
                              {selectedItem.attendees}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedItem.notes && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">
                      Additional Notes
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {selectedItem.notes}
                    </p>
                  </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    Created at{" "}
                    {new Date(selectedItem.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                    ✓ Created Successfully
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </FacultyLayout>
  );
};

export default FacultyHistory;
