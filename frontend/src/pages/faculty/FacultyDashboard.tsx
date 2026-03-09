import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import FacultyLayout from "@/components/FacultyLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  Zap,
  X,
  ChevronRight,
  Clock3,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Types
interface ActiveClass {
  id: number;
  batch_id: number;
  subject: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  batch_name: string;
  department_name: string;
  department_code: string;
}

interface FacultyClass {
  batch_id: number;
  subject: string;
  batch_name: string;
  department_name: string;
  department_code: string;
  semester: number;
  academic_year: string;
  session_count: number;
  last_session_date: string;
}

interface PendingGrade {
  id: number;
  type: "quiz" | "assignment" | "test";
  reference_id: number;
  title: string;
  class_name: string;
  student_id: string;
  submitted_at: string | null;
}

interface NextClass {
  id: number | null;
  batch_id: number | null;
  subject: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  batch_name: string;
  department_name: string;
  department_code: string;
  nextClassType: "today" | "upcoming" | "none";
}

interface ClassStudent {
  student_id: string;
  full_name: string;
  email: string;
  roll_number: string | null;
  attendance_count: number;
  present_count: number;
  attendance_percentage: number;
}

// Helper to get auth token
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    }
    return null;
  } catch {
    return null;
  }
};

// API functions
const fetchActiveClasses = async (): Promise<ActiveClass[]> => {
  const token = getAuthToken();
  try {
    const response = await fetch(
      `${API_BASE}/api/attendance/faculty/active-classes`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) throw new Error("Failed to fetch");
    return await response.json();
  } catch {
    // Return mock data for demo
    return [
      {
        id: 1,
        batch_id: 1,
        subject: "Data Structures & Algorithms",
        session_date: new Date().toISOString().split("T")[0],
        start_time: "09:00",
        end_time: "09:50",
        is_active: true,
        batch_name: "III CSE-A",
        department_name: "Computer Science and Engineering",
        department_code: "CSE",
      },
      {
        id: 2,
        batch_id: 2,
        subject: "Database Management Systems",
        session_date: new Date().toISOString().split("T")[0],
        start_time: "10:00",
        end_time: "10:50",
        is_active: true,
        batch_name: "III CSE-B",
        department_name: "Computer Science and Engineering",
        department_code: "CSE",
      },
      {
        id: 3,
        batch_id: 3,
        subject: "DS Lab",
        session_date: new Date().toISOString().split("T")[0],
        start_time: "11:00",
        end_time: "12:50",
        is_active: false,
        batch_name: "III CSD-A",
        department_name: "Computer Science and Design",
        department_code: "CSD",
      },
    ];
  }
};

const fetchFacultyClasses = async (): Promise<{
  classes: FacultyClass[];
  totalStudents: number;
  totalClasses: number;
}> => {
  const token = getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/api/attendance/faculty/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch");
    return await response.json();
  } catch {
    // Return mock data for demo
    return {
      classes: [
        {
          batch_id: 1,
          subject: "Data Structures & Algorithms",
          batch_name: "III CSE-A",
          department_name: "Computer Science and Engineering",
          department_code: "CSE",
          semester: 5,
          academic_year: "2024-2025",
          session_count: 12,
          last_session_date: "2024-01-15",
        },
        {
          batch_id: 2,
          subject: "Database Management Systems",
          batch_name: "III CSE-B",
          department_name: "Computer Science and Engineering",
          department_code: "CSE",
          semester: 5,
          academic_year: "2024-2025",
          session_count: 10,
          last_session_date: "2024-01-14",
        },
        {
          batch_id: 3,
          subject: "DS Lab",
          batch_name: "III CSD-A",
          department_name: "Computer Science and Design",
          department_code: "CSD",
          semester: 5,
          academic_year: "2024-2025",
          session_count: 8,
          last_session_date: "2024-01-13",
        },
        {
          batch_id: 4,
          subject: "Programming in C",
          batch_name: "II CSE-A",
          department_name: "Computer Science and Engineering",
          department_code: "CSE",
          semester: 3,
          academic_year: "2024-2025",
          session_count: 15,
          last_session_date: "2024-01-15",
        },
      ],
      totalStudents: 156,
      totalClasses: 4,
    };
  }
};

const fetchPendingGrades = async (): Promise<{
  pendingGrades: PendingGrade[];
  totalPending: number;
  pendingQuizzes: number;
  pendingAssignments: number;
  pendingTests?: number;
}> => {
  const token = getAuthToken();
  try {
    const response = await fetch(
      `${API_BASE}/api/attendance/faculty/pending-grades`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) throw new Error("Failed to fetch");
    return await response.json();
  } catch {
    // Return mock data for demo
    return {
      pendingGrades: [
        {
          id: 1,
          type: "quiz",
          reference_id: 1,
          title: "DS Unit 1 Quiz",
          class_name: "III CSE-A",
          student_id: "21CSE001",
          submitted_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          type: "quiz",
          reference_id: 2,
          title: "DBMS Mid Exam",
          class_name: "III CSE-B",
          student_id: "21CSE045",
          submitted_at: "2024-01-15T09:15:00Z",
        },
        {
          id: 3,
          type: "assignment",
          reference_id: 1,
          title: "SQL Assignment #3",
          class_name: "III CSE-A",
          student_id: "21CSE012",
          submitted_at: "2024-01-14T14:20:00Z",
        },
        {
          id: 4,
          type: "quiz",
          reference_id: 3,
          title: "Array Problems",
          class_name: "II CSE-A",
          student_id: "22CSE008",
          submitted_at: "2024-01-14T11:45:00Z",
        },
        {
          id: 5,
          type: "assignment",
          reference_id: 2,
          title: "Normalization Task",
          class_name: "III CSE-B",
          student_id: "21CSE038",
          submitted_at: "2024-01-13T16:30:00Z",
        },
        {
          id: 6,
          type: "test",
          reference_id: 1,
          title: "Data Structures Coding Test",
          class_name: "III CSE-A",
          student_id: "21CSE005",
          submitted_at: "2024-01-16T09:00:00Z",
        },
      ],
      totalPending: 6,
      pendingQuizzes: 3,
      pendingAssignments: 2,
      pendingTests: 1,
    };
  }
};

const fetchNextClass = async (): Promise<NextClass> => {
  const token = getAuthToken();
  try {
    const response = await fetch(
      `${API_BASE}/api/attendance/faculty/next-class`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) throw new Error("Failed to fetch");
    return await response.json();
  } catch {
    // Return mock data for demo
    return {
      id: null,
      batch_id: 2,
      subject: "Database Management Systems",
      session_date: new Date().toISOString().split("T")[0],
      start_time: "10:00",
      end_time: "10:50",
      is_active: false,
      batch_name: "III CSE-B",
      department_name: "Computer Science and Engineering",
      department_code: "CSE",
      nextClassType: "today",
    };
  }
};

const fetchClassStudents = async (batchId: number): Promise<ClassStudent[]> => {
  const token = getAuthToken();
  try {
    const response = await fetch(
      `${API_BASE}/api/attendance/faculty/classes/${batchId}/students`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) throw new Error("Failed to fetch");
    return await response.json();
  } catch {
    // Return mock data for demo
    return [
      {
        student_id: "21CSE001",
        full_name: "Aarav Sharma",
        email: "aarav@example.com",
        roll_number: "21CSE001",
        attendance_count: 12,
        present_count: 10,
        attendance_percentage: 83.33,
      },
      {
        student_id: "21CSE002",
        full_name: "Vivaan Patel",
        email: "vivaan@example.com",
        roll_number: "21CSE002",
        attendance_count: 12,
        present_count: 11,
        attendance_percentage: 91.67,
      },
      {
        student_id: "21CSE003",
        full_name: "Aditya Kumar",
        email: "aditya@example.com",
        roll_number: "21CSE003",
        attendance_count: 12,
        present_count: 8,
        attendance_percentage: 66.67,
      },
      {
        student_id: "21CSE004",
        full_name: "Vihaan Singh",
        email: "vihaan@example.com",
        roll_number: "21CSE004",
        attendance_count: 12,
        present_count: 12,
        attendance_percentage: 100,
      },
      {
        student_id: "21CSE005",
        full_name: "Arjun Gupta",
        email: "arjun@example.com",
        roll_number: "21CSE005",
        attendance_count: 12,
        present_count: 9,
        attendance_percentage: 75,
      },
    ];
  }
};

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const previousGradesCount = useRef<number>(0);
  const notifiedSubmissions = useRef<Set<string>>(new Set());

  // Dashboard stats
  const [activeClassesCount, setActiveClassesCount] = useState(4);
  const [totalStudents, setTotalStudents] = useState(240);
  const [totalClasses, setTotalClasses] = useState(4);
  const [pendingGradesCount, setPendingGradesCount] = useState(12);
  const [nextClassInfo, setNextClassInfo] = useState<NextClass | null>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [facultyClasses, setFacultyClasses] = useState<FacultyClass[]>([]);
  const [pendingGrades, setPendingGrades] = useState<PendingGrade[]>([]);
  const [selectedClassStudents, setSelectedClassStudents] = useState<
    ClassStudent[]
  >([]);
  const [selectedClass, setSelectedClass] = useState<FacultyClass | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [activeData, classesData, nextClass, pendingData] =
          await Promise.all([
            fetchActiveClasses(),
            fetchFacultyClasses(),
            fetchNextClass(),
            fetchPendingGrades(),
          ]);

        setActiveClasses(activeData);
        setActiveClassesCount(activeData.length);

        setFacultyClasses(classesData.classes);
        setTotalStudents(classesData.totalStudents);
        setTotalClasses(classesData.totalClasses);

        setNextClassInfo(nextClass);

        setPendingGrades(pendingData.pendingGrades);
        setPendingGradesCount(pendingData.totalPending);
        
        // Track for notifications
        previousGradesCount.current = pendingData.totalPending;
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    };

    loadData();
  }, []);

  // Poll for new submissions every 10 seconds
  useEffect(() => {
    const checkNewSubmissions = async () => {
      try {
        const pendingData = await fetchPendingGrades();
        const newCount = pendingData.totalPending;
        
        // Check for new submissions
        if (newCount > previousGradesCount.current) {
          const newSubmissions = pendingData.pendingGrades.filter(
            g => !notifiedSubmissions.current.has(`${g.id}-${g.student_id}`)
          );
          
          // Show notification for each new submission
          newSubmissions.forEach(submission => {
            const key = `${submission.id}-${submission.student_id}`;
            notifiedSubmissions.current.add(key);
            
            toast.info(
              `📝 New ${submission.type} submission: ${submission.title} by ${submission.student_id}`,
              {
                duration: 5000,
                action: {
                  label: "Grade Now",
                  onClick: () => {
                    if (submission.type === "quiz") {
                      navigate(`/faculty/quiz-results/${submission.reference_id}?student=${submission.student_id}`);
                    } else if (submission.type === "assignment") {
                      navigate(`/faculty/assignments?pending=${submission.reference_id}&student=${submission.student_id}`);
                    } else if (submission.type === "test") {
                      navigate(`/faculty/test-results/${submission.reference_id}?student=${submission.student_id}`);
                    }
                  },
                },
              }
            );
          });
        }
        
        // Update count
        setPendingGradesCount(newCount);
        setPendingGrades(pendingData.pendingGrades);
        previousGradesCount.current = newCount;
      } catch (error) {
        console.error("Error checking new submissions:", error);
      }
    };

    const interval = setInterval(checkNewSubmissions, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [navigate]);

  const openModal = async (modalType: string, classData?: FacultyClass) => {
    setActiveModal(modalType);
    setLoading(true);

    if (modalType === "students" && classData) {
      setSelectedClass(classData);
      try {
        const students = await fetchClassStudents(classData.batch_id);
        setSelectedClassStudents(students);
      } catch (error) {
        console.error("Failed to load students:", error);
      }
    }

    setLoading(false);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedClass(null);
    setSelectedClassStudents([]);
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Faculty Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your classes and track student progress
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {/* Active Classes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-4 md:p-6 cursor-pointer hover:scale-[1.02] md:hover:scale-105 transition-transform border border-border/50"
            onClick={() => openModal("active")}
          >
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {activeClassesCount}
            </h3>
            <p className="text-[10px] md:text-sm text-muted-foreground">Active Classes</p>
          </motion.div>

          {/* Total Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-4 md:p-6 border border-border/50"
          >
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gradient-accent flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {totalStudents}
            </h3>
            <p className="text-[10px] md:text-sm text-muted-foreground">Total Students</p>
          </motion.div>

          {/* Total Classes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-4 md:p-6 cursor-pointer hover:scale-[1.02] md:hover:scale-105 transition-transform border border-border/50"
            onClick={() => openModal("classes")}
          >
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {totalClasses}
            </h3>
            <p className="text-[10px] md:text-sm text-muted-foreground">My Classes</p>
          </motion.div>

          {/* Pending Grades */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-4 md:p-6 cursor-pointer hover:scale-[1.02] md:hover:scale-105 transition-transform border border-border/50"
            onClick={() => openModal("pending")}
          >
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {pendingGradesCount}
            </h3>
            <p className="text-[10px] md:text-sm text-muted-foreground">Pending Grades</p>
          </motion.div>
        </div>

        {/* Next Class Card */}
        {nextClassInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-primary" />
                {nextClassInfo.nextClassType === "today"
                  ? "Next Class Today"
                  : nextClassInfo.nextClassType === "upcoming"
                    ? "Upcoming Class"
                    : "No Classes Scheduled"}
              </h3>
              {nextClassInfo.nextClassType !== "none" && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    nextClassInfo.nextClassType === "today"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {nextClassInfo.nextClassType === "today"
                    ? "Today"
                    : "Upcoming"}
                </span>
              )}
            </div>

            {nextClassInfo.nextClassType !== "none" ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {nextClassInfo.subject}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nextClassInfo.batch_name} • {nextClassInfo.department_code}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nextClassInfo.start_time} - {nextClassInfo.end_time}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            ) : (
              <p className="text-muted-foreground">
                No classes scheduled for today
              </p>
            )}
          </motion.div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {activeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-background rounded-2xl p-4 md:p-6 max-w-4xl w-full max-h-[90vh] md:max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div className="flex items-center gap-2">
                    {activeModal === "students" && (
                      <button
                        onClick={() => setActiveModal("classes")}
                        className="p-1.5 md:p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    )}
                    <h2 className="text-lg md:text-xl font-bold text-foreground truncate max-w-[200px] md:max-w-none">
                      {activeModal === "active" && "Active Classes"}
                      {activeModal === "classes" && "My Classes"}
                      {activeModal === "pending" && "Pending Grades"}
                      {activeModal === "students" &&
                        `Students - ${selectedClass?.subject}`}
                    </h2>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Classes Modal */}
                    {activeModal === "active" &&
                      activeClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">
                                {cls.subject}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {cls.batch_name} • {cls.department_code}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {cls.start_time} - {cls.end_time}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                cls.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {cls.is_active ? "Active" : "Completed"}
                            </span>
                          </div>
                        </div>
                      ))}

                    {/* Faculty Classes Modal */}
                    {activeModal === "classes" &&
                      facultyClasses.map((cls) => (
                        <div
                          key={cls.batch_id}
                          onClick={() => openModal("students", cls)}
                          className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">
                                {cls.subject}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {cls.batch_name} • {cls.department_code}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {cls.session_count} sessions • Last:{" "}
                                {new Date(
                                  cls.last_session_date,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
                              View Students
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* Pending Grades Modal */}
                    {activeModal === "pending" &&
                      pendingGrades.map((grade) => (
                        <div
                          key={grade.id}
                          className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                          onClick={() => {
                            closeModal();
                            if (grade.type === "quiz") {
                              navigate(
                                `/faculty/quiz-results/${grade.reference_id}?student=${grade.student_id}`,
                              );
                            } else if (grade.type === "assignment") {
                              navigate(
                                `/faculty/assignments?pending=${grade.reference_id}&student=${grade.student_id}`,
                              );
                            } else if (grade.type === "test") {
                              navigate(
                                `/faculty/test-results/${grade.reference_id}?student=${grade.student_id}`,
                              );
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">
                                {grade.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {grade.class_name} • {grade.student_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Submitted:{" "}
                                {grade.submitted_at
                                  ? new Date(
                                      grade.submitted_at,
                                    ).toLocaleDateString()
                                  : "Not submitted"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  grade.type === "quiz"
                                    ? "bg-blue-100 text-blue-700"
                                    : grade.type === "test"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {grade.type.charAt(0).toUpperCase() +
                                  grade.type.slice(1)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeModal();
                                  if (grade.type === "quiz") {
                                    navigate(
                                      `/faculty/quiz-results/${grade.reference_id}?student=${grade.student_id}`,
                                    );
                                  } else if (grade.type === "assignment") {
                                    navigate(
                                      `/faculty/assignments?pending=${grade.reference_id}&student=${grade.student_id}`,
                                    );
                                  } else if (grade.type === "test") {
                                    navigate(
                                      `/faculty/test-results/${grade.reference_id}?student=${grade.student_id}`,
                                    );
                                  }
                                }}
                                className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs"
                              >
                                Grade Now
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    {/* Students Modal */}
                    {activeModal === "students" &&
                      selectedClassStudents.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No students found in this class.
                        </div>
                      )}
                    {activeModal === "students" &&
                      selectedClassStudents.map((student) => (
                        <div
                          key={student.student_id}
                          className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {student.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium text-foreground">
                                  {student.full_name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {student.roll_number}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FacultyLayout>
  );
};

export default FacultyDashboard;
