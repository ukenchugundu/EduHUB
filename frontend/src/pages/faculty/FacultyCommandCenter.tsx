import { useEffect, useMemo, useState } from "react";
import FacultyLayout from "@/components/FacultyLayout";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Pause,
  Play,
} from "lucide-react";
import { requestJson as apiRequestJson } from "@/lib/apiClient";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

interface FacultyScheduleSession {
  id: number;
  batch_id: number;
  subject: string;
  session_date: string;
  batch_name: string;
  department_name: string;
  department_code: string;
  start_time: string;
  end_time: string | null;
  is_active?: boolean;
}

interface FacultyNextClass extends FacultyScheduleSession {
  nextClassType?: "today" | "upcoming";
}

type ScheduleStatus = "completed" | "ongoing" | "upcoming" | "missed";

interface ClassSchedule {
  id: number;
  subject: string;
  batch_name: string;
  department_code: string;
  start_time: string;
  end_time: string | null;
  session_date: string;
  is_current: boolean;
  is_next: boolean;
  status: ScheduleStatus;
}

const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    const token = authData ? (JSON.parse(authData).token as string | undefined) : undefined;
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
};

const requestJson = async <T,>(url: string, fallbackError: string): Promise<T> => {
  const token = getAuthToken();
  return apiRequestJson<T>(
    url,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
    {
      fallbackError,
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const toComparableTime = (value?: string | null): string => {
  if (!value) {
    return "";
  }
  return value.length === 5 ? `${value}:00` : value;
};

const formatTime = (value?: string | null): string => {
  if (!value) {
    return "--";
  }
  const date = new Date(`1970-01-01T${value}`);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 5)
    : date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
};

const formatSessionDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
};

const getSessionStatus = (
  session: FacultyScheduleSession,
  now: Date,
): ScheduleStatus => {
  const today = now.toISOString().split("T")[0];
  if (session.session_date < today) {
    return "completed";
  }
  if (session.session_date > today) {
    return "upcoming";
  }

  const currentTime = now.toTimeString().slice(0, 8);
  const startTime = toComparableTime(session.start_time);
  const endTime = toComparableTime(session.end_time);

  if (startTime && startTime <= currentTime && (!endTime || currentTime < endTime)) {
    return "ongoing";
  }
  if (endTime && currentTime >= endTime) {
    return "completed";
  }
  if (startTime && currentTime < startTime) {
    return "upcoming";
  }

  return session.is_active ? "ongoing" : "upcoming";
};

const toDisplaySchedule = (
  session: FacultyScheduleSession,
  now: Date,
  isNext = false,
): ClassSchedule => {
  const status = getSessionStatus(session, now);
  return {
    id: session.id,
    subject: session.subject,
    batch_name: session.batch_name,
    department_code: session.department_code,
    start_time: session.start_time,
    end_time: session.end_time,
    session_date: session.session_date,
    is_current: status === "ongoing",
    is_next: isNext && status !== "ongoing",
    status,
  };
};

const FacultyCommandCenter = () => {
  const [todaySessions, setTodaySessions] = useState<FacultyScheduleSession[]>([]);
  const [nextSession, setNextSession] = useState<FacultyNextClass | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    const loadSchedule = async () => {
      setError(null);
      const [todayResult, nextResult] = await Promise.allSettled([
        requestJson<FacultyScheduleSession[]>(
          `${API_BASE}/api/timetable/faculty/today`,
          "Failed to load today's schedule.",
        ),
        requestJson<FacultyNextClass | { message: string }>(
          `${API_BASE}/api/timetable/faculty/next`,
          "Failed to load next class.",
        ),
      ]);

      setTodaySessions(
        todayResult.status === "fulfilled" && Array.isArray(todayResult.value)
          ? todayResult.value
          : [],
      );
      setNextSession(
        nextResult.status === "fulfilled" &&
          "id" in nextResult.value &&
          typeof nextResult.value.id === "number"
          ? nextResult.value
          : null,
      );

      const errors = [todayResult, nextResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) =>
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to load schedule.",
        );

      setError(
        errors.length === 0
          ? null
          : errors.length === 2
            ? errors[0]
            : "Part of the schedule could not refresh. Showing available data.",
      );
      setLoading(false);
    };

    void loadSchedule();
    const refreshTimer = setInterval(() => {
      void loadSchedule();
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600 text-white border-green-700";
      case "ongoing":
        return "bg-blue-600 text-white border-blue-700";
      case "upcoming":
        return "bg-yellow-500 text-white border-yellow-600";
      case "missed":
        return "bg-red-600 text-white border-red-700";
      default:
        return "bg-gray-600 text-white border-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "ongoing":
        return <Play className="w-4 h-4" />;
      case "upcoming":
        return <Clock className="w-4 h-4" />;
      case "missed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return Math.round((completed / total) * 100);
  };

  const todaySchedule = useMemo(() => {
    const nextClassId = nextSession?.session_date === currentTime.toISOString().split("T")[0]
      ? nextSession.id
      : null;

    return [...todaySessions]
      .sort((a, b) => toComparableTime(a.start_time).localeCompare(toComparableTime(b.start_time)))
      .map((session) =>
        toDisplaySchedule(session, currentTime, nextClassId === session.id),
      );
  }, [currentTime, nextSession, todaySessions]);

  const currentClass = todaySchedule.find((cls) => cls.is_current);
  const nextClass = nextSession ? toDisplaySchedule(nextSession, currentTime, true) : null;

  if (loading) {
    return (
      <FacultyLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Schedule
            </h1>
            <p className="text-sm text-muted-foreground">
              Your daily teaching schedule from the admin timetable
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
        </div>

        {/* Current & Next Class Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Class */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Current Class
              </h3>
            </div>

            {currentClass ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">
                    {currentClass.subject}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {currentClass.batch_name} • {currentClass.department_code}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatTime(currentClass.start_time)} - {formatTime(currentClass.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatSessionDate(currentClass.session_date)}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentClass.status)}`}
                  >
                    {getStatusIcon(currentClass.status)}
                    Ongoing
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Pause className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">No ongoing class</p>
              </div>
            )}
          </motion.div>

          {/* Next Class */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Next Class
              </h3>
            </div>

            {nextClass ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">
                    {nextClass.subject}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {nextClass.batch_name} • {nextClass.department_code}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatTime(nextClass.start_time)} - {formatTime(nextClass.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatSessionDate(nextClass.session_date)}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(nextClass.status)}`}
                  >
                    {getStatusIcon(nextClass.status)}
                    Upcoming
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500/30 mb-2" />
                <p className="text-muted-foreground">No more classes today</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Today's Schedule
            </h3>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {error}
            </div>
          ) : todaySchedule.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No classes scheduled for today.
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((cls, index) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`p-4 rounded-xl border transition-all ${
                    cls.is_current
                      ? "border-blue-500 bg-blue-500/20"
                      : cls.is_next
                        ? "border-yellow-500 bg-yellow-500/20"
                        : "border-border/50 hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {formatTime(cls.start_time)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(cls.end_time)}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {cls.subject}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {cls.batch_name} • {cls.department_code}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatSessionDate(cls.session_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(cls.status)}`}
                      >
                        {getStatusIcon(cls.status)}
                        {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </FacultyLayout>
  );
};

export default FacultyCommandCenter;
