import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Users,
  Zap,
} from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

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

interface PendingGradesResponse {
  pendingGrades: PendingGrade[];
  totalPending: number;
  pendingQuizzes: number;
  pendingAssignments: number;
  pendingTests?: number;
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

interface FacultyClassesResponse {
  classes: FacultyClass[];
  totalStudents: number;
  totalClasses: number;
}

const requestJson = async <T,>(path: string): Promise<T> => {
  const token = readStoredAuth()?.token?.trim();
  return apiRequestJson<T>(
    `${API_BASE}${path}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    {
      fallbackError: "Failed to load faculty dashboard data.",
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [facultyClasses, setFacultyClasses] = useState<FacultyClass[]>([]);
  const [pending, setPending] = useState<PendingGradesResponse>({
    pendingGrades: [],
    totalPending: 0,
    pendingQuizzes: 0,
    pendingAssignments: 0,
    pendingTests: 0,
  });
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    const [activeResult, classesResult, pendingResult, nextClassResult] =
      await Promise.allSettled([
        requestJson<ActiveClass[]>("/api/attendance/faculty/active-classes"),
        requestJson<FacultyClassesResponse>("/api/attendance/faculty/classes"),
        requestJson<PendingGradesResponse>("/api/attendance/faculty/pending-grades"),
        requestJson<NextClass>("/api/attendance/faculty/next-class"),
      ]);

    setActiveClasses(
      activeResult.status === "fulfilled" && Array.isArray(activeResult.value)
        ? activeResult.value
        : [],
    );

    if (classesResult.status === "fulfilled") {
      setFacultyClasses(
        Array.isArray(classesResult.value.classes)
          ? classesResult.value.classes
          : [],
      );
      setTotalStudents(Number(classesResult.value.totalStudents ?? 0));
      setTotalClasses(Number(classesResult.value.totalClasses ?? 0));
    } else {
      setFacultyClasses([]);
      setTotalStudents(0);
      setTotalClasses(0);
    }

    setPending(
      pendingResult.status === "fulfilled"
        ? pendingResult.value
        : {
            pendingGrades: [],
            totalPending: 0,
            pendingQuizzes: 0,
            pendingAssignments: 0,
            pendingTests: 0,
          },
    );
    setNextClass(nextClassResult.status === "fulfilled" ? nextClassResult.value : null);

    const errors = [activeResult, classesResult, pendingResult, nextClassResult]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : "Failed to load faculty dashboard.",
      );

    setError(
      errors.length === 0
        ? ""
        : errors.length === 4
          ? errors[0]
          : "Some live sections could not refresh. Showing available data.",
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const openPendingItem = (item: PendingGrade) => {
    if (item.type === "assignment") {
      navigate(`/faculty/assignments?pending=${item.reference_id}&student=${item.student_id}`);
      return;
    }

    if (item.type === "quiz") {
      navigate(`/faculty/quiz-results/${item.reference_id}?student=${item.student_id}`);
      return;
    }

    navigate(`/faculty/test-results/${item.reference_id}?student=${item.student_id}`);
  };

  return (
    <FacultyLayout title="Faculty Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Faculty Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Live attendance, class, and grading information from the database.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadDashboard()}>
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading live faculty dashboard data...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                { label: "Active Classes", value: activeClasses.length, icon: Zap },
                { label: "My Classes", value: totalClasses, icon: BookOpen },
                { label: "Students Reached", value: totalStudents, icon: Users },
                {
                  label: "Pending Grades",
                  value: pending.totalPending,
                  icon: AlertCircle,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="glass-card rounded-2xl border border-border/50 p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-heading font-bold text-foreground">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl border border-border/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Next Class</h2>
              </div>
              {nextClass && nextClass.nextClassType !== "none" ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{nextClass.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {nextClass.batch_name} • {nextClass.department_code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nextClass.session_date} • {nextClass.start_time}
                      {nextClass.end_time ? ` - ${nextClass.end_time}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {nextClass.nextClassType === "today" ? "Today" : "Upcoming"}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming faculty class is currently scheduled in the database.
                </p>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Pending Grading Queue
                  </h2>
                </div>
                <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Quizzes: {pending.pendingQuizzes}</Badge>
                  <Badge variant="outline">
                    Assignments: {pending.pendingAssignments}
                  </Badge>
                  <Badge variant="outline">
                    Tests: {pending.pendingTests ?? 0}
                  </Badge>
                </div>
                {pending.pendingGrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No ungraded submissions found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pending.pendingGrades.slice(0, 8).map((item) => (
                      <button
                        key={`${item.type}-${item.id}-${item.student_id}`}
                        type="button"
                        onClick={() => openPendingItem(item)}
                        className="w-full rounded-2xl border border-border/50 bg-background/60 p-4 text-left transition-colors hover:bg-background"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.class_name || "Class not set"} • Student {item.student_id}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(item.submitted_at)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl border border-border/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Active Attendance Sessions
                  </h2>
                </div>
                {activeClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active attendance sessions are open right now.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeClasses.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate("/faculty/attendance")}
                        className="w-full rounded-2xl border border-border/50 bg-background/60 p-4 text-left transition-colors hover:bg-background"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.batch_name} • {item.department_code}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {item.is_active ? "Active" : "Closed"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-border/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  My Classes
                </h2>
              </div>
              {facultyClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No faculty classes have been derived from attendance records yet.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {facultyClasses.map((item) => (
                    <div
                      key={`${item.batch_id}-${item.subject}`}
                      className="rounded-2xl border border-border/50 bg-background/60 p-4"
                    >
                      <p className="font-medium text-foreground">{item.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.batch_name} • Semester {item.semester}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Sessions: {item.session_count} • Last session:{" "}
                        {formatDate(item.last_session_date)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyDashboard;
