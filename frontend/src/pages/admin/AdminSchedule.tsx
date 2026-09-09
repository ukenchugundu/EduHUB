import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Layers3,
  Loader2,
  PlusCircle,
  Users,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { requestJson as apiRequestJson } from "@/lib/apiClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Batch {
  id: number;
  name: string;
  semester: number;
  academic_year: string;
  department_name: string;
  department_code: string;
}

interface SubjectOption {
  id: number;
  name: string;
  code: string;
}

interface FacultyMember {
  id: number;
  fullName: string;
  rollNumber: string;
  department: string;
  designation: string;
  email: string;
}

interface FacultyMembersResponse {
  members: FacultyMember[];
}

interface TimetableEntry {
  id: number;
  faculty_id: number;
  faculty_name?: string | null;
  faculty_designation?: string | null;
  subject: string;
  topic?: string | null;
  room?: string | null;
  weekday: number;
  weekday_label?: string;
  start_time: string;
  end_time: string;
}

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

const TIMETABLE_SLOTS = [
  { id: "slot-1", label: "Period 1", startTime: "08:30", endTime: "09:30" },
  { id: "slot-2", label: "Period 2", startTime: "09:30", endTime: "10:30" },
  { id: "slot-3", label: "Period 3", startTime: "10:45", endTime: "11:45" },
  { id: "slot-4", label: "Period 4", startTime: "11:45", endTime: "12:45" },
  { id: "slot-5", label: "Period 5", startTime: "13:30", endTime: "14:30" },
  { id: "slot-6", label: "Period 6", startTime: "14:30", endTime: "15:30" },
];

const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    const token = authData ? (JSON.parse(authData).token as string | undefined) : undefined;
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
};

const requestJson = async <T,>(
  url: string,
  options?: RequestInit,
  fallbackError = "Request failed.",
): Promise<T> => {
  const token = getAuthToken();
  return apiRequestJson<T>(
    url,
    {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    },
    {
      fallbackError,
      retries: 1,
      timeoutMs: 8000,
      includeAuth: false,
    },
  );
};

const formatWeekday = (weekday?: number): string =>
  WEEKDAY_OPTIONS.find((option) => option.value === String(weekday))?.label ?? "Unknown";

const normalizeTimeValue = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.length === 5 ? `${value}:00` : value.slice(0, 8);
};

const getTimetableCellKey = (
  weekday: number | string,
  startTime?: string | null,
  endTime?: string | null,
): string => `${weekday}-${normalizeTimeValue(startTime)}-${normalizeTimeValue(endTime)}`;

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

const tableInputClassName =
  "w-full min-w-[120px] rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

const AdminSchedule = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [faculties, setFaculties] = useState<FacultyMember[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchSessions, setBatchSessions] = useState<TimetableEntry[]>([]);
  const [filters, setFilters] = useState({
    departmentId: "",
    academicYear: "",
    semester: "",
  });
  const [form, setForm] = useState({
    facultyId: "",
    batchId: "",
    subject: "",
    topic: "",
    room: "",
    weekday: "1",
    startTime: "",
    endTime: "",
  });
  const [selectedGridSlot, setSelectedGridSlot] = useState({
    weekday: WEEKDAY_OPTIONS[0].value,
    slotId: TIMETABLE_SLOTS[0].id,
  });
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [clearingTimetable, setClearingTimetable] = useState(false);
  const [autoGenerateQuery, setAutoGenerateQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedFaculties = useMemo(
    () => [...faculties].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [faculties],
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === form.batchId) ?? null,
    [batches, form.batchId],
  );

  const selectedSlotDefinition = useMemo(
    () => TIMETABLE_SLOTS.find((slot) => slot.id === selectedGridSlot.slotId) ?? TIMETABLE_SLOTS[0],
    [selectedGridSlot.slotId],
  );

  const selectedWeekdayLabel = useMemo(
    () => formatWeekday(Number(selectedGridSlot.weekday)),
    [selectedGridSlot.weekday],
  );

  const slotEntriesMap = useMemo(() => {
    const map = new Map<string, TimetableEntry>();

    batchSessions.forEach((session) => {
      const matchesGridSlot = TIMETABLE_SLOTS.some(
        (slot) =>
          normalizeTimeValue(slot.startTime) === normalizeTimeValue(session.start_time) &&
          normalizeTimeValue(slot.endTime) === normalizeTimeValue(session.end_time),
      );

      if (!matchesGridSlot) {
        return;
      }

      map.set(getTimetableCellKey(session.weekday, session.start_time, session.end_time), session);
    });

    return map;
  }, [batchSessions]);

  const selectedSlotEntry = useMemo(
    () =>
      slotEntriesMap.get(
        getTimetableCellKey(
          selectedGridSlot.weekday,
          selectedSlotDefinition.startTime,
          selectedSlotDefinition.endTime,
        ),
      ) ?? null,
    [selectedGridSlot.weekday, selectedSlotDefinition, slotEntriesMap],
  );

  const customEntries = useMemo(
    () =>
      batchSessions.filter(
        (session) =>
          !TIMETABLE_SLOTS.some(
            (slot) =>
              normalizeTimeValue(slot.startTime) === normalizeTimeValue(session.start_time) &&
              normalizeTimeValue(slot.endTime) === normalizeTimeValue(session.end_time),
          ),
      ),
    [batchSessions],
  );

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoadingReferences(true);
        setErrorMessage(null);
        const [departmentData, academicYearData, subjectData, facultyData] =
          await Promise.all([
            requestJson<Department[]>(
              `${API_BASE}/api/attendance/departments`,
              undefined,
              "Failed to load departments.",
            ),
            requestJson<string[]>(
              `${API_BASE}/api/attendance/academic-years`,
              undefined,
              "Failed to load academic years.",
            ),
            requestJson<SubjectOption[]>(
              `${API_BASE}/api/attendance/subjects`,
              undefined,
              "Failed to load subjects.",
            ),
            requestJson<FacultyMembersResponse>(
              `${API_BASE}/api/admin/members?role=faculty`,
              undefined,
              "Failed to load faculty list.",
            ),
          ]);

        setDepartments(departmentData);
        setAcademicYears(academicYearData);
        setSubjects(subjectData);
        setFaculties(facultyData.members ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load schedule references.",
        );
      } finally {
        setLoadingReferences(false);
      }
    };

    void loadReferenceData();
  }, []);

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setLoadingBatches(true);
        const params = new URLSearchParams();
        if (filters.departmentId) {
          params.set("departmentId", filters.departmentId);
        }
        if (filters.academicYear) {
          params.set("academicYear", filters.academicYear);
        }
        if (filters.semester) {
          params.set("semester", filters.semester);
        }

        const queryString = params.toString();
        const data = await requestJson<Batch[]>(
          `${API_BASE}/api/attendance/batches${queryString ? `?${queryString}` : ""}`,
          undefined,
          "Failed to load batches.",
        );

        setBatches(data);
        setForm((previous) => {
          if (!previous.batchId) {
            return previous;
          }

          const exists = data.some((batch) => String(batch.id) === previous.batchId);
          return exists ? previous : { ...previous, batchId: "" };
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load batches.",
        );
      } finally {
        setLoadingBatches(false);
      }
    };

    void loadBatches();
  }, [filters.departmentId, filters.academicYear, filters.semester]);

  const fetchBatchSessions = async (batchId: string) => {
    if (!batchId) {
      setBatchSessions([]);
      return;
    }

    try {
      setLoadingSessions(true);
      const data = await requestJson<TimetableEntry[]>(
        `${API_BASE}/api/timetable/batches/${batchId}/entries`,
        undefined,
        "Failed to load batch timetable.",
      );
      setBatchSessions(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load batch timetable.",
      );
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    void fetchBatchSessions(form.batchId);
  }, [form.batchId]);

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      weekday: selectedGridSlot.weekday,
      startTime: selectedSlotDefinition.startTime,
      endTime: selectedSlotDefinition.endTime,
    }));
  }, [selectedGridSlot.weekday, selectedSlotDefinition.endTime, selectedSlotDefinition.startTime]);

  useEffect(() => {
    if (selectedSlotEntry) {
      setForm((previous) => ({
        ...previous,
        facultyId: String(selectedSlotEntry.faculty_id ?? ""),
        subject: selectedSlotEntry.subject ?? "",
        topic: selectedSlotEntry.topic ?? "",
        room: selectedSlotEntry.room ?? "",
      }));
      return;
    }

    setForm((previous) => ({
      ...previous,
      facultyId: "",
      subject: "",
      topic: "",
      room: "",
    }));
  }, [selectedGridSlot.slotId, selectedGridSlot.weekday, selectedSlotEntry]);

  const handleCreateSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.facultyId || !form.batchId || !form.subject.trim() || !form.weekday || !form.startTime || !form.endTime) {
      setErrorMessage(
        "Faculty, batch, subject, weekday, start time, and end time are required.",
      );
      return;
    }

    if (form.endTime <= form.startTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    try {
      setSubmitting(true);
      await requestJson<TimetableEntry>(
        `${API_BASE}/api/timetable/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facultyId: Number(form.facultyId),
            batchId: Number(form.batchId),
            subject: form.subject.trim(),
            topic: form.topic.trim(),
            room: form.room.trim(),
            weekday: Number(form.weekday),
            startTime: form.startTime,
            endTime: form.endTime,
          }),
        },
        "Failed to create timetable entry.",
      );

      setSuccessMessage(
        "Timetable slot created and shared with the selected class. Faculty and students will now see it in their timetable.",
      );

      const refreshedSessions = await requestJson<TimetableEntry[]>(
        `${API_BASE}/api/timetable/batches/${form.batchId}/entries`,
        undefined,
        "Failed to refresh batch timetable.",
      );
      setBatchSessions(refreshedSessions);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create timetable entry.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearTimetable = async () => {
    if (!form.batchId) {
      return;
    }

    if (
      !window.confirm(
        "This will remove all timetable entries for the selected class. Continue?",
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setClearingTimetable(true);
      await requestJson<void>(
        `${API_BASE}/api/timetable/batches/${form.batchId}/entries`,
        {
          method: "DELETE",
        },
        "Failed to clear timetable.",
      );
      setSuccessMessage(
        "Existing timetable entries cleared. You can now auto-generate a new schedule or build it manually.",
      );
      setBatchSessions([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to clear timetable.",
      );
    } finally {
      setClearingTimetable(false);
    }
  };

  const handleAutoGenerateTimetable = async () => {
    if (!form.batchId) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setAutoGenerating(true);
      const generatedSessions = await requestJson<TimetableEntry[]>(
        `${API_BASE}/api/timetable/batches/${form.batchId}/auto-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: autoGenerateQuery,
            clearExisting: true,
          }),
        },
        "Failed to auto-generate timetable.",
      );
      setSuccessMessage(
        "Timetable auto-generated. Review the timetable preview and adjust slots as needed.",
      );
      setBatchSessions(generatedSessions);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to auto-generate timetable.",
      );
    } finally {
      setAutoGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Admin Timetable Control
            </p>
            <h1 className="mt-2 text-3xl font-heading font-bold text-foreground">
              Create Timetable
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
              Create weekly timetable entries for each batch. Faculty and student
              schedules will update daily from this timetable table.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            Weekly timetable sync is enabled
          </div>
        </div>

        {(errorMessage || successMessage) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              errorMessage
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Faculty", value: sortedFaculties.length, icon: Users },
            { label: "Departments", value: departments.length, icon: GraduationCap },
            { label: "Batches", value: batches.length, icon: Layers3 },
            { label: "Subjects", value: subjects.length, icon: BookOpen },
          ].map((item) => (
            <div key={item.label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
                </div>
                <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-secondary p-3 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Filter and Choose Class</h2>
              <p className="text-sm text-muted-foreground">
                Select the class first, then build the weekly timetable in a timetable grid.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Department</span>
              <select
                value={filters.departmentId}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    departmentId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Academic Year</span>
              <select
                value={filters.academicYear}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    academicYear: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              >
                <option value="">All academic years</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Semester</span>
              <input
                type="number"
                min="1"
                max="12"
                value={filters.semester}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    semester: event.target.value,
                  }))
                }
                placeholder="e.g. 5"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Class / Batch</span>
              <select
                value={form.batchId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, batchId: event.target.value }))
                }
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                disabled={loadingBatches}
              >
                <option value="">Select batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} • {batch.department_code} • Sem {batch.semester}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedBatch && (
            <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
              Selected class: <span className="font-medium text-foreground">{selectedBatch.name}</span>
              {` • ${selectedBatch.department_name} • ${selectedBatch.academic_year}`}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Weekly Timetable Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedBatch
                    ? `Click any timetable cell to create or inspect a slot for ${selectedBatch.name}.`
                    : "Select a class, then click a timetable cell to build the weekly view."}
                </p>
              </div>
              {(loadingBatches || loadingSessions) && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Auto-generate timetable</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tell EduHub how you’d like the weekly schedule laid out. The existing timetable entries will be cleared before generating.
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={handleClearTimetable}
                    disabled={
                      !form.batchId || clearingTimetable || loadingSessions || loadingBatches
                    }
                    className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {clearingTimetable ? "Clearing..." : "Clear timetable"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoGenerateTimetable}
                    disabled={
                      !form.batchId || autoGenerating || clearingTimetable || loadingSessions || loadingBatches
                    }
                    className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {autoGenerating ? "Generating..." : "Generate timetable"}
                  </button>
                </div>
              </div>

              <label className="mt-4 block text-sm">
                <span className="text-muted-foreground">Generation prompt (optional)</span>
                <textarea
                  rows={3}
                  value={autoGenerateQuery}
                  onChange={(event) => setAutoGenerateQuery(event.target.value)}
                  placeholder="e.g. Spread required topics evenly across the week, avoid repeating faculty in the same day"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  disabled={!form.batchId || clearingTimetable || autoGenerating}
                />
              </label>
            </div>

            {loadingReferences ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Weekday</TableHead>
                      {TIMETABLE_SLOTS.map((slot) => (
                        <TableHead key={slot.id} className="min-w-[150px]">
                          <div className="space-y-1">
                            <p>{slot.label}</p>
                            <p className="text-xs font-normal text-muted-foreground">
                              {slot.startTime} - {slot.endTime}
                            </p>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEEKDAY_OPTIONS.map((weekday) => (
                      <TableRow key={weekday.value}>
                        <TableCell className="font-semibold text-foreground">
                          {weekday.label}
                        </TableCell>
                        {TIMETABLE_SLOTS.map((slot) => {
                          const entry = slotEntriesMap.get(
                            getTimetableCellKey(weekday.value, slot.startTime, slot.endTime),
                          );
                          const isSelected =
                            selectedGridSlot.weekday === weekday.value &&
                            selectedGridSlot.slotId === slot.id;

                          return (
                            <TableCell key={`${weekday.value}-${slot.id}`} className="p-2 align-top">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedGridSlot({ weekday: weekday.value, slotId: slot.id })
                                }
                                className={`min-h-[112px] w-full rounded-2xl border p-3 text-left transition ${
                                  isSelected
                                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                                    : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-secondary/40"
                                }`}
                              >
                                {entry ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-foreground">
                                      {entry.subject}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.faculty_name || "Assigned faculty"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.room || entry.topic || "Timetable slot saved"}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-primary">Add slot</p>
                                    <p className="text-xs text-muted-foreground">
                                      {selectedBatch
                                        ? "Choose subject and faculty for this cell"
                                        : "Select a class to start building the timetable"}
                                    </p>
                                  </div>
                                )}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                  Saving a timetable slot here automatically sends it to the selected class timetable,
                  and the linked faculty/student schedules will update from it.
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <form onSubmit={handleCreateSchedule} className="glass-card rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Selected Slot Editor</h2>
                  <p className="text-sm text-muted-foreground">
                    Fill this slot and save it into the weekly timetable preview.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Active timetable cell
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {selectedWeekdayLabel} • {selectedSlotDefinition.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedSlotDefinition.startTime} - {selectedSlotDefinition.endTime}
                  {selectedBatch ? ` • ${selectedBatch.name}` : " • Select a class / batch first"}
                </p>
              </div>

              {selectedSlotEntry && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  This timetable cell is already saved. Select an empty cell to create a new slot.
                </div>
              )}

              <div className="mt-5 space-y-4">
                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Faculty</span>
                  <select
                    aria-label="Faculty"
                    value={form.facultyId}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, facultyId: event.target.value }))
                    }
                    className={tableInputClassName}
                    disabled={loadingReferences || !!selectedSlotEntry}
                  >
                    <option value="">Select faculty</option>
                    {sortedFaculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.fullName}
                        {faculty.rollNumber ? ` • ${faculty.rollNumber}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Subject</span>
                  <>
                    <input
                      aria-label="Subject"
                      list="admin-schedule-subjects"
                      value={form.subject}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, subject: event.target.value }))
                      }
                      placeholder="Choose or type the subject"
                      className={tableInputClassName}
                      disabled={!!selectedSlotEntry}
                    />
                    <datalist id="admin-schedule-subjects">
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.name}>
                          {subject.code}
                        </option>
                      ))}
                    </datalist>
                  </>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Topic</span>
                  <input
                    aria-label="Topic"
                    value={form.topic}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, topic: event.target.value }))
                    }
                    placeholder="Optional topic"
                    className={tableInputClassName}
                    disabled={!!selectedSlotEntry}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Room</span>
                  <input
                    aria-label="Room"
                    value={form.room}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, room: event.target.value }))
                    }
                    placeholder="Room / lab"
                    className={tableInputClassName}
                    disabled={!!selectedSlotEntry}
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || loadingReferences || !form.batchId || !!selectedSlotEntry}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  Save & send slot
                </button>
                <span className="text-sm text-muted-foreground">
                  {form.batchId
                    ? "This slot will be published into the selected class timetable."
                    : "Select a class before saving the timetable slot."}
                </span>
              </div>
            </form>

            {customEntries.length > 0 && (
              <div className="glass-card rounded-3xl p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Custom Time Entries</h3>
                  <p className="text-sm text-muted-foreground">
                    These saved timetable rows use custom times, so they are listed separately from the weekly grid.
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Weekday</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Subject</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customEntries.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.weekday_label || formatWeekday(session.weekday)}</TableCell>
                        <TableCell>
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </TableCell>
                        <TableCell>{session.subject}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSchedule;
