import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  Timer,
  Play,
  Lock,
  BookOpen,
  FileText,
  Target,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Eye,
} from "lucide-react";

const StudentTaskList = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const tasks = [
    {
      id: "1",
      title: "Data Structures Quiz - Trees",
      type: "quiz",
      subject: "Data Structures",
      startDate: "2024-12-30",
      startTime: "14:00",
      endDate: "2024-12-30",
      endTime: "15:30",
      duration: 90,
      totalMarks: 50,
      attempts: 0,
      maxAttempts: 1,
      instructions: [
        "Read all questions carefully",
        "No external resources allowed",
      ],
    },
    {
      id: "2",
      title: "DBMS Final Test",
      type: "test",
      subject: "DBMS",
      startDate: "2024-12-25",
      startTime: "10:00",
      endDate: "2024-12-25",
      endTime: "12:00",
      duration: 120,
      totalMarks: 100,
      attempts: 0,
      maxAttempts: 1,
      instructions: [
        "Coding questions require proper syntax",
        "Save your work frequently",
      ],
    },
    {
      id: "3",
      title: "OS Assignment - Process Scheduling",
      type: "assignment",
      subject: "Operating Systems",
      startDate: "2024-12-28",
      startTime: "00:00",
      endDate: "2025-01-05",
      endTime: "23:59",
      duration: null,
      totalMarks: 75,
      attempts: 1,
      maxAttempts: 3,
      instructions: ["Submit as PDF format", "Include proper documentation"],
    },
  ];

  const getTaskStatus = (task: any) => {
    const now = currentTime;
    const startDateTime = new Date(`${task.startDate}T${task.startTime}`);
    const endDateTime = new Date(`${task.endDate}T${task.endTime}`);

    if (now < startDateTime) {
      return "upcoming";
    } else if (now >= startDateTime && now <= endDateTime) {
      return "available";
    } else {
      return "expired";
    }
  };

  const getTimeUntilStart = (task: any) => {
    const now = currentTime;
    const startDateTime = new Date(`${task.startDate}T${task.startTime}`);
    const diffMs = startDateTime.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTimeRemaining = (task: any) => {
    const now = currentTime;
    const endDateTime = new Date(`${task.endDate}T${task.endTime}`);
    const diffMs = endDateTime.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getTaskIcon = (type: string) => {
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
        return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "available":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "expired":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const handleStartTask = (taskId: string) => {
    // Navigate to task interface
    console.log(`Starting task ${taskId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">
            My Tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete your assigned tasks and track progress
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => {
          const TaskIcon = getTaskIcon(task.type);
          const status = getTaskStatus(task);
          const timeUntilStart = getTimeUntilStart(task);
          const timeRemaining = getTimeRemaining(task);
          const isAvailable = status === "available";
          const isUpcoming = status === "upcoming";
          const isExpired = status === "expired";

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card rounded-2xl p-6 border-2 ${getStatusColor(status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isAvailable
                        ? "bg-green-500/20"
                        : isUpcoming
                          ? "bg-orange-500/20"
                          : "bg-gray-500/20"
                    }`}
                  >
                    <TaskIcon
                      className={`w-6 h-6 ${
                        isAvailable
                          ? "text-green-600"
                          : isUpcoming
                            ? "text-orange-600"
                            : "text-gray-600"
                      }`}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {task.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}
                      >
                        {isUpcoming
                          ? "Upcoming"
                          : isAvailable
                            ? "Available"
                            : "Expired"}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {task.subject}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {task.startDate}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.duration ? `${task.duration} min` : "No limit"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {task.totalMarks} marks
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {task.attempts}/{task.maxAttempts} attempts
                      </div>
                    </div>

                    {/* Time indicators */}
                    <div className="mt-3 flex items-center gap-4">
                      {timeUntilStart && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-500/10 px-2 py-1 rounded-full">
                          <Timer className="w-3 h-3" />
                          Opens in {timeUntilStart}
                        </div>
                      )}
                      {timeRemaining && isAvailable && (
                        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          {timeRemaining}
                        </div>
                      )}
                    </div>

                    {/* Instructions preview */}
                    {task.instructions.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                        <p className="text-xs text-blue-600 font-medium mb-1">
                          Instructions:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {task.instructions
                            .slice(0, 2)
                            .map((instruction, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-1"
                              >
                                <span className="text-blue-500 mt-0.5">•</span>
                                {instruction}
                              </li>
                            ))}
                          {task.instructions.length > 2 && (
                            <li className="text-blue-600">
                              +{task.instructions.length - 2} more...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {isUpcoming && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/10 text-gray-500 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      Locked
                    </button>
                  )}

                  {isAvailable && task.attempts < task.maxAttempts && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      {task.attempts > 0 ? "Retake" : "Start"}
                    </button>
                  )}

                  {isAvailable && task.attempts >= task.maxAttempts && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-600 cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Completed
                    </button>
                  )}

                  {isExpired && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 cursor-not-allowed"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Expired
                    </button>
                  )}

                  <button className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm">
                    <Eye className="w-3 h-3" />
                    Details
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentTaskList;
