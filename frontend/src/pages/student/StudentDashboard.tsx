import StudentLayout from "@/components/StudentLayout";
import { Badge } from "@/components/ui/badge";
import { getStudentIdentity, mergeStoredAuth, readStoredAuth } from "@/lib/authSession";
import {
  buildStudentPerformanceSummary,
  fetchStudentPerformanceData,
  type StudentPerformanceData,
} from "@/lib/studentPerformance";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Code,
  FileText,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface CurrentUserProfile {
  fullName: string;
  rollNumber: string;
  studentId: string;
  department: string;
  academicYear: string;
  section: string;
  batchId: number | null;
  batchName: string;
}

interface ScheduledClass {
  id: number;
  subject: string;
  session_date?: string;
  start_time: string;
  end_time?: string;
  faculty_name: string;
  room?: string;
  is_active?: boolean;
}

interface StudentSchedule {
  today: ScheduledClass[];
  upcoming: ScheduledClass[];
}

interface AttendanceLog {
  date: string;
  status: "present" | "absent" | "late" | "excused";
  topic?: string;
}

interface AttendanceRecord {
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  lastAttended: string;
  logs: AttendanceLog[];
}

const formatPercentage = (value: number | null): string =>
  value === null ? "-" : `${value}%`;

const formatCgpa = (value: number | null): string =>
  value === null ? "-" : value.toFixed(2);

const formatText = (value: string | null | undefined): string =>
  value && value.trim() ? value : "-";

const getAuthHeaders = (includeStudentId = false): HeadersInit => {
  const auth = readStoredAuth();
  const headers: Record<string, string> = {};

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  if (includeStudentId) {
    const studentId = getStudentIdentity().trim();
    if (studentId) {
      headers["x-student-id"] = studentId;
    }
  }

  return headers;
};

const StudentDashboard = () => {
  const auth = readStoredAuth();
  const [selectedView, setSelectedView] = useState<
    "dashboard" | "attendance" | "cgpa" | "risk" | "schedule"
  >("dashboard");
  const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState<string | null>(null);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [schedule, setSchedule] = useState<StudentSchedule>({ today: [], upcoming: [] });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [overallAttendance, setOverallAttendance] = useState<number | null>(null);
  const [performanceData, setPerformanceData] = useState<StudentPerformanceData>({
    tests: [],
    quizzes: [],
    assignments: [],
  });
  const [performanceLoading, setPerformanceLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth?.token) {
        return;
      }

      setProfileLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as CurrentUserProfile;
        setProfile(data);
        mergeStoredAuth({
          fullName: data.fullName,
          rollNumber: data.rollNumber || undefined,
          studentId: data.studentId || undefined,
          department: data.department || undefined,
          academicYear: data.academicYear || undefined,
          section: data.section || undefined,
          batchId: data.batchId,
          batchName: data.batchName || undefined,
        });
      } catch (error) {
        console.error("Failed to fetch student profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    const loadSchedule = async () => {
      setScheduleLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/timetable/student/schedule`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as StudentSchedule;
        setSchedule({
          today: Array.isArray(data.today) ? data.today : [],
          upcoming: Array.isArray(data.upcoming) ? data.upcoming : [],
        });
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      } finally {
        setScheduleLoading(false);
      }
    };

    const loadAttendance = async () => {
      if (!auth?.userId) {
        return;
      }

      setAttendanceLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/attendance/students/${auth.userId}/attendance`,
          { headers: getAuthHeaders() },
        );
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          records?: Array<Record<string, unknown>>;
          summary?: { attendancePercentage?: number };
        };
        const grouped: Record<string, AttendanceRecord> = {};

        for (const item of data.records ?? []) {
          const subject = String(item.subject ?? "").trim();
          if (!subject) {
            continue;
          }

          if (!grouped[subject]) {
            grouped[subject] = {
              subject,
              totalClasses: 0,
              attendedClasses: 0,
              percentage: 0,
              lastAttended: String(item.session_date ?? ""),
              logs: [],
            };
          }

          grouped[subject].totalClasses += 1;
          if (item.status === "present") {
            grouped[subject].attendedClasses += 1;
          }

          const sessionDate = String(item.session_date ?? "");
          if (sessionDate && sessionDate > grouped[subject].lastAttended) {
            grouped[subject].lastAttended = sessionDate;
          }

          grouped[subject].logs.push({
            date: sessionDate,
            status:
              item.status === "present" ||
              item.status === "absent" ||
              item.status === "late" ||
              item.status === "excused"
                ? item.status
                : "absent",
            topic: String(item.topic ?? item.batch_name ?? "").trim() || undefined,
          });
        }

        const records = Object.values(grouped)
          .map((record) => ({
            ...record,
            percentage:
              record.totalClasses > 0
                ? Math.round((record.attendedClasses / record.totalClasses) * 100)
                : 0,
            logs: [...record.logs].sort(
              (left, right) =>
                new Date(right.date).getTime() - new Date(left.date).getTime(),
            ),
          }))
          .sort((left, right) => left.subject.localeCompare(right.subject));

        setAttendanceRecords(records);
        setOverallAttendance(
          typeof data.summary?.attendancePercentage === "number"
            ? data.summary.attendancePercentage
            : records.length > 0
              ? Math.round(
                  records.reduce((total, item) => total + item.percentage, 0) /
                    records.length,
                )
              : null,
        );
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setAttendanceLoading(false);
      }
    };

    const loadPerformance = async () => {
      setPerformanceLoading(true);
      try {
        setPerformanceData(await fetchStudentPerformanceData());
      } catch (error) {
        console.error("Failed to fetch performance data:", error);
      } finally {
        setPerformanceLoading(false);
      }
    };

    void loadProfile();
    void loadSchedule();
    void loadAttendance();
    void loadPerformance();
  }, [auth?.token, auth?.userId]);

  const performanceSummary = useMemo(
    () => buildStudentPerformanceSummary(performanceData),
    [performanceData],
  );

  const riskProfile = useMemo(() => {
    const attendanceScore = overallAttendance;
    const marksScore = performanceSummary.overallPercentage;

    if (attendanceScore === null && marksScore === null) {
      return {
        label: "Unknown",
        description: "Risk will be calculated once attendance or graded marks are available.",
        ring: "border-border/50 text-muted-foreground",
      };
    }

    if (
      (attendanceScore !== null && attendanceScore < 75) ||
      (marksScore !== null && marksScore < 60)
    ) {
      return {
        label: "High",
        description: "Attendance or marks are below the expected level.",
        ring: "border-red-500/20 text-red-500",
      };
    }

    if (
      (attendanceScore !== null && attendanceScore < 85) ||
      (marksScore !== null && marksScore < 75)
    ) {
      return {
        label: "Moderate",
        description: "Performance is stable, but there are a few areas to improve.",
        ring: "border-amber-500/20 text-amber-500",
      };
    }

    return {
      label: "Low",
      description: "Attendance and graded performance are both in a healthy range.",
      ring: "border-green-500/20 text-green-500",
    };
  }, [overallAttendance, performanceSummary.overallPercentage]);

  const getLogStatusColor = (status: AttendanceLog["status"]) => {
    switch (status) {
      case "present":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "absent":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "late":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "excused":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const renderScheduleCards = (items: ScheduledClass[]) =>
    items.map((cls, index) => (
      <motion.div
        key={`${cls.id}-${index}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="glass-card rounded-2xl p-4 border border-border/50 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold truncate">{cls.subject}</h4>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {cls.faculty_name}
            </p>
          </div>
          {cls.is_active ? (
            <Badge className="bg-green-500 animate-pulse text-[10px]">Live</Badge>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
          <span>
            {cls.start_time.slice(0, 5)} - {cls.end_time?.slice(0, 5) || "--:--"}
          </span>
          <span>{cls.room || "TBD"}</span>
        </div>
      </motion.div>
    ));

  if (selectedView === "schedule") {
    const allClasses = [...schedule.today, ...schedule.upcoming];
    const dates = Array.from(
      new Set(
        allClasses.map(
          (item) => item.session_date || new Date().toISOString().split("T")[0],
        ),
      ),
    ).sort();
    const activeDay =
      selectedScheduleDay || dates[0] || new Date().toISOString().split("T")[0];
    const dayClasses = allClasses
      .filter(
        (item) =>
          (item.session_date || new Date().toISOString().split("T")[0]) === activeDay,
      )
      .sort((left, right) => left.start_time.localeCompare(right.start_time));

    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedView("dashboard")}
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Class Timetable</h1>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {(dates.length > 0 ? dates : [activeDay]).map((date) => {
              const isSelected = date === activeDay;
              const dateObj = new Date(date);
              return (
                <button
                  key={date}
                  onClick={() => setSelectedScheduleDay(date)}
                  className={`min-w-[84px] rounded-2xl px-3 py-3 text-center transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "glass-card hover:bg-secondary/50"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">
                    {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-xl font-bold">{dateObj.getDate()}</div>
                  <div className="text-[10px]">
                    {dateObj.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                </button>
              );
            })}
          </div>

          {scheduleLoading ? (
            <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : dayClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {renderScheduleCards(dayClasses)}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
              No timetable entries are available for this day.
            </div>
          )}
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "cgpa") {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedView("dashboard")}
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Academic Overview</h1>
              <p className="text-sm text-muted-foreground">
                Derived from graded marks currently available in the database.
              </p>
            </div>
          </div>

          {performanceLoading ? (
            <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : performanceSummary.allResults.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
              No graded results are available yet.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {[
                  ["Derived CGPA", formatCgpa(performanceSummary.derivedCgpa)],
                  ["Overall Score", formatPercentage(performanceSummary.overallPercentage)],
                  ["Tests Avg", formatPercentage(performanceSummary.averageTestPercentage)],
                  ["Quizzes Avg", formatPercentage(performanceSummary.averageQuizPercentage)],
                  [
                    "Assignments Avg",
                    formatPercentage(performanceSummary.averageAssignmentPercentage),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="glass-card rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      {label}
                    </p>
                    <p className="text-3xl font-bold mt-3">{value}</p>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Published Results</h2>
                <div className="space-y-3">
                  {performanceSummary.recentResults.map((item) => {
                    const Icon =
                      item.type === "test"
                        ? Code
                        : item.type === "quiz"
                          ? Brain
                          : FileText;
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/20 p-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subtitle} -{" "}
                              {new Date(item.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-primary">
                            {item.percentage}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.score}/{item.maxScore}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "attendance") {
    const selectedRecord = attendanceRecords.find(
      (item) => item.subject === selectedAttendanceSubject,
    );

    if (selectedRecord) {
      return (
        <StudentLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedAttendanceSubject(null)}
                className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{selectedRecord.subject}</h1>
                <p className="text-sm text-muted-foreground">Attendance Log</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                    Overall Attendance
                  </p>
                  <h2 className="text-4xl font-bold mt-1">{selectedRecord.percentage}%</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Classes Attended</p>
                  <p className="text-xl font-bold">
                    {selectedRecord.attendedClasses} / {selectedRecord.totalClasses}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedRecord.logs.map((log, index) => (
                  <div
                    key={`${log.date}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 p-4"
                  >
                    <div>
                      <p className="font-medium">{log.topic || "Regular Session"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`capitalize ${getLogStatusColor(log.status)}`}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StudentLayout>
      );
    }

    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedView("dashboard")}
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Attendance Report</h1>
          </div>

          {attendanceLoading ? (
            <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : attendanceRecords.length > 0 ? (
            <div className="space-y-4">
              {attendanceRecords.map((item) => (
                <button
                  key={item.subject}
                  onClick={() => setSelectedAttendanceSubject(item.subject)}
                  className="w-full text-left glass-card rounded-2xl p-6 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{item.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        Last attended: {item.lastAttended}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{item.percentage}%</p>
                      <p className="text-xs text-muted-foreground">Overall</p>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-secondary/50">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
              No attendance records were found in the database.
            </div>
          )}
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "risk") {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedView("dashboard")}
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Risk Profile</h1>
          </div>

          <div className="glass-card rounded-3xl p-8 text-center space-y-6">
            <div
              className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full border-8 ${riskProfile.ring}`}
            >
              <span className="text-3xl font-bold">{riskProfile.label}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Live Academic Standing</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {riskProfile.description}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  Attendance
                </p>
                <p className="text-3xl font-bold mt-2">
                  {formatPercentage(overallAttendance)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  Published Marks Avg
                </p>
                <p className="text-3xl font-bold mt-2">
                  {formatPercentage(performanceSummary.overallPercentage)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const welcomeName =
    profile?.fullName?.trim() || auth?.fullName?.trim() || auth?.email || "Student";

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Insights</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {welcomeName}!</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {[
            {
              label: "My Schedule",
              value: schedule.today.length ? `${schedule.today.length} today` : "No classes",
              icon: Calendar,
              view: "schedule" as const,
            },
            {
              label: "Attendance",
              value: formatPercentage(overallAttendance),
              icon: CheckCircle,
              view: "attendance" as const,
            },
            {
              label: "Derived CGPA",
              value: formatCgpa(performanceSummary.derivedCgpa),
              icon: TrendingUp,
              view: "cgpa" as const,
            },
            {
              label: "Published Results",
              value: String(performanceSummary.allResults.length),
              icon: BookOpen,
              view: "cgpa" as const,
            },
            {
              label: "Risk Profile",
              value: riskProfile.label,
              icon: AlertTriangle,
              view: "risk" as const,
            },
          ].map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-4 md:p-5 text-left hover:bg-secondary/30 transition-all border border-border/50"
              onClick={() => setSelectedView(item.view)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground text-right">
                  {item.label}
                </span>
              </div>
              <p className="text-xl md:text-3xl font-bold truncate">{item.value}</p>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Today's Schedule
              </h3>
              <button
                onClick={() => setSelectedView("schedule")}
                className="text-xs font-bold text-primary hover:underline"
              >
                View Full
              </button>
            </div>

            {scheduleLoading ? (
              <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : schedule.today.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderScheduleCards(schedule.today)}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground border border-dashed">
                No classes scheduled for today
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Student Information</h3>
              </div>
              {profileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Roll No</span>
                    <span className="font-medium text-right">
                      {formatText(profile?.rollNumber || auth?.rollNumber)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium text-right">
                      {formatText(profile?.department || auth?.department)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Academic Year</span>
                    <span className="font-medium text-right">
                      {formatText(profile?.academicYear || auth?.academicYear)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Section</span>
                    <span className="font-medium text-right">
                      {formatText(profile?.section || auth?.section)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Batch</span>
                    <span className="font-medium text-right">
                      {formatText(profile?.batchName || auth?.batchName)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Upcoming</h3>
              </div>
              {schedule.upcoming.length > 0 ? (
                <div className="space-y-3">
                  {schedule.upcoming.slice(0, 4).map((item, index) => (
                    <motion.button
                      key={`${item.id}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + index * 0.06 }}
                      className="w-full rounded-xl border border-border/50 bg-background/50 p-4 text-left hover:bg-secondary/30 transition-colors"
                      onClick={() => {
                        if (item.session_date) {
                          setSelectedScheduleDay(item.session_date);
                        }
                        setSelectedView("schedule");
                      }}
                    >
                      <p className="text-sm font-semibold truncate">{item.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {item.session_date
                          ? new Date(item.session_date).toLocaleDateString()
                          : "-"}
                        {" - "}
                        {item.start_time.slice(0, 5)}
                      </p>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No upcoming classes
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Recent Published Results</h3>
            <button
              onClick={() => setSelectedView("cgpa")}
              className="text-xs font-bold text-primary hover:underline"
            >
              View All
            </button>
          </div>
          {performanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : performanceSummary.recentResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {performanceSummary.recentResults.slice(0, 3).map((item) => {
                const Icon =
                  item.type === "test"
                    ? Code
                    : item.type === "quiz"
                      ? Brain
                      : FileText;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="rounded-2xl border border-border/50 bg-secondary/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{item.percentage}%</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          {item.type}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold mt-3 truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No graded results are available yet.
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
