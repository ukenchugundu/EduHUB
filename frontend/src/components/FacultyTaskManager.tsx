import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  Clock,
  Users,
  Bell,
  BarChart3,
  BookOpen,
  FileText,
  Target,
  GraduationCap,
  Eye,
  Edit,
  Trash2,
  Send,
  AlertTriangle,
  Timer,
  History,
  TrendingUp,
  CheckCircle2,
  X,
} from "lucide-react";
import CreateTaskModal from "@/components/CreateTaskModal";

const FacultyTaskManager = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<
    "quiz" | "test" | "assignment" | null
  >(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "recent">(
    "upcoming",
  );

  const taskTypes = [
    {
      type: "quiz" as const,
      title: "Create Quiz",
      description: "Multiple choice questions with auto-grading",
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
    },
    {
      type: "test" as const,
      title: "Create Test",
      description: "Comprehensive coding or written examination",
      icon: Target,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600",
    },
    {
      type: "assignment" as const,
      title: "Create Assignment",
      description: "Create tasks for document submissions",
      icon: FileText,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      textColor: "text-green-600",
    },
  ];

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load tasks from localStorage
  const [createdTasks, setCreatedTasks] = useState([]);
  const [showModal, setShowModal] = useState<
    | "total"
    | "students"
    | "scheduled"
    | "pending"
    | "analytics"
    | "taskAnalytics"
    | "taskSummary"
    | "submissions"
    | "performance"
    | "fullSubmission"
    | "classPerformance"
    | "classSelection"
    | "individualPerformance"
    | null
  >(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPerformanceClass, setSelectedPerformanceClass] = useState<
    string | null
  >(null);
  const [navigationSource, setNavigationSource] = useState<string | null>(null);
  const [submissionView, setSubmissionView] = useState<
    "submissions" | "scores" | "both"
  >("both");

  useEffect(() => {
    const loadTasks = () => {
      const storedTasks = JSON.parse(
        localStorage.getItem("faculty_tasks") || "[]",
      );
      setCreatedTasks(storedTasks);
    };
    loadTasks();
  }, []);

  // All tasks combined for filtering
  const allTasks = [
    ...createdTasks,
    {
      id: "1",
      title: "Data Structures Quiz - Trees",
      type: "quiz",
      subject: "Data Structures",
      startDate: "2024-12-30",
      startTime: "14:00",
      endDate: "2024-12-30",
      endTime: "15:30",
      students: 45,
      createdAt: "2024-12-20T10:00:00Z",
    },
    {
      id: "2",
      title: "DBMS Final Test",
      type: "test",
      subject: "DBMS",
      startDate: "2025-01-15",
      startTime: "10:00",
      endDate: "2025-01-15",
      endTime: "12:00",
      students: 52,
      createdAt: "2024-12-15T09:00:00Z",
    },
    {
      id: "3",
      title: "OS Assignment - Process Scheduling",
      type: "assignment",
      subject: "Operating Systems",
      startDate: "2025-01-05",
      startTime: "00:00",
      endDate: "2025-01-10",
      endTime: "23:59",
      students: 38,
      createdAt: "2024-12-18T15:30:00Z",
    },
    {
      id: "4",
      title: "Python Basics Quiz",
      type: "quiz",
      subject: "Programming",
      startDate: "2024-12-15",
      startTime: "10:00",
      endDate: "2024-12-15",
      endTime: "11:00",
      students: 42,
      submissions: 38,
      avgScore: 78,
      createdAt: "2024-12-10T09:00:00Z",
    },
    {
      id: "5",
      title: "Database Design Test",
      type: "test",
      subject: "DBMS",
      startDate: "2024-12-10",
      startTime: "14:00",
      endDate: "2024-12-10",
      endTime: "16:00",
      students: 45,
      submissions: 43,
      avgScore: 72,
      createdAt: "2024-12-05T11:00:00Z",
    },
    {
      id: "6",
      title: "Annual Tech Symposium",
      type: "assignment",
      subject: "Web Technology",
      startDate: "2024-11-20",
      startTime: "00:00",
      endDate: "2024-12-05",
      endTime: "23:59",
      students: 40,
      submissions: 37,
      avgScore: 85,
      createdAt: "2024-11-15T10:00:00Z",
    },
  ];

  const upcomingTasks = allTasks.filter((task: any) => {
    const now = currentTime;
    const startDateTime = new Date(`${task.startDate}T${task.startTime}`);
    return now < startDateTime;
  });

  const pastTasks = allTasks.filter((task: any) => {
    const now = currentTime;
    const endDateTime = new Date(`${task.endDate}T${task.endTime}`);
    return now > endDateTime && task.submissions !== undefined;
  });

  const recentTasks = allTasks
    .filter((task: any) => {
      const now = currentTime;
      const endDateTime = new Date(`${task.endDate}T${task.endTime}`);
      const daysSinceEnd =
        (now.getTime() - endDateTime.getTime()) / (1000 * 60 * 60 * 24);
      return (
        now > endDateTime && daysSinceEnd <= 7 && task.submissions !== undefined
      );
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    );

  const handleCreateTask = (taskType: typeof selectedTaskType) => {
    setSelectedTaskType(taskType);
    setIsCreateModalOpen(true);
  };

  const handleViewSubmissions = (task: any) => {
    // Show submissions in a modal instead of navigation
    setSelectedTask(task);
    setShowModal("submissions");
  };

  const handleDownloadResults = (task: any) => {
    // Generate and download CSV/Excel file with results
    const csvContent = `Student Name,Roll Number,Score,Submission Time\n`;
    const mockData = Array.from({ length: task.submissions || 0 }, (_, i) => {
      const rollNo = `CSE${String(i + 1).padStart(3, "0")}`;
      const name = `Student ${i + 1}`;
      const score = Math.floor(Math.random() * 40) + 60; // 60-100
      const time = new Date(
        Date.now() - Math.random() * 86400000,
      ).toISOString();
      return `${name},${rollNo},${score},${time}`;
    }).join("\n");

    const blob = new Blob([csvContent + mockData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.title.replace(/\s+/g, "_")}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSendNotification = (task: any) => {
    // Send notification to students
    const message = `Reminder: ${task.title} results are now available. Please check your dashboard.`;
    // In a real app, this would call an API to send notifications
    alert(`Notification sent to ${task.students} students: "${message}"`);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return BookOpen;
      case "test":
        return Target;
      case "assignment":
        return FileText;
      default:
        return FileText;
    }
  };

  const getTaskStatus = (task: any) => {
    const now = currentTime;
    const startDateTime = new Date(`${task.startDate}T${task.startTime}`);
    const endDateTime = new Date(`${task.endDate}T${task.endTime}`);

    if (now < startDateTime) {
      return "upcoming";
    } else if (now >= startDateTime && now <= endDateTime) {
      return "active";
    } else {
      return "completed";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-orange-500/10 text-orange-600";
      case "active":
        return "bg-green-500/10 text-green-600";
      case "completed":
        return "bg-blue-500/10 text-blue-600";
      default:
        return "bg-gray-500/10 text-gray-600";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Task Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage student tasks with advanced scheduling
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal("classSelection")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Class Performance
          </button>
          <button
            onClick={() => setShowModal("analytics")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setShowModal("total")}
          className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {upcomingTasks.length + pastTasks.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowModal("students")}
          className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">248</div>
              <div className="text-xs text-muted-foreground">
                Total Students
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowModal("scheduled")}
          className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">5</div>
              <div className="text-xs text-muted-foreground">
                Scheduled Today
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowModal("pending")}
          className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">3</div>
              <div className="text-xs text-muted-foreground">
                Pending Review
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Create Task Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Create New Task
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {taskTypes.map((taskType) => (
            <motion.div
              key={taskType.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300"
              onClick={() => handleCreateTask(taskType.type)}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${taskType.color} flex items-center justify-center`}
                >
                  <taskType.icon className="w-6 h-6 text-white" />
                </div>
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>

              <h3 className="font-semibold text-foreground mb-2">
                {taskType.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {taskType.description}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${taskType.bgColor} ${taskType.textColor}`}
                >
                  {taskType.type}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Task Tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "upcoming"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming Tasks
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "recent"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Recent Tasks
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "past"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Past Tasks
        </button>
      </div>

      {/* Upcoming Tasks */}
      {activeTab === "upcoming" && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Upcoming Tasks
          </h2>
          <div className="space-y-3">
            {upcomingTasks.map((task) => {
              const TaskIcon = getTaskIcon(task.type);
              const status = getTaskStatus(task);
              const timeUntilStart = getTimeUntilStart(task);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TaskIcon className="w-6 h-6 text-primary" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground">
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {task.subject}{" "}
                          {task.type === "event" &&
                            task.eventType &&
                            `• ${task.eventType}`}
                          {task.type === "assignment" &&
                            " • Document Submission"}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {task.startDate} at {task.startTime}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {task.students} students
                          </span>
                          {timeUntilStart && (
                            <span className="text-xs text-orange-600 flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                              <Timer className="w-3 h-3" />
                              Opens in {timeUntilStart}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getStatusColor(status)}`}
                      >
                        {status === "upcoming"
                          ? "Scheduled"
                          : status === "active"
                            ? "Live Now"
                            : "Completed"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            status === "active"
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      {activeTab === "recent" && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Tasks (Last 7 Days)
          </h2>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground mb-2">
                  No recent tasks
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tasks completed in the last 7 days will appear here
                </p>
              </div>
            ) : (
              recentTasks.map((task) => {
                const TaskIcon = getTaskIcon(task.type);
                const submissionRate = Math.round(
                  (task.submissions / task.students) * 100,
                );
                const daysAgo = Math.floor(
                  (currentTime.getTime() - new Date(task.endDate).getTime()) /
                    (1000 * 60 * 60 * 24),
                );

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <TaskIcon className="w-6 h-6 text-blue-600" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground">
                            {task.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {task.subject}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Ended{" "}
                              {daysAgo === 0
                                ? "today"
                                : `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`}
                            </span>
                            <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              {task.submissions}/{task.students} submitted (
                              {submissionRate}%)
                            </span>
                            <span className="text-xs text-green-600 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3" />
                              Avg: {task.avgScore}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-600">
                          Recent
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setNavigationSource("recent");
                              setShowModal("taskAnalytics");
                            }}
                            className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setNavigationSource("recent");
                              setShowModal("taskSummary");
                            }}
                            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Past Tasks */}
      {activeTab === "past" && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Past Tasks
          </h2>
          <div className="space-y-3">
            {pastTasks.map((task) => {
              const TaskIcon = getTaskIcon(task.type);
              const submissionRate = Math.round(
                (task.submissions / task.students) * 100,
              );

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-6 border-l-4 border-l-green-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <TaskIcon className="w-6 h-6 text-green-600" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground">
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {task.subject}{" "}
                          {task.type === "event" &&
                            task.eventType &&
                            `• ${task.eventType}`}
                          {task.type === "assignment" &&
                            " • Document Submission"}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {task.startDate} - {task.endDate}
                          </span>
                          <span className="text-xs text-green-600 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {task.submissions}/{task.students} submitted (
                            {submissionRate}%)
                          </span>
                          <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3" />
                            Avg: {task.avgScore}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-600">
                        Completed
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setNavigationSource("past");
                            setShowModal("taskAnalytics");
                          }}
                          className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setNavigationSource("past");
                            setShowModal("taskSummary");
                          }}
                          className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          // Don't reset selectedTaskType here if we want it to persist for the modal's internal logic
          // It will be reset when the modal re-opens or manually if needed
        }}
        taskType={selectedTaskType}
      />

      {/* Stats Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {showModal === "total" && "All Tasks Conducted"}
                  {showModal === "students" && "Class Students"}
                  {showModal === "scheduled" && "Today's Schedule"}
                  {showModal === "pending" && "Pending Reviews"}
                  {showModal === "analytics" && "Task Analytics"}
                  {showModal === "taskAnalytics" &&
                    `${selectedTask?.title} - Analytics`}
                  {showModal === "taskSummary" &&
                    `${selectedTask?.title} - Summary`}
                  {showModal === "submissions" &&
                    `${selectedTask?.title} - Submissions`}
                  {showModal === "performance" &&
                    `${selectedStudent?.name} - Test Performance`}
                  {showModal === "fullSubmission" &&
                    `${selectedStudent?.name} - Full Submission`}
                  {showModal === "classPerformance" &&
                    "Class Performance Overview"}
                  {showModal === "classSelection" &&
                    "Select Class for Performance Analysis"}
                  {showModal === "individualPerformance" &&
                    `${selectedPerformanceClass} - Individual Performance`}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(null);
                    setSelectedClass(null);
                    setSelectedTask(null);
                    setNavigationSource(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showModal === "total" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                      <h3 className="font-medium text-foreground mb-3">
                        Completed Tasks
                      </h3>
                      <div className="space-y-2">
                        {pastTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-background"
                          >
                            <div>
                              <h4 className="text-sm font-medium text-foreground">
                                {task.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {task.subject} • {task.type}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-green-600">
                                {task.submissions}/{task.students}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Avg: {task.avgScore}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <h3 className="font-medium text-foreground mb-3">
                        Upcoming Tasks
                      </h3>
                      <div className="space-y-2">
                        {upcomingTasks.map((task) => {
                          const status = getTaskStatus(task);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-background"
                            >
                              <div>
                                <h4 className="text-sm font-medium text-foreground">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {task.subject} • {task.type}
                                </p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    status === "active"
                                      ? "bg-green-500/10 text-green-600"
                                      : "bg-orange-500/10 text-orange-600"
                                  }`}
                                >
                                  {status === "active" ? "Live" : "Scheduled"}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.students} students
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-2xl font-bold text-blue-600">
                        {upcomingTasks.length + pastTasks.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Tasks
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-2xl font-bold text-green-600">
                        {pastTasks.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completed
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-2xl font-bold text-orange-600">
                        {upcomingTasks.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Upcoming
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(
                          pastTasks.reduce(
                            (sum, task) => sum + task.avgScore,
                            0,
                          ) / pastTasks.length,
                        ) || 0}
                        %
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg Score
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showModal === "students" && (
                <div className="space-y-4">
                  {!selectedClass ? (
                    // Class Selection View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        {
                          name: "CSE-A",
                          count: 45,
                          subject: "Data Structures & Algorithms",
                        },
                        {
                          name: "CSE-B",
                          count: 42,
                          subject: "Database Management Systems",
                        },
                        {
                          name: "IT-A",
                          count: 38,
                          subject: "Operating Systems",
                        },
                      ].map((section) => (
                        <button
                          key={section.name}
                          onClick={() => setSelectedClass(section.name)}
                          className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors text-left"
                        >
                          <h3 className="font-medium text-foreground">
                            {section.name}
                          </h3>
                          <p className="text-2xl font-bold text-blue-600 mt-2">
                            {section.count}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Students enrolled
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {section.subject}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Individual Students View
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={() => setSelectedClass(null)}
                          className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                        >
                          ← Back to Classes
                        </button>
                        <h3 className="text-lg font-medium text-foreground">
                          {selectedClass} Students
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {Array.from(
                          {
                            length:
                              selectedClass === "CSE-A"
                                ? 45
                                : selectedClass === "CSE-B"
                                  ? 42
                                  : 38,
                          },
                          (_, i) => {
                            const studentId = `S${String(i + 1).padStart(3, "0")}`;
                            const rollNo = `${selectedClass?.split("-")[0]}${selectedClass?.split("-")[1]}${String(i + 1).padStart(2, "0")}`;
                            const names = [
                              "Aarav Sharma",
                              "Vivaan Patel",
                              "Aditya Kumar",
                              "Vihaan Singh",
                              "Arjun Gupta",
                              "Sai Reddy",
                              "Reyansh Jain",
                              "Ayaan Khan",
                              "Krishna Rao",
                              "Ishaan Nair",
                              "Shaurya Agarwal",
                              "Atharv Mehta",
                              "Rudra Verma",
                              "Aadhya Iyer",
                              "Ananya Desai",
                              "Diya Bhatt",
                              "Saanvi Joshi",
                              "Ira Kulkarni",
                              "Myra Sinha",
                              "Larisa Chopra",
                              "Kiara Malhotra",
                              "Aarohi Bansal",
                              "Kavya Saxena",
                              "Riya Tiwari",
                              "Navya Pandey",
                              "Prisha Goyal",
                              "Anvi Arora",
                              "Avni Kapoor",
                              "Shanaya Mittal",
                              "Ishika Garg",
                              "Advika Bhatia",
                              "Anika Singhal",
                              "Rhea Khurana",
                              "Zara Ahmed",
                              "Nisha Varma",
                              "Tanvi Rastogi",
                              "Khushi Ahluwalia",
                              "Palak Jindal",
                              "Simran Kohli",
                              "Muskan Dua",
                              "Shreya Bajaj",
                              "Pooja Sethi",
                              "Neha Aggarwal",
                              "Sakshi Sharma",
                              "Priyanka Gupta",
                            ];
                            const name = names[i % names.length];
                            const attendance =
                              Math.floor(Math.random() * 20) + 80; // 80-100%
                            const cgpa = (Math.random() * 2 + 7).toFixed(2); // 7.0-9.0

                            return (
                              <div
                                className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                                onClick={() => {
                                  setShowModal(null);
                                  setSelectedClass(null);
                                  navigate(`/faculty/performance/${studentId}`);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                    {name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground text-sm truncate">
                                      {name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {rollNo}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs">
                                  <span
                                    className={`px-2 py-1 rounded-full ${
                                      attendance >= 90
                                        ? "bg-green-500/10 text-green-600"
                                        : attendance >= 75
                                          ? "bg-yellow-500/10 text-yellow-600"
                                          : "bg-red-500/10 text-red-600"
                                    }`}
                                  >
                                    {attendance}% Att.
                                  </span>
                                  <span className="text-muted-foreground">
                                    CGPA: {cgpa}
                                  </span>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showModal === "scheduled" && (
                <div className="space-y-4">
                  {[
                    {
                      time: "09:00 AM",
                      task: "Data Structures Quiz",
                      type: "quiz",
                    },
                    {
                      time: "11:00 AM",
                      task: "DBMS Assignment Review",
                      type: "assignment",
                    },
                    {
                      time: "02:00 PM",
                      task: "OS Test Preparation",
                      type: "test",
                    },
                    {
                      time: "04:00 PM",
                      task: "Event Coordination",
                      type: "event",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20"
                    >
                      <div className="w-16 text-sm font-medium text-purple-600">
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {item.task}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-600">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showModal === "pending" && (
                <div className="space-y-4">
                  {[
                    {
                      task: "Python Basics Quiz",
                      submissions: 38,
                      total: 42,
                      type: "quiz",
                      id: "4",
                    },
                    {
                      task: "Database Design Test",
                      submissions: 43,
                      total: 45,
                      type: "test",
                      id: "5",
                    },
                    {
                      task: "Annual Tech Symposium",
                      submissions: 37,
                      total: 40,
                      type: "assignment",
                      id: "6",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.type === "quiz") {
                          navigate(`/faculty/quiz-results/${item.id}`);
                        } else if (item.type === "test") {
                          navigate(`/faculty/test-results/${item.id}`);
                        } else if (item.type === "assignment") {
                          navigate(`/faculty/assignments?pending=${item.id}`);
                        }
                        setShowModal(null);
                      }}
                    >
                      <div>
                        <h3 className="font-medium text-foreground">
                          {item.task}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.submissions}/{item.total} submissions
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-600">
                          {item.type}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === "quiz") {
                              navigate(`/faculty/quiz-results/${item.id}`);
                            } else if (item.type === "test") {
                              navigate(`/faculty/test-results/${item.id}`);
                            } else if (item.type === "assignment") {
                              navigate(
                                `/faculty/assignments?pending=${item.id}`,
                              );
                            }
                            setShowModal(null);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showModal === "submissions" && selectedTask && (
                <div className="space-y-4">
                  {navigationSource === "analytics" && (
                    <button
                      onClick={() => {
                        setShowModal("analytics");
                        setNavigationSource(null);
                      }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm mb-4"
                    >
                      ← Back to Analytics
                    </button>
                  )}
                  {navigationSource === "taskAnalytics" && (
                    <button
                      onClick={() => {
                        setShowModal("taskAnalytics");
                        setNavigationSource(null);
                      }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm mb-4"
                    >
                      ← Back to Task Analytics
                    </button>
                  )}

                  {submissionView === "submissions" && (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedTask.submissions || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Submissions
                        </div>
                      </div>
                    </div>
                  )}

                  {submissionView === "scores" && (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedTask.avgScore || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Average Score
                        </div>
                      </div>
                    </div>
                  )}

                  {submissionView === "both" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedTask.submissions || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Submissions
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedTask.avgScore || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Average Score
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedTask.submissions
                            ? Math.round(
                                (selectedTask.submissions /
                                  selectedTask.students) *
                                  100,
                              )
                            : 0}
                          %
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Submission Rate
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {Array.from(
                        { length: selectedTask.submissions || 0 },
                        (_, i) => {
                          const rollNo = `CSE${String(i + 1).padStart(3, "0")}`;
                          const names = [
                            "Aarav Sharma",
                            "Vivaan Patel",
                            "Aditya Kumar",
                            "Vihaan Singh",
                            "Arjun Gupta",
                            "Sai Reddy",
                            "Reyansh Jain",
                            "Ayaan Khan",
                            "Krishna Rao",
                            "Ishaan Nair",
                          ];
                          const name = names[i % names.length];
                          const score = Math.floor(Math.random() * 40) + 60;
                          const submittedAt = new Date(
                            Date.now() - Math.random() * 86400000,
                          );
                          const status =
                            score >= 75
                              ? "Excellent"
                              : score >= 60
                                ? "Good"
                                : "Needs Improvement";

                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                  {name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {rollNo}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="font-semibold text-foreground">
                                    {score}/100
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      score >= 75
                                        ? "text-green-600"
                                        : score >= 60
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {status}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                    {submittedAt.toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {submittedAt.toLocaleTimeString()}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedStudent({
                                      name,
                                      rollNo,
                                      score,
                                      submittedAt,
                                      status,
                                    });
                                    setShowModal("performance");
                                  }}
                                  className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {(selectedTask.submissions || 0) === 0 && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">
                        No submissions yet
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showModal === "classSelection" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        name: "CSE-A",
                        students: 45,
                        subject: "Data Structures & Algorithms",
                        avgScore: 78.5,
                      },
                      {
                        name: "CSE-B",
                        students: 42,
                        subject: "Database Management Systems",
                        avgScore: 72.3,
                      },
                      {
                        name: "IT-A",
                        students: 38,
                        subject: "Operating Systems",
                        avgScore: 85.2,
                      },
                      {
                        name: "IT-B",
                        students: 40,
                        subject: "Computer Networks",
                        avgScore: 79.8,
                      },
                      {
                        name: "ECE-A",
                        students: 44,
                        subject: "Digital Signal Processing",
                        avgScore: 74.6,
                      },
                      {
                        name: "ECE-B",
                        students: 41,
                        subject: "VLSI Design",
                        avgScore: 81.2,
                      },
                    ].map((cls) => (
                      <button
                        key={cls.name}
                        onClick={() => {
                          setSelectedPerformanceClass(cls.name);
                          setShowModal("classPerformance");
                        }}
                        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-xl text-foreground">
                            {cls.name}
                          </h3>
                          <div
                            className={`text-lg font-bold ${
                              cls.avgScore >= 80
                                ? "text-green-600"
                                : cls.avgScore >= 70
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {cls.avgScore}%
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {cls.subject}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-600">
                            {cls.students} Students
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              cls.avgScore >= 80
                                ? "bg-green-500/10 text-green-600"
                                : cls.avgScore >= 70
                                  ? "bg-yellow-500/10 text-yellow-600"
                                  : "bg-red-500/10 text-red-600"
                            }`}
                          >
                            {cls.avgScore >= 80
                              ? "Excellent"
                              : cls.avgScore >= 70
                                ? "Good"
                                : "Needs Improvement"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showModal === "classPerformance" && selectedPerformanceClass && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedPerformanceClass} Performance
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowModal("classSelection")}
                      className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                    >
                      ← Back to Classes
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        78.5%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Quiz Score
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        72.3%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Test Score
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        85.2%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Assignment
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        89.7%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Attendance
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-foreground">
                      Individual Student Performance
                    </h3>
                    <button
                      onClick={() => setShowModal("individualPerformance")}
                      className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-sm"
                    >
                      View All Students
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }, (_, i) => {
                      const names = [
                        "Aarav Sharma",
                        "Vivaan Patel",
                        "Aditya Kumar",
                        "Vihaan Singh",
                        "Arjun Gupta",
                        "Sai Reddy",
                      ];
                      const rollNo = `${selectedPerformanceClass}${String(i + 1).padStart(2, "0")}`;
                      const overallScore = Math.floor(Math.random() * 30) + 70;
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                {names[i]
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground">
                                  {names[i]}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {rollNo}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`font-semibold ${
                                  overallScore >= 80
                                    ? "text-green-600"
                                    : overallScore >= 70
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }`}
                              >
                                {overallScore}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Overall
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {showModal === "individualPerformance" &&
                selectedPerformanceClass && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedPerformanceClass} - All Students
                      </h2>
                      <button
                        onClick={() => setShowModal("classPerformance")}
                        className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                      >
                        ← Back to Class Overview
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {Array.from({ length: 45 }, (_, i) => {
                        const names = [
                          "Aarav Sharma",
                          "Vivaan Patel",
                          "Aditya Kumar",
                          "Vihaan Singh",
                          "Arjun Gupta",
                          "Sai Reddy",
                          "Reyansh Jain",
                          "Ayaan Khan",
                          "Krishna Rao",
                          "Ishaan Nair",
                        ];
                        const rollNo = `${selectedPerformanceClass}${String(i + 1).padStart(2, "0")}`;
                        const name =
                          names[i % names.length] +
                          (i >= 10 ? ` ${Math.floor(i / 10)}` : "");
                        const quizScore = Math.floor(Math.random() * 30) + 70;
                        const testScore = Math.floor(Math.random() * 30) + 65;
                        const assignmentScore =
                          Math.floor(Math.random() * 20) + 80;
                        const attendance = Math.floor(Math.random() * 20) + 80;
                        const overall = Math.round(
                          (quizScore +
                            testScore +
                            assignmentScore +
                            attendance) /
                            4,
                        );

                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                {name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground">
                                  {name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {rollNo}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-blue-600">
                                  {quizScore}%
                                </div>
                                <div className="text-muted-foreground">
                                  Quiz
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-green-600">
                                  {testScore}%
                                </div>
                                <div className="text-muted-foreground">
                                  Test
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-purple-600">
                                  {assignmentScore}%
                                </div>
                                <div className="text-muted-foreground">
                                  Assignment
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-orange-600">
                                  {attendance}%
                                </div>
                                <div className="text-muted-foreground">
                                  Attendance
                                </div>
                              </div>
                              <div className="text-center">
                                <div
                                  className={`font-bold ${
                                    overall >= 80
                                      ? "text-green-600"
                                      : overall >= 70
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {overall}%
                                </div>
                                <div className="text-muted-foreground">
                                  Overall
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {showModal === "fullSubmission" && selectedStudent && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {selectedStudent.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {selectedStudent.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedStudent.rollNo} • Score:{" "}
                          {selectedStudent.score}/100
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal("performance")}
                      className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                    >
                      ← Back to Performance
                    </button>
                  </div>

                  <div className="max-h-[600px] overflow-y-auto space-y-6">
                    {[
                      {
                        question:
                          "What is the time complexity of binary search algorithm?",
                        type: "MCQ",
                        options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
                        correctAnswer: "O(log n)",
                        studentAnswer: "O(log n)",
                        isCorrect: true,
                      },
                      {
                        question:
                          "Which data structure uses LIFO (Last In First Out) principle?",
                        type: "MCQ",
                        options: ["Queue", "Stack", "Array", "Linked List"],
                        correctAnswer: "Stack",
                        studentAnswer: "Stack",
                        isCorrect: true,
                      },
                      {
                        question:
                          "Write a function to reverse a string in Python.",
                        type: "Code",
                        studentAnswer:
                          "def reverse_string(s):\n    return s[::-1]\n\n# Alternative approach\ndef reverse_string_loop(s):\n    result = ''\n    for char in s:\n        result = char + result\n    return result",
                        correctAnswer:
                          "def reverse_string(s):\n    return s[::-1]",
                        isCorrect: true,
                      },
                      {
                        question:
                          "Explain the difference between BFS and DFS algorithms.",
                        type: "Text",
                        studentAnswer:
                          "BFS (Breadth-First Search) explores nodes level by level using a queue, while DFS (Depth-First Search) explores as far as possible along each branch using a stack or recursion. BFS finds shortest path in unweighted graphs, DFS uses less memory.",
                        correctAnswer:
                          "BFS explores level by level, DFS explores depth-wise. BFS uses queue, DFS uses stack.",
                        isCorrect: true,
                      },
                      {
                        question: "What is the space complexity of merge sort?",
                        type: "MCQ",
                        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                        correctAnswer: "O(n)",
                        studentAnswer: "O(log n)",
                        isCorrect: false,
                      },
                    ].map((q, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border ${
                          q.isCorrect
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium text-foreground">
                            Question {index + 1}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                q.isCorrect
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {q.isCorrect ? "Correct" : "Incorrect"}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                              {q.type}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-foreground mb-3 font-medium">
                          {q.question}
                        </p>

                        {q.type === "MCQ" && (
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground mb-2">
                              Options:
                            </div>
                            {q.options?.map((option, i) => (
                              <div
                                key={i}
                                className={`p-2 rounded-lg text-sm ${
                                  option === q.correctAnswer
                                    ? "bg-green-500/10 border border-green-500/20"
                                    : option === q.studentAnswer && !q.isCorrect
                                      ? "bg-red-500/10 border border-red-500/20"
                                      : "bg-secondary/30"
                                }`}
                              >
                                <span className="font-medium">
                                  {String.fromCharCode(65 + i)}.
                                </span>{" "}
                                {option}
                                {option === q.correctAnswer && (
                                  <span className="text-green-600 ml-2">
                                    (Correct)
                                  </span>
                                )}
                                {option === q.studentAnswer && (
                                  <span className="text-blue-600 ml-2">
                                    (Selected)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === "Code" && (
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Student's Answer:
                              </div>
                              <pre className="bg-secondary/30 p-3 rounded-lg text-sm overflow-x-auto">
                                <code>{q.studentAnswer}</code>
                              </pre>
                            </div>
                          </div>
                        )}

                        {q.type === "Text" && (
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Student's Answer:
                              </div>
                              <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                                {q.studentAnswer}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showModal === "performance" && selectedStudent && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                        {selectedStudent.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          {selectedStudent.name}
                        </h3>
                        <p className="text-muted-foreground">
                          {selectedStudent.rollNo} • {selectedTask?.subject}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted:{" "}
                          {selectedStudent.submittedAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal("submissions")}
                      className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                    >
                      ← Back to Submissions
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {selectedStudent.score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Score / 100
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                      <div
                        className={`text-3xl font-bold ${
                          selectedStudent.score >= 75
                            ? "text-green-600"
                            : selectedStudent.score >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {selectedStudent.status}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Performance
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {Math.floor(Math.random() * 45) + 15}m
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Time Taken
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/30">
                      <h3 className="font-medium text-foreground mb-4">
                        Question-wise Performance
                      </h3>
                      <div className="space-y-3">
                        {Array.from({ length: 5 }, (_, i) => {
                          const correct = Math.random() > 0.3;
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-lg bg-background"
                            >
                              <span className="text-sm text-foreground">
                                Question {i + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    correct
                                      ? "bg-green-500/10 text-green-600"
                                      : "bg-red-500/10 text-red-600"
                                  }`}
                                >
                                  {correct ? "Correct" : "Incorrect"}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {Math.floor(Math.random() * 5) + 1}m
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/30">
                      <h3 className="font-medium text-foreground mb-4">
                        Performance Insights
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Accuracy:
                          </span>
                          <span className="text-foreground font-medium">
                            {Math.floor(selectedStudent.score)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Rank in Class:
                          </span>
                          <span className="text-foreground font-medium">
                            {Math.floor(Math.random() * 20) + 1}/45
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Attempts:
                          </span>
                          <span className="text-foreground font-medium">1</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Plagiarism Check:
                          </span>
                          <span className="text-green-600 font-medium">
                            Clean
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Browser Violations:
                          </span>
                          <span className="text-green-600 font-medium">
                            None
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowModal("fullSubmission")}
                      className="flex-1 p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-sm"
                    >
                      View Full Submission
                    </button>
                    <button className="flex-1 p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-sm">
                      Send Feedback
                    </button>
                  </div>
                </div>
              )}

              {showModal === "taskAnalytics" && selectedTask && (
                <div className="space-y-6">
                  <button
                    onClick={() => setShowModal("analytics")}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm mb-4"
                  >
                    ← Back to Analytics
                  </button>
                  {navigationSource && (
                    <button
                      onClick={() => {
                        if (navigationSource === "recent") {
                          setShowModal(null);
                          setActiveTab("recent");
                        } else if (navigationSource === "past") {
                          setShowModal(null);
                          setActiveTab("past");
                        }
                        setNavigationSource(null);
                      }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm mb-4"
                    >
                      ← Back to Tasks
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setNavigationSource("taskAnalytics");
                        setSubmissionView("submissions");
                        setShowModal("submissions");
                      }}
                      className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors"
                    >
                      <h3 className="font-medium text-foreground">
                        Submission Rate
                      </h3>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {selectedTask.submissions
                          ? Math.round(
                              (selectedTask.submissions /
                                selectedTask.students) *
                                100,
                            )
                          : 0}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTask.submissions || 0}/{selectedTask.students}{" "}
                        submitted
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setNavigationSource("taskAnalytics");
                        setSubmissionView("scores");
                        setShowModal("submissions");
                      }}
                      className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors"
                    >
                      <h3 className="font-medium text-foreground">
                        Average Score
                      </h3>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {selectedTask.avgScore || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Out of 100
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setNavigationSource("taskAnalytics");
                        setSubmissionView("both");
                        setShowModal("submissions");
                      }}
                      className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-colors"
                    >
                      <h3 className="font-medium text-foreground">Task Type</h3>
                      <p className="text-2xl font-bold text-purple-600 mt-2 capitalize">
                        {selectedTask.type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTask.subject}
                      </p>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/30">
                      <h3 className="font-medium text-foreground mb-4">
                        Performance Distribution
                      </h3>
                      <div className="space-y-3">
                        {[
                          "Excellent (90-100%)",
                          "Good (75-89%)",
                          "Average (60-74%)",
                          "Below Average (<60%)",
                        ].map((grade, index) => {
                          const percentages = [25, 35, 30, 10];
                          return (
                            <div
                              key={grade}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-foreground">
                                {grade}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-secondary rounded-full">
                                  <div
                                    className="h-2 bg-primary rounded-full"
                                    style={{ width: `${percentages[index]}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {percentages[index]}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/30">
                      <h3 className="font-medium text-foreground mb-4">
                        Task Timeline
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Created:
                          </span>
                          <span className="text-foreground">
                            {new Date(
                              selectedTask.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Start Date:
                          </span>
                          <span className="text-foreground">
                            {selectedTask.startDate}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            End Date:
                          </span>
                          <span className="text-foreground">
                            {selectedTask.endDate}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Duration:
                          </span>
                          <span className="text-foreground">
                            {Math.ceil(
                              (new Date(selectedTask.endDate).getTime() -
                                new Date(selectedTask.startDate).getTime()) /
                                (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showModal === "taskSummary" && selectedTask && (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        {(() => {
                          const TaskIcon = getTaskIcon(selectedTask.type);
                          return <TaskIcon className="w-8 h-8 text-primary" />;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          {selectedTask.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {selectedTask.subject} • {selectedTask.type}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedTask.students}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Students
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedTask.submissions || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submissions
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedTask.avgScore || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg Score
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {selectedTask.submissions
                            ? Math.round(
                                (selectedTask.submissions /
                                  selectedTask.students) *
                                  100,
                              )
                            : 0}
                          %
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completion
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/30">
                      <h3 className="font-medium text-foreground mb-3">
                        Task Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="text-foreground capitalize">
                            {selectedTask.type}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Subject:
                          </span>
                          <span className="text-foreground">
                            {selectedTask.subject}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start:</span>
                          <span className="text-foreground">
                            {selectedTask.startDate} {selectedTask.startTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">End:</span>
                          <span className="text-foreground">
                            {selectedTask.endDate} {selectedTask.endTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span
                            className={`text-foreground capitalize ${getStatusColor(getTaskStatus(selectedTask))}`}
                          >
                            {getTaskStatus(selectedTask)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-secondary/30">
                      <h3 className="font-medium text-foreground mb-3">
                        Quick Actions
                      </h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            handleViewSubmissions(selectedTask);
                          }}
                          className="w-full p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-sm"
                        >
                          View Submissions
                        </button>
                        <button
                          onClick={() => handleDownloadResults(selectedTask)}
                          className="w-full p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-sm"
                        >
                          Download Results
                        </button>
                        <button
                          onClick={() => handleSendNotification(selectedTask)}
                          className="w-full p-2 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors text-sm"
                        >
                          Send Notifications
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showModal === "analytics" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Tasks by Date
                    </h3>

                    {/* Group tasks by date */}
                    {(() => {
                      const tasksByDate = {};
                      [...pastTasks, ...upcomingTasks].forEach((task) => {
                        const date = task.startDate;
                        if (!tasksByDate[date]) {
                          tasksByDate[date] = [];
                        }
                        tasksByDate[date].push(task);
                      });

                      return Object.entries(tasksByDate)
                        .sort(
                          ([a], [b]) =>
                            new Date(b).getTime() - new Date(a).getTime(),
                        )
                        .map(([date, tasks]) => (
                          <div
                            key={date}
                            className="p-4 rounded-xl bg-secondary/20 border border-border"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(date).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                {tasks.length} task
                                {tasks.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {tasks.map((task) => {
                                const TaskIcon = getTaskIcon(task.type);
                                const status = getTaskStatus(task);
                                const isCompleted =
                                  status === "completed" &&
                                  task.submissions !== undefined;

                                return (
                                  <div
                                    key={task.id}
                                    className="p-3 rounded-lg bg-background border border-border hover:shadow-sm transition-all"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            task.type === "quiz"
                                              ? "bg-blue-500/10"
                                              : task.type === "test"
                                                ? "bg-purple-500/10"
                                                : task.type === "assignment"
                                                  ? "bg-green-500/10"
                                                  : "bg-orange-500/10"
                                          }`}
                                        >
                                          <TaskIcon
                                            className={`w-5 h-5 ${
                                              task.type === "quiz"
                                                ? "text-blue-600"
                                                : task.type === "test"
                                                  ? "text-purple-600"
                                                  : task.type === "assignment"
                                                    ? "text-green-600"
                                                    : "text-orange-600"
                                            }`}
                                          />
                                        </div>
                                        <div>
                                          <h5 className="font-medium text-foreground">
                                            {task.title}
                                          </h5>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>{task.subject}</span>
                                            <span>•</span>
                                            <span>
                                              {task.startTime} - {task.endTime}
                                            </span>
                                            <span>•</span>
                                            <span>
                                              {task.students} students
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        {isCompleted ? (
                                          <div className="text-right">
                                            <div className="flex items-center gap-2 text-sm">
                                              <span className="text-green-600 font-medium">
                                                {task.submissions}/
                                                {task.students}
                                              </span>
                                              <span className="text-muted-foreground">
                                                submitted
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                              <span className="text-blue-600 font-medium">
                                                {task.avgScore}%
                                              </span>
                                              <span className="text-muted-foreground">
                                                avg score
                                              </span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-right">
                                            <span
                                              className={`text-xs px-2 py-1 rounded-full ${
                                                status === "upcoming"
                                                  ? "bg-orange-500/10 text-orange-600"
                                                  : status === "active"
                                                    ? "bg-green-500/10 text-green-600"
                                                    : "bg-blue-500/10 text-blue-600"
                                              }`}
                                            >
                                              {status === "upcoming"
                                                ? "Scheduled"
                                                : status === "active"
                                                  ? "Live Now"
                                                  : "Completed"}
                                            </span>
                                          </div>
                                        )}

                                        {isCompleted && (
                                          <button
                                            onClick={() => {
                                              setSelectedTask(task);
                                              setShowModal("taskAnalytics");
                                            }}
                                            className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors"
                                            title="View detailed analytics"
                                          >
                                            <BarChart3 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {isCompleted && (
                                      <div className="mt-3 pt-3 border-t border-border">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                          <div className="p-2">
                                            <div className="text-lg font-bold text-green-600">
                                              {Math.round(
                                                (task.submissions /
                                                  task.students) *
                                                  100,
                                              )}
                                              %
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Completion
                                            </div>
                                          </div>
                                          <div className="p-2">
                                            <div
                                              className={`text-lg font-bold ${
                                                task.avgScore >= 80
                                                  ? "text-green-600"
                                                  : task.avgScore >= 70
                                                    ? "text-yellow-600"
                                                    : "text-red-600"
                                              }`}
                                            >
                                              {task.avgScore}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Performance
                                            </div>
                                          </div>
                                          <div className="p-2">
                                            <div className="text-lg font-bold text-purple-600">
                                              {Math.floor(Math.random() * 30) +
                                                15}
                                              m
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Avg Time
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FacultyTaskManager;
