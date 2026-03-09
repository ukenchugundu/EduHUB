import { useState, useEffect, useRef } from "react";
import FacultyLayout from "@/components/FacultyLayout";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  Clock,
  Calendar,
  Users,
  BookOpen,
  Loader2,
  Pencil,
  Shield,
} from "lucide-react";

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

const DEPARTMENTS: Department[] = [
  { id: 1, name: "Computer Science and Engineering", code: "CSE" },
  { id: 2, name: "Computer Science and Design", code: "CSD" },
  { id: 3, name: "Computer Science and Mathematics", code: "CSM" },
  { id: 4, name: "Computer Science and Communication", code: "CSC" },
  { id: 5, name: "Electronics and Communication Engineering", code: "ECE" },
  { id: 6, name: "Information Technology", code: "IT" },
  { id: 7, name: "Mechanical Engineering", code: "MECH" },
  { id: 8, name: "Civil Engineering", code: "CIVIL" },
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

const SUBJECTS: Subject[] = [
  { id: 1, name: "Data Structures and Algorithms", code: "DSA" },
  { id: 2, name: "Database Management Systems", code: "DBMS" },
  { id: 3, name: "Operating Systems", code: "OS" },
  { id: 4, name: "Computer Networks", code: "CN" },
  { id: 5, name: "Software Engineering", code: "SE" },
  { id: 6, name: "Machine Learning", code: "ML" },
  { id: 7, name: "Artificial Intelligence", code: "AI" },
  { id: 8, name: "Web Development", code: "WD" },
  { id: 9, name: "Mobile App Development", code: "MAD" },
  { id: 10, name: "Cybersecurity", code: "CS" },
];

const generateAcademicYear = (year: string): string => {
  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(year.charAt(0));
  const startYear = currentYear - yearNum + 1;
  return `${startYear}-${startYear + 1}`;
};

const generateBatches = (deptCode: string, year: string): Batch[] => {
  const academicYear = generateAcademicYear(year);
  return SECTIONS.map((section, index) => ({
    id: parseInt(
      `${DEPARTMENTS.find((d) => d.code === deptCode)?.id || 1}${year.charAt(0)}${index + 1}`,
    ),
    name: `${year} ${section}`,
    department_name: DEPARTMENTS.find((d) => d.code === deptCode)?.name || "",
    department_code: deptCode,
    academic_year: academicYear,
    semester: parseInt(year.charAt(0)) * 2 - 1,
  }));
};

const fetchBatchStudents = async (batchId: number): Promise<Student[]> => {
  const mockStudents: Student[] = [
    {
      id: 1,
      full_name: "Aarav Sharma",
      email: "aarav@example.com",
      roll_number: "21CSE001",
    },
    {
      id: 2,
      full_name: "Vivaan Patel",
      email: "vivaan@example.com",
      roll_number: "21CSE002",
    },
    {
      id: 3,
      full_name: "Aditya Kumar",
      email: "aditya@example.com",
      roll_number: "21CSE003",
    },
    {
      id: 4,
      full_name: "Vihaan Singh",
      email: "vihaan@example.com",
      roll_number: "21CSE004",
    },
    {
      id: 5,
      full_name: "Arjun Gupta",
      email: "arjun@example.com",
      roll_number: "21CSE005",
    },
    {
      id: 6,
      full_name: "Sai Reddy",
      email: "sai@example.com",
      roll_number: "21CSE006",
    },
    {
      id: 7,
      full_name: "Reyansh Jain",
      email: "reyansh@example.com",
      roll_number: "21CSE007",
    },
    {
      id: 8,
      full_name: "Ayaan Khan",
      email: "ayaan@example.com",
      roll_number: "21CSE008",
    },
    {
      id: 9,
      full_name: "Krishna Rao",
      email: "krishna@example.com",
      roll_number: "21CSE009",
    },
    {
      id: 10,
      full_name: "Ishaan Verma",
      email: "ishaan@example.com",
      roll_number: "21CSE010",
    },
  ];
  return Promise.resolve(mockStudents);
};

const fetchSessions = async (
  batchId: number,
  date?: string,
  subject?: string,
): Promise<AttendanceSession[]> => {
  const allSessions: AttendanceSession[] = JSON.parse(
    localStorage.getItem("attendance_sessions") || "[]",
  );
  let filtered = allSessions.filter((s) => s.batch_id === batchId);
  if (date) filtered = filtered.filter((s) => s.session_date === date);
  if (subject) filtered = filtered.filter((s) => s.subject === subject);
  return Promise.resolve(filtered);
};

const createSession = async (
  batchId: number,
  subject: string,
  topic: string,
  sessionDate: string,
  startTime: string,
): Promise<AttendanceSession> => {
  const allSessions: AttendanceSession[] = JSON.parse(
    localStorage.getItem("attendance_sessions") || "[]",
  );
  const mockSession: AttendanceSession = {
    id: Date.now(),
    batch_id: batchId,
    faculty_id: 1,
    subject,
    topic: topic || null,
    session_date: sessionDate,
    start_time: startTime,
    end_time: null,
    is_active: true,
    batch_name: "Mock Batch",
    department_name: "Mock Department",
  };
  allSessions.push(mockSession);
  localStorage.setItem("attendance_sessions", JSON.stringify(allSessions));
  return Promise.resolve(mockSession);
};

const markAttendance = async (
  sessionId: number,
  records: { studentId: number; status: string }[],
): Promise<void> => {
  const allRecords = JSON.parse(
    localStorage.getItem("attendance_records") || "{}",
  );
  allRecords[sessionId] = records;
  localStorage.setItem("attendance_records", JSON.stringify(allRecords));

  const allSessions: AttendanceSession[] = JSON.parse(
    localStorage.getItem("attendance_sessions") || "[]",
  );
  const updatedSessions = allSessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          is_active: false,
          end_time: new Date().toTimeString().slice(0, 5),
        }
      : s,
  );
  localStorage.setItem("attendance_sessions", JSON.stringify(updatedSessions));
  return Promise.resolve();
};

const FacultyAttendance = () => {
  const [departments] = useState<Department[]>(DEPARTMENTS);
  const [subjects] = useState<Subject[]>(SUBJECTS);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [localTopic, setLocalTopic] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [attendanceHistory, setAttendanceHistory] = useState<
    Record<number, string>[]
  >([]);
  const [currentSession, setCurrentSession] =
    useState<AttendanceSession | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingPastSession, setViewingPastSession] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingDepartments] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    const updateDate = () => {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDepartment && selectedYearLevel && selectedSection) {
      const batch = generateBatches(
        selectedDepartment.code,
        selectedYearLevel,
      ).find((b) => b.name === `${selectedYearLevel} ${selectedSection}`);
      setSelectedBatch(batch || null);
    }
  }, [selectedDepartment, selectedYearLevel, selectedSection]);

  useEffect(() => {
    if (selectedBatch && selectedSubject) {
      loadStudents(selectedBatch.id);
      loadSessions(selectedBatch.id);
    } else {
      setStudents([]);
      setAttendance({});
      setAttendanceHistory([]);
    }
  }, [selectedBatch, selectedSubject, selectedDate]);

  useEffect(() => {
    if (!selectedDepartment) setCurrentStep(1);
    else if (!selectedYearLevel) setCurrentStep(2);
    else if (!selectedSection) setCurrentStep(3);
    else if (!selectedSubject) setCurrentStep(4);
    else if (!selectedTopic) setCurrentStep(5);
    else if (currentStep < 6) setCurrentStep(6);
  }, [
    selectedDepartment,
    selectedYearLevel,
    selectedSection,
    selectedSubject,
    selectedTopic,
  ]);

  const loadStudents = async (batchId: number) => {
    setLoadingStudents(true);
    try {
      const data = await fetchBatchStudents(batchId);
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadSessions = async (batchId: number) => {
    try {
      const data = await fetchSessions(
        batchId,
        selectedDate,
        selectedSubject || undefined,
      );
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const handleViewSession = async (session: AttendanceSession) => {
    setCurrentSession(session);
    setViewingPastSession(!session.is_active);
    setShowSummary(!session.is_active);

    const allRecords = JSON.parse(
      localStorage.getItem("attendance_records") || "{}",
    );
    const sessionRecords = allRecords[session.id] || [];

    if (sessionRecords.length > 0) {
      const attendanceMap: Record<number, string> = {};
      sessionRecords.forEach(
        (record: { studentId: number; status: string }) => {
          attendanceMap[record.studentId] = record.status;
        },
      );
      setAttendance(attendanceMap);
    } else {
      const initialAttendance: Record<number, string> = {};
      students.forEach((student) => {
        initialAttendance[student.id] = "present";
      });
      setAttendance(initialAttendance);
    }
  };

  const handleStartSession = async (date?: string) => {
    const targetDate = date || selectedDate;
    if (!selectedBatch || !selectedSubject || !targetDate) {
      setError("Please select all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = new Date().toTimeString().slice(0, 5);
      const session = await createSession(
        selectedBatch.id,
        selectedSubject,
        selectedTopic,
        targetDate,
        startTime,
      );
      setCurrentSession(session);
      setSuccess("Attendance session started!");

      const initialAttendance: Record<number, string> = {};
      students.forEach((student) => {
        initialAttendance[student.id] = "present";
      });
      setAttendance(initialAttendance);

      loadSessions(selectedBatch.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (studentId: number) => {
    if (viewingPastSession) return;
    setAttendanceHistory((prev) => [...prev, { ...attendance }]);
    setAttendance((prev) => {
      const currentStatus = prev[studentId] || "present";
      const statusOrder: string[] = ["present", "absent", "late", "permission"];
      const currentIndex = statusOrder.indexOf(currentStatus);
      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
      return { ...prev, [studentId]: nextStatus };
    });
  };

  const handleUndoLastChange = () => {
    if (attendanceHistory.length > 0) {
      const lastState = attendanceHistory[attendanceHistory.length - 1];
      setAttendance(lastState);
      setAttendanceHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleSaveAttendance = async () => {
    if (!currentSession) {
      setError("Please start a session first");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status,
      }));
      await markAttendance(currentSession.id, records);
      setShowSummary(true);
      setShowSuccessPopup(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save attendance",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetSteps = () => {
    setSelectedDepartment(null);
    setSelectedYearLevel("");
    setSelectedSection("");
    setSelectedBatch(null);
    setSelectedSubject("");
    setSelectedTopic("");
    setLocalTopic("");
    setStudents([]);
    setAttendance({});
    setAttendanceHistory([]);
    setSessions([]);
    setCurrentSession(null);
    setCurrentStep(1);
    setError(null);
    setSuccess(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "text-accent";
      case "absent":
        return "text-destructive";
      case "late":
        return "text-yellow-500";
      case "permission":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "present":
        return "bg-accent/10 border-accent/30";
      case "absent":
        return "bg-destructive/10 border-destructive/30";
      case "late":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "permission":
        return "bg-blue-500/10 border-blue-500/30";
      default:
        return "bg-secondary";
    }
  };

  const presentCount = Object.values(attendance).filter(
    (s) => s === "present",
  ).length;
  const absentCount = Object.values(attendance).filter(
    (s) => s === "absent",
  ).length;
  const lateCount = Object.values(attendance).filter(
    (s) => s === "late",
  ).length;
  const permissionCount = Object.values(attendance).filter(
    (s) => s === "permission",
  ).length;

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Select Department";
      case 2:
        return "Select Year";
      case 3:
        return "Select Section";
      case 4:
        return "Select Subject";
      case 5:
        return "Enter Topic & Date";
      case 6:
        return "Mark Attendance";
      default:
        return "";
    }
  };

  return (
    <FacultyLayout title="Attendance Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Attendance Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Mark and track student attendance efficiently
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-xl">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button
            onClick={() =>
              currentSession &&
              students.length > 0 &&
              setSelectedFilter(selectedFilter === "present" ? null : "present")
            }
            className={`glass-card rounded-2xl p-4 hover:shadow-lg transition-all ${currentSession && students.length > 0 ? "cursor-pointer" : "cursor-default"} ${selectedFilter === "present" ? "ring-2 ring-green-500/30 bg-green-500/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {presentCount}
                </div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
            </div>
          </button>
          <button
            onClick={() =>
              currentSession &&
              students.length > 0 &&
              setSelectedFilter(selectedFilter === "absent" ? null : "absent")
            }
            className={`glass-card rounded-2xl p-4 hover:shadow-lg transition-all ${currentSession && students.length > 0 ? "cursor-pointer" : "cursor-default"} ${selectedFilter === "absent" ? "ring-2 ring-red-500/30 bg-red-500/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {absentCount}
                </div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </div>
            </div>
          </button>
          <button
            onClick={() =>
              currentSession &&
              students.length > 0 &&
              setSelectedFilter(selectedFilter === "late" ? null : "late")
            }
            className={`glass-card rounded-2xl p-4 hover:shadow-lg transition-all ${currentSession && students.length > 0 ? "cursor-pointer" : "cursor-default"} ${selectedFilter === "late" ? "ring-2 ring-yellow-500/30 bg-yellow-500/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {lateCount}
                </div>
                <div className="text-xs text-muted-foreground">Late</div>
              </div>
            </div>
          </button>
          <button
            onClick={() =>
              currentSession &&
              students.length > 0 &&
              setSelectedFilter(
                selectedFilter === "permission" ? null : "permission",
              )
            }
            className={`glass-card rounded-2xl p-4 hover:shadow-lg transition-all ${currentSession && students.length > 0 ? "cursor-pointer" : "cursor-default"} ${selectedFilter === "permission" ? "ring-2 ring-blue-500/30 bg-blue-500/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {permissionCount}
                </div>
                <div className="text-xs text-muted-foreground">Permission</div>
              </div>
            </div>
          </button>
          <button
            onClick={() =>
              currentSession &&
              students.length > 0 &&
              setSelectedFilter(selectedFilter === "all" ? null : "all")
            }
            className={`glass-card rounded-2xl p-4 hover:shadow-lg transition-all ${currentSession && students.length > 0 ? "cursor-pointer" : "cursor-default"} ${selectedFilter === "all" ? "ring-2 ring-purple-500/30 bg-purple-500/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {students.length}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
            <p className="text-sm text-accent">{success}</p>
          </div>
        )}

        {/* Progress Steps */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Attendance Setup Process
            </h2>
            <button
              onClick={handleResetSteps}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reset Steps
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${
                    currentStep >= step
                      ? "gradient-accent text-white shadow-lg"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {currentStep > step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                {step < 6 && (
                  <div
                    className={`flex-1 h-2 mx-3 rounded-full transition-all ${currentStep > step ? "bg-gradient-to-r from-accent to-primary" : "bg-secondary"}`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-2 text-center">
            {[
              { step: 1, title: "Department", desc: "Select department" },
              { step: 2, title: "Year", desc: "Choose year" },
              { step: 3, title: "Section", desc: "Pick section" },
              { step: 4, title: "Subject", desc: "Select subject" },
              { step: 5, title: "Topic & Date", desc: "Enter details" },
              { step: 6, title: "Attendance", desc: "Mark students" },
            ].map((item) => (
              <div
                key={item.step}
                className={`transition-all ${currentStep >= item.step ? "opacity-100" : "opacity-50"}`}
              >
                <h3 className="font-medium text-foreground text-sm">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Selection Form */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center text-white text-sm font-bold">
              {currentStep}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {getStepTitle(currentStep)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Complete this step to continue
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Department Selection */}
            <div
              className={`space-y-3 transition-all duration-300 ${currentStep === 1 ? "ring-2 ring-primary/20 rounded-xl p-4 bg-primary/5" : currentStep > 1 ? "opacity-100" : "opacity-50 pointer-events-none"}`}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="w-4 h-4" /> Department
                {selectedDepartment && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </label>
              <select
                value={selectedDepartment?.id || ""}
                onChange={(e) => {
                  const dept = departments.find(
                    (d) => d.id === parseInt(e.target.value),
                  );
                  setSelectedDepartment(dept || null);
                  setSelectedYearLevel("");
                  setSelectedSection("");
                  setSelectedBatch(null);
                  setStudents([]);
                }}
                disabled={loadingDepartments || currentStep !== 1}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
              >
                <option value="">Choose Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selection */}
            <div
              className={`space-y-3 transition-all duration-300 ${currentStep === 2 ? "ring-2 ring-primary/20 rounded-xl p-4 bg-primary/5" : currentStep > 2 ? "opacity-100" : "opacity-50 pointer-events-none"}`}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="w-4 h-4" /> Academic Year
                {selectedYearLevel && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </label>
              <select
                value={selectedYearLevel}
                onChange={(e) => {
                  setSelectedYearLevel(e.target.value);
                  setSelectedSection("");
                  setSelectedBatch(null);
                }}
                disabled={!selectedDepartment || currentStep !== 2}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
              >
                <option value="">Choose Year Level</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div
              className={`space-y-3 transition-all duration-300 ${currentStep === 3 ? "ring-2 ring-primary/20 rounded-xl p-4 bg-primary/5" : currentStep > 3 ? "opacity-100" : "opacity-50 pointer-events-none"}`}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookOpen className="w-4 h-4" /> Section
                {selectedSection && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setStudents([]);
                  setAttendance({});
                  setAttendanceHistory([]);
                  setCurrentSession(null);
                }}
                disabled={!selectedYearLevel || currentStep !== 3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
              >
                <option value="">Choose Section</option>
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    Section {section}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div
              className={`space-y-3 transition-all duration-300 ${currentStep === 4 ? "ring-2 ring-primary/20 rounded-xl p-4 bg-primary/5" : currentStep > 4 ? "opacity-100" : "opacity-50 pointer-events-none"}`}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookOpen className="w-4 h-4" /> Subject
                {selectedSubject && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setCurrentSession(null);
                }}
                disabled={!selectedSection || currentStep !== 4}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
              >
                <option value="">Choose Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Selection */}
            <div
              className={`space-y-3 transition-all duration-300 ${currentStep === 5 ? "ring-2 ring-primary/20 rounded-xl p-4 bg-primary/5" : currentStep > 5 ? "opacity-100" : "opacity-50 pointer-events-none"}`}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Pencil className="w-4 h-4" /> Topic Name
                {selectedTopic && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localTopic}
                  onChange={(e) => setLocalTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && localTopic.trim()) {
                      setSelectedTopic(localTopic.trim());
                    }
                  }}
                  placeholder="Enter topic name..."
                  disabled={!selectedSubject || currentStep !== 5}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
                />
                {currentStep === 5 && (
                  <button
                    onClick={() =>
                      localTopic.trim() && setSelectedTopic(localTopic.trim())
                    }
                    disabled={!localTopic.trim()}
                    className="px-4 py-2 rounded-xl gradient-accent text-white text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                {currentStep > 5 && (
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Topic"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Selection & Start Button */}
            <div
              className={`space-y-3 transition-all duration-300 ${currentStep === 5 && selectedTopic ? "ring-2 ring-primary/20 rounded-xl p-4 bg-primary/5" : currentStep > 5 ? "opacity-100" : "hidden"}`}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="w-4 h-4" /> Date
                {selectedDate && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={currentStep !== 5}
                  className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
                />
              </div>
            </div>
          </div>

          {currentStep === 5 && selectedTopic && (
            <div className="mt-6 pt-6 border-t border-border/50 flex justify-center">
              <button
                onClick={() => handleStartSession(selectedDate)}
                disabled={!selectedDate || loading}
                className="w-full md:w-auto min-w-[240px] px-8 py-4 rounded-2xl gradient-accent text-white font-bold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Clock className="w-6 h-6" />
                )}
                Start {selectedSubject} Attendance
              </button>
            </div>
          )}
        </div>

        {/* Today's Sessions */}
        {sessions.length > 0 && (
          <div className="glass-card rounded-2xl p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" /> Today's Sessions
            </h3>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleViewSession(session)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${currentSession?.id === session.id ? "bg-accent/10 border-accent" : "bg-secondary/30 border-transparent hover:bg-secondary/50"}`}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {session.subject}
                    </p>
                    {session.topic && (
                      <p className="text-xs text-accent font-medium mb-1">
                        Topic: {session.topic}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {session.start_time}{" "}
                      {session.end_time ? `- ${session.end_time}` : ""}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${session.is_active ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}
                  >
                    {session.is_active ? "Active" : "Closed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance List */}
        {currentSession && students.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {viewingPastSession
                    ? `Past Record - ${currentSession.subject}`
                    : showSummary
                      ? "Summary"
                      : `Mark Attendance - ${selectedSubject}`}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />{" "}
                  {presentCount} P
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-500" /> {absentCount} A
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-yellow-500" /> {lateCount} L
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-blue-500" /> {permissionCount}{" "}
                  Per
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {students
                .filter(
                  (student) =>
                    !selectedFilter ||
                    selectedFilter === "all" ||
                    attendance[student.id] === selectedFilter,
                )
                .map((student) => (
                  <div
                    key={student.id}
                    onClick={() =>
                      !showSummary &&
                      !viewingPastSession &&
                      handleToggleAttendance(student.id)
                    }
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${!showSummary && !viewingPastSession ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"} ${getStatusBg(attendance[student.id] || "present")}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                        {student.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {student.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.roll_number || student.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${getStatusColor(attendance[student.id] || "present")}`}
                    >
                      {(attendance[student.id] || "present")
                        .charAt(0)
                        .toUpperCase() +
                        (attendance[student.id] || "present").slice(1)}
                    </span>
                  </div>
                ))}
            </div>

            {!showSummary && !viewingPastSession && (
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={handleUndoLastChange}
                  disabled={attendanceHistory.length === 0}
                  className="px-4 py-2 rounded-xl border border-orange-500/70 text-orange-600 hover:bg-orange-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" /> Undo
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAttendanceHistory((prev) => [
                        ...prev,
                        { ...attendance },
                      ]);
                      const newAttendance: Record<number, string> = {};
                      students.forEach(
                        (s) => (newAttendance[s.id] = "present"),
                      );
                      setAttendance(newAttendance);
                    }}
                    className="px-4 py-2 rounded-xl border border-border/70 text-foreground hover:bg-secondary transition-colors text-sm flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Reset All
                  </button>
                  <button
                    onClick={handleSaveAttendance}
                    disabled={saving}
                    className="px-6 py-2 rounded-xl gradient-accent text-white font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Attendance
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loadingStudents && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading students...</p>
          </div>
        )}

        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowSuccessPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">
                Attendance for {selectedSubject} has been saved.
              </p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyAttendance;
