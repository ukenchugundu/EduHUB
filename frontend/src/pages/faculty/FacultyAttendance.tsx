import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readStoredAuth } from "@/lib/authSession";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");
const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;

type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Batch {
  id: number;
  name: string;
  department_name: string;
  department_code: string;
  academic_year: string;
  semester: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Student {
  id: number;
  student_id?: number;
  full_name: string;
  email: string;
  roll_number: string | null;
}

interface AttendanceSession {
  id: number;
  batch_id: number;
  faculty_id: number;
  subject: string;
  topic: string | null;
  session_date: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  batch_name: string;
  department_name: string;
}

interface AttendanceRecord {
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  full_name?: string;
  email?: string;
  roll_number?: string | null;
}

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const token = readStoredAuth()?.token?.trim();
  return apiRequestJson<T>(
    `${API_BASE}${path}`,
    {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    },
    {
      fallbackError: "Failed to load attendance data.",
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const getStatusBadgeClassName = (status: AttendanceStatus) => {
  switch (status) {
    case "present":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "absent":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    case "late":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
};

const cycleStatus = (status: AttendanceStatus): AttendanceStatus => {
  const currentIndex = ATTENDANCE_STATUSES.indexOf(status);
  return ATTENDANCE_STATUSES[(currentIndex + 1) % ATTENDANCE_STATUSES.length];
};

const FacultyAttendance = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(
    null,
  );
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>(
    {},
  );

  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedBatch = useMemo(
    () =>
      batches.find((batch) => String(batch.id) === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const currentSessionClosed = currentSession ? !currentSession.is_active : true;

  const counts = useMemo(
    () => ({
      present: Object.values(attendance).filter((value) => value === "present")
        .length,
      absent: Object.values(attendance).filter((value) => value === "absent")
        .length,
      late: Object.values(attendance).filter((value) => value === "late").length,
      excused: Object.values(attendance).filter((value) => value === "excused")
        .length,
    }),
    [attendance],
  );

  const initializeAttendance = (rows: Student[]) => {
    setAttendance(
      rows.reduce<Record<number, AttendanceStatus>>((map, student) => {
        map[student.student_id ?? student.id] = "present";
        return map;
      }, {}),
    );
  };

  const loadDepartmentsAndSubjects = async () => {
    setLoading(true);
    setError("");

    try {
      const [departmentData, subjectData] = await Promise.all([
        fetchJson<Department[]>("/api/attendance/departments"),
        fetchJson<Subject[]>("/api/attendance/subjects"),
      ]);

      setDepartments(Array.isArray(departmentData) ? departmentData : []);
      setSubjects(Array.isArray(subjectData) ? subjectData : []);
    } catch (loadError) {
      setDepartments([]);
      setSubjects([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load attendance metadata.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (departmentId: string) => {
    if (!departmentId) {
      setBatches([]);
      return;
    }

    try {
      const batchData = await fetchJson<Batch[]>(
        `/api/attendance/batches?departmentId=${departmentId}`,
      );
      setBatches(Array.isArray(batchData) ? batchData : []);
    } catch (loadError) {
      setBatches([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load batches.",
      );
    }
  };

  const loadStudents = async (batchId: string) => {
    if (!batchId) {
      setStudents([]);
      initializeAttendance([]);
      return;
    }

    setLoadingStudents(true);

    try {
      const studentData = await fetchJson<Student[]>(
        `/api/attendance/batches/${batchId}/students`,
      );
      const rows = Array.isArray(studentData) ? studentData : [];
      setStudents(rows);
      initializeAttendance(rows);
    } catch (loadError) {
      setStudents([]);
      initializeAttendance([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load students.",
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadSessions = async (batchId: string, subject: string, date: string) => {
    if (!batchId) {
      setSessions([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (subject) {
        params.set("subject", subject);
      }
      if (date) {
        params.set("date", date);
      }

      const query = params.toString();
      const sessionData = await fetchJson<AttendanceSession[]>(
        `/api/attendance/batches/${batchId}/sessions${query ? `?${query}` : ""}`,
      );
      setSessions(Array.isArray(sessionData) ? sessionData : []);
    } catch (loadError) {
      setSessions([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load attendance sessions.",
      );
    }
  };

  const loadSessionRecords = async (session: AttendanceSession) => {
    setCurrentSession(session);
    setSuccess("");

    try {
      const records = await fetchJson<AttendanceRecord[]>(
        `/api/attendance/sessions/${session.id}/records`,
      );

      if (!Array.isArray(records) || records.length === 0) {
        initializeAttendance(students);
        return;
      }

      const nextAttendance = records.reduce<Record<number, AttendanceStatus>>(
        (map, record) => {
          map[record.student_id] = record.status;
          return map;
        },
        {},
      );

      setAttendance(nextAttendance);
    } catch (loadError) {
      initializeAttendance(students);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load session records.",
      );
    }
  };

  const loadAttendancePage = async () => {
    await loadDepartmentsAndSubjects();
    if (selectedDepartmentId) {
      await loadBatches(selectedDepartmentId);
    }
    if (selectedBatchId) {
      await Promise.all([
        loadStudents(selectedBatchId),
        loadSessions(selectedBatchId, selectedSubject, selectedDate),
      ]);
    }
  };

  useEffect(() => {
    void loadDepartmentsAndSubjects();
  }, []);

  useEffect(() => {
    setSelectedBatchId("");
    setCurrentSession(null);
    setStudents([]);
    setSessions([]);
    initializeAttendance([]);
    void loadBatches(selectedDepartmentId);
  }, [selectedDepartmentId]);

  useEffect(() => {
    setCurrentSession(null);
    void Promise.all([
      loadStudents(selectedBatchId),
      loadSessions(selectedBatchId, selectedSubject, selectedDate),
    ]);
  }, [selectedBatchId, selectedSubject, selectedDate]);

  const handleStartSession = async () => {
    if (!selectedBatchId || !selectedSubject || !selectedDate) {
      setError("Department, batch, subject, and date are required.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const createdSession = await fetchJson<AttendanceSession>(
        "/api/attendance/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            batchId: Number(selectedBatchId),
            subject: selectedSubject,
            topic: topic.trim(),
            sessionDate: selectedDate,
            startTime: new Date().toTimeString().slice(0, 5),
          }),
        },
      );

      setCurrentSession(createdSession);
      initializeAttendance(students);
      setSuccess("Attendance session started from the database.");
      await loadSessions(selectedBatchId, selectedSubject, selectedDate);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to start attendance session.",
      );
    }
  };

  const handleToggleAttendance = (studentId: number) => {
    if (!currentSession || currentSessionClosed) {
      return;
    }

    setAttendance((current) => ({
      ...current,
      [studentId]: cycleStatus(current[studentId] ?? "present"),
    }));
  };

  const handleSaveAttendance = async () => {
    if (!currentSession) {
      setError("Start or select a session before saving attendance.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await fetchJson<{ message: string }>(
        `/api/attendance/sessions/${currentSession.id}/mark`,
        {
          method: "POST",
          body: JSON.stringify({
            records: Object.entries(attendance).map(([studentId, status]) => ({
              studentId: Number(studentId),
              status,
            })),
          }),
        },
      );

      const closedSession = {
        ...currentSession,
        is_active: false,
      };
      setCurrentSession(closedSession);
      setSuccess("Attendance saved permanently to the database.");
      await loadSessions(selectedBatchId, selectedSubject, selectedDate);
      await loadSessionRecords(closedSession);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to save attendance.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FacultyLayout title="Attendance Management">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-accent">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Attendance Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Departments, batches, students, and saved sessions now come only from
                the database.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadAttendancePage()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-card rounded-2xl border border-border/50 p-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading attendance data from the database...
            </p>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-2xl border border-border/50 p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Department
                  </label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(event) => setSelectedDepartmentId(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.code} - {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Batch
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(event) => setSelectedBatchId(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!selectedDepartmentId}
                  >
                    <option value="">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} • Sem {batch.semester}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(event) => setSelectedSubject(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Topic
                  </label>
                  <Input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Optional topic"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Session Date
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={handleStartSession} disabled={!selectedBatchId}>
                  <Clock3 className="mr-2 h-4 w-4" />
                  Start Session
                </Button>
                <div className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  {selectedBatch
                    ? `${selectedBatch.name} • ${selectedBatch.department_code} • ${selectedBatch.academic_year}`
                    : "Select a batch to load students and sessions"}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="glass-card rounded-2xl border border-border/50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Saved Sessions
                  </h2>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No attendance sessions found for the selected filters.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => void loadSessionRecords(session)}
                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                          currentSession?.id === session.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 bg-background/60 hover:bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{session.subject}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] ${
                              session.is_active
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {session.is_active ? "Active" : "Closed"}
                          </span>
                        </div>
                        {session.topic ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Topic: {session.topic}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {session.session_date} • {session.start_time}
                          {session.end_time ? ` - ${session.end_time}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    {
                      label: "Present",
                      value: counts.present,
                      icon: CheckCircle2,
                      color: "text-emerald-600",
                    },
                    {
                      label: "Absent",
                      value: counts.absent,
                      icon: XCircle,
                      color: "text-rose-600",
                    },
                    {
                      label: "Late",
                      value: counts.late,
                      icon: Clock3,
                      color: "text-amber-600",
                    },
                    {
                      label: "Excused",
                      value: counts.excused,
                      icon: Shield,
                      color: "text-blue-600",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="glass-card rounded-2xl border border-border/50 p-5"
                    >
                      <div className={`mb-3 ${card.color}`}>
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
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {currentSession
                          ? `${currentSession.subject} Attendance`
                          : "Student Attendance"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {currentSession
                          ? currentSessionClosed
                            ? "This session is closed and shown in read-only mode."
                            : "Click a student row to cycle their attendance status."
                          : "Select or start a session to mark attendance."}
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveAttendance}
                      disabled={!currentSession || currentSessionClosed || saving}
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Attendance
                    </Button>
                  </div>

                  {loadingStudents ? (
                    <div className="py-10 text-center">
                      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Loading students...
                      </p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                      <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No students are mapped to this batch in the database yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {students.map((student) => {
                        const studentId = student.student_id ?? student.id;
                        const status = attendance[studentId] ?? "present";

                        return (
                          <button
                            key={studentId}
                            type="button"
                            onClick={() => handleToggleAttendance(studentId)}
                            disabled={!currentSession || currentSessionClosed}
                            className="flex w-full items-center justify-between rounded-2xl border border-border/50 bg-background/60 p-4 text-left transition-colors hover:bg-background disabled:cursor-default disabled:hover:bg-background/60"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {student.full_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {student.roll_number || student.email}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusBadgeClassName(
                                status,
                              )}`}
                            >
                              {status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyAttendance;
