import StudentLayout from "@/components/StudentLayout";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Calendar,
  Zap,
  ArrowLeft,
  User,
  Monitor,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

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

const getAuthUser = () => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.user || null;
    }
    return null;
  } catch {
    return null;
  }
};

interface ScheduledClass {
  id: number;
  subject: string;
  topic?: string;
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

interface AttendanceRecord {
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  lastAttended: string;
  logs: AttendanceLog[];
}

interface AttendanceLog {
  date: string;
  status: "present" | "absent" | "late" | "excused";
  topic?: string;
}

interface Subject {
  code: string;
  name: string;
  credits: number;
  grade: string;
  points: number;
}

interface CGPARecord {
  year: string;
  semester: string;
  cgpa: number;
  subjects: Subject[];
  startDate: string;
  endDate: string;
}

interface SubjectMarkSummary {
  assessments: Array<{
    name: string;
    maxMarks: number;
    scoredMarks: number;
  }>;
  totalMaxMarks: number;
  totalScoredMarks: number;
}

// Helper to get user name
const getUserName = (): string => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.user?.fullName || "Student";
    }
    return "Student";
  } catch {
    return "Student";
  }
};

const StudentDashboard = () => {
  const [selectedView, setSelectedView] = useState<
    | "dashboard"
    | "attendance"
    | "cgpa"
    | "tasks"
    | "risk"
    | "schedule"
  >("dashboard");
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState<string | null>(null);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [schedule, setSchedule] = useState<StudentSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      const token = getAuthToken();
      const user = getAuthUser();
      
      if (!token || !user) {
        setAttendanceLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/attendance/students/${user.id}/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Group by subject
          const grouped: Record<string, AttendanceRecord> = {};
          
          data.records.forEach((record: any) => {
            if (!grouped[record.subject]) {
              grouped[record.subject] = {
                subject: record.subject,
                totalClasses: 0,
                attendedClasses: 0,
                percentage: 0,
                lastAttended: record.session_date,
                logs: []
              };
            }
            
            grouped[record.subject].totalClasses += 1;
            if (record.status === 'present') {
              grouped[record.subject].attendedClasses += 1;
            }
            
            grouped[record.subject].logs.push({
              date: record.session_date,
              status: record.status as any,
              topic: record.topic || record.batch_name
            });
          });

          // Calculate percentages
          const finalRecords = Object.values(grouped).map(record => ({
            ...record,
            percentage: Math.round((record.attendedClasses / record.totalClasses) * 100)
          }));

          setAttendanceRecords(finalRecords);
        }
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setScheduleLoading(true);
      const token = getAuthToken();
      try {
        const response = await fetch(`${API_BASE}/api/timetable/student/schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSchedule(data);
        }
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const displayAttendanceData = attendanceRecords.length > 0 ? attendanceRecords : [
    {
      subject: "Data Structures",
      totalClasses: 45,
      attendedClasses: 42,
      percentage: 93,
      lastAttended: "2024-03-28",
      logs: [
        { date: "2024-03-28", status: "present" as const, topic: "Graphs" },
        { date: "2024-03-26", status: "present" as const, topic: "Binary Trees" },
        { date: "2024-03-24", status: "absent" as const, topic: "Stacks and Queues" },
      ],
    },
    {
      subject: "Operating Systems",
      totalClasses: 40,
      attendedClasses: 35,
      percentage: 88,
      lastAttended: "2024-03-27",
      logs: [
        { date: "2024-03-27", status: "present" as const, topic: "Process Management" },
        { date: "2024-03-25", status: "present" as const, topic: "Memory Allocation" },
        { date: "2024-03-23", status: "absent" as const, topic: "File Systems" },
      ],
    },
    {
      subject: "Computer Networks",
      totalClasses: 38,
      attendedClasses: 25,
      percentage: 65,
      lastAttended: "2024-03-28",
      logs: [
        { date: "2024-03-28", status: "present" as const, topic: "TCP/IP Protocol" },
        { date: "2024-03-26", status: "absent" as const, topic: "DNS and HTTP" },
        { date: "2024-03-24", status: "absent" as const, topic: "OSI Model Layers" },
      ],
    },
  ];

  const overallAttendance = displayAttendanceData.length > 0
    ? Math.round(displayAttendanceData.reduce((acc, curr) => acc + curr.percentage, 0) / displayAttendanceData.length)
    : 87;

  const getLogStatusColor = (status: AttendanceLog["status"]) => {
    switch (status) {
      case "present": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "absent": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "late": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "excused": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const cgpaData: CGPARecord[] = [
    {
      year: "2025-26",
      semester: "Semester 6",
      startDate: "2026-01-10",
      endDate: "2026-05-30",
      cgpa: 0,
      subjects: [
        { code: "CS601", name: "Data Structures", credits: 4, grade: "TBD", points: 0 },
        { code: "CS602", name: "DBMS", credits: 4, grade: "TBD", points: 0 },
        { code: "CS603", name: "Computer Networks", credits: 3, grade: "TBD", points: 0 },
        { code: "CS604", name: "Operating Systems", credits: 4, grade: "TBD", points: 0 },
      ],
    },
    {
      year: "2025-26",
      semester: "Semester 5",
      startDate: "2025-08-01",
      endDate: "2025-12-23",
      cgpa: 8.2,
      subjects: [
        { code: "CS501", name: "Algorithms", credits: 4, grade: "A", points: 9.0 },
        { code: "CS502", name: "Web Development", credits: 3, grade: "A+", points: 10.0 },
        { code: "CS503", name: "Machine Learning", credits: 4, grade: "B+", points: 8.0 },
      ],
    },
    {
      year: "2024-25",
      semester: "Semester 4",
      startDate: "2025-01-10",
      endDate: "2025-05-30",
      cgpa: 7.9,
      subjects: [
        { code: "CS401", name: "Discrete Mathematics", credits: 4, grade: "B", points: 7.0 },
      ],
    },
  ];

  const getSemesterStatus = (semester: Pick<CGPARecord, "endDate">): "ongoing" | "completed" => {
    return new Date() <= new Date(semester.endDate) ? "ongoing" : "completed";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-yellow-600";
    if (grade === "TBD") return "text-gray-500";
    return "text-red-600";
  };

  const subjectMarksSummaryData: Record<string, SubjectMarkSummary> = {
    CS501: {
      assessments: [
        { name: "Internal 1", maxMarks: 20, scoredMarks: 18 },
        { name: "Internal 2", maxMarks: 20, scoredMarks: 15 },
        { name: "Lab Internals", maxMarks: 25, scoredMarks: 22 },
        { name: "Lab Externals", maxMarks: 25, scoredMarks: 23 },
        { name: "Semester Exam", maxMarks: 100, scoredMarks: 80 },
      ],
      totalMaxMarks: 190,
      totalScoredMarks: 158,
    },
    CS502: {
      assessments: [
        { name: "Internal 1", maxMarks: 20, scoredMarks: 19 },
        { name: "Internal 2", maxMarks: 20, scoredMarks: 19 },
        { name: "Lab Internals", maxMarks: 25, scoredMarks: 24 },
        { name: "Lab Externals", maxMarks: 25, scoredMarks: 25 },
        { name: "Semester Exam", maxMarks: 100, scoredMarks: 92 },
      ],
      totalMaxMarks: 190,
      totalScoredMarks: 179,
    },
  };

  if (selectedView === "schedule") {
    // Combine and group classes by date
    const allScheduleClasses = [...(schedule?.today || []), ...(schedule?.upcoming || [])];
    
    // Get unique dates for selection
    const scheduleDates = Array.from(new Set(allScheduleClasses.map(c => 
      c.session_date || new Date().toISOString().split('T')[0]
    ))).sort();

    const displayDay = selectedScheduleDay || (scheduleDates.length > 0 ? scheduleDates[0] : new Date().toISOString().split('T')[0]);
    const dayClasses = allScheduleClasses.filter(c => 
      (c.session_date || new Date().toISOString().split('T')[0]) === displayDay
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));

    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedView("dashboard")} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Class Timetable</h1>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1 -mx-1">
            {(scheduleDates.length > 0 ? scheduleDates : [new Date().toISOString().split('T')[0]]).map((date) => {
              const dateObj = new Date(date);
              const isSelected = displayDay === date;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedScheduleDay(date)}
                  className={`flex flex-col items-center min-w-[75px] md:min-w-[85px] p-2 md:p-3 rounded-2xl transition-all ${
                    isSelected 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                      : "glass-card hover:bg-secondary/50"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-lg md:text-xl font-bold leading-none mt-1">{dateObj.getDate()}</span>
                  <span className={`text-[10px] font-medium mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dayClasses.length > 0 ? (
              dayClasses.map((cls, idx) => (
                <motion.div
                  key={`${cls.id}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card rounded-2xl p-4 md:p-6 relative overflow-hidden group hover:bg-secondary/30 transition-all border-l-4 border-primary"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls.is_active ? 'gradient-primary' : 'bg-secondary'}`}>
                          <BookOpen className={`w-5 h-5 ${cls.is_active ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{cls.subject}</h3>
                          {cls.is_active && (
                            <Badge className="bg-green-500 animate-pulse text-[10px] h-5">Live Now</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Time</p>
                        <p className="text-sm font-semibold">{cls.start_time.slice(0, 5)} - {cls.end_time?.slice(0, 5) || "--:--"}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Room</p>
                        <p className="text-sm font-semibold">{cls.room || "TBD"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground truncate">{cls.faculty_name}</span>
                      </div>
                      <button className="text-xs font-bold text-primary hover:underline shrink-0">Details</button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full glass-card rounded-3xl p-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto">
                  <Calendar className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-lg font-bold">No Classes Scheduled</h3>
                  <p className="text-muted-foreground mt-1 text-sm">Take some time to review your notes or complete pending tasks.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "cgpa") {
    const semesterData = cgpaData.find((record) => record.semester === selectedSemester);
    const summaryData = selectedSubject && subjectMarksSummaryData[selectedSubject.code];

    if (semesterData && selectedSubject && getSemesterStatus(semesterData) === "completed") {
      return (
        <StudentLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedSubject(null)} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-primary/10">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
                <p className="text-sm text-muted-foreground">Marks Summary for {selectedSubject.code}</p>
              </div>
            </div>
            {summaryData && (
              <div className="glass-card rounded-2xl p-6">
                <div className="space-y-4">
                  {summaryData.assessments.map((item, index) => (
                    <div key={index} className="flex justify-between p-4 rounded-lg bg-secondary/50">
                      <span>{item.name}</span>
                      <span className="font-semibold">{item.scoredMarks} / {item.maxMarks}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-green-600">{summaryData.totalScoredMarks} / {summaryData.totalMaxMarks}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </StudentLayout>
      );
    }

    if (semesterData) {
      return (
        <StudentLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedSemester(null)} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{semesterData.semester}</h1>
                <p className="text-sm text-muted-foreground">{getSemesterStatus(semesterData) === "completed" ? `Final CGPA: ${semesterData.cgpa}` : "In Progress"}</p>
              </div>
            </div>
            <div className="space-y-4">
              {semesterData.subjects.map((subject) => (
                <div key={subject.code} className="glass-card rounded-2xl p-6 cursor-pointer" onClick={() => getSemesterStatus(semesterData) === "completed" && setSelectedSubject(subject)}>
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground">{subject.code} • {subject.credits} Credits</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getGradeColor(subject.grade)}`}>{subject.grade}</div>
                      <div className="text-sm text-muted-foreground">{subject.points} Points</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </StudentLayout>
      );
    }

    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedView("dashboard")} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">CGPA Overview</h1>
          </div>
          <div className="space-y-4">
            {cgpaData.map((record) => {
              return (
                <div key={record.semester} className="glass-card rounded-2xl p-6 cursor-pointer" onClick={() => setSelectedSemester(record.semester)}>
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold">{record.semester}</h3>
                      <p className="text-sm text-muted-foreground">{record.year}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{record.cgpa > 0 ? record.cgpa : "-"}</div>
                      <div className="text-xs text-muted-foreground">CGPA</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "attendance") {
    const selectedRecord = displayAttendanceData.find(r => r.subject === selectedAttendanceSubject);

    if (selectedRecord) {
      return (
        <StudentLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedAttendanceSubject(null)} 
                className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{selectedRecord.subject}</h1>
                <p className="text-sm text-muted-foreground">Daily Attendance Report</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Overall Attendance</p>
                  <h2 className={`text-4xl font-bold mt-1 ${selectedRecord.percentage >= 75 ? "text-green-500" : "text-red-500"}`}>
                    {selectedRecord.percentage}%
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Classes Attended</p>
                  <p className="text-xl font-bold">{selectedRecord.attendedClasses} / {selectedRecord.totalClasses}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Attendance Log
                </h3>
                {selectedRecord.logs.map((log: AttendanceLog, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-xs text-muted-foreground font-medium uppercase">{new Date(log.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                        <p className="text-xl font-bold leading-none">{new Date(log.date).getDate()}</p>
                      </div>
                      <div className="w-[1px] h-10 bg-border/50" />
                      <div>
                        <p className="font-medium">{log.topic || "Regular Session"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                      </div>
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
            <button onClick={() => setSelectedView("dashboard")} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Attendance Report</h1>
          </div>
          <div className="space-y-4">
            {attendanceLoading ? (
              <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : displayAttendanceData.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
                <p>No attendance records found.</p>
              </div>
            ) : (
              displayAttendanceData.map((record: AttendanceRecord) => (
                <div 
                  key={record.subject} 
                  className="glass-card rounded-2xl p-6 cursor-pointer hover:bg-secondary/20 transition-all hover:scale-[1.01]"
                  onClick={() => setSelectedAttendanceSubject(record.subject)}
                >
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{record.subject}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last: {record.lastAttended}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${record.percentage >= 75 ? "text-green-500" : "text-red-500"}`}>{record.percentage}%</div>
                      <div className="text-xs text-muted-foreground">Overall</div>
                    </div>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${record.percentage >= 75 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"}`} 
                      style={{ width: `${record.percentage}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-muted-foreground font-medium">
                    <span>{record.attendedClasses} Attended</span>
                    <span>{record.totalClasses} Total</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "tasks") {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedView("dashboard")} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Pending Tasks</h1>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground">No pending tasks!</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (selectedView === "risk") {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedView("dashboard")} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Risk Profile</h1>
          </div>
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="w-32 h-32 rounded-full border-8 border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold text-green-500">Low</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Safe Standing</h3>
            <p className="text-muted-foreground">Your academic performance is well within required limits.</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Insights</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {getUserName()}!</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {[
            { label: "My Schedule", value: schedule?.today.length ? `${schedule.today.length} today` : "No classes", icon: Calendar, view: "schedule" },
            { label: "Attendance", value: `${overallAttendance}%`, icon: CheckCircle, view: "attendance" },
            { label: "Overall CGPA", value: "8.2", icon: TrendingUp, view: "cgpa" },
            { label: "Pending Tasks", value: "0", icon: Clock, view: "tasks" },
            { label: "Risk Profile", value: "Low", icon: AlertTriangle, view: "risk" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-4 md:p-5 cursor-pointer hover:bg-secondary/30 transition-all border border-border/50"
              onClick={() => setSelectedView(stat.view as any)}
            >
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground text-right leading-tight">{stat.label}</span>
              </div>
              <p className="text-xl md:text-3xl font-bold truncate">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Class Schedule Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              {scheduleLoading ? (
                <div className="col-span-full glass-card rounded-2xl p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : schedule && schedule.today.length > 0 ? (
                schedule.today.map((cls, idx) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors cursor-pointer border border-border/50 group"
                    onClick={() => {
                      setSelectedScheduleDay(new Date().toISOString().split('T')[0]);
                      setSelectedView("schedule");
                    }}
                  >
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                        <span className="text-xs font-bold leading-none">{cls.start_time.slice(0, 5)}</span>
                        <div className="w-4 h-[1px] bg-primary/30 my-1" />
                        <span className="text-[10px] opacity-70 leading-none">{cls.end_time?.slice(0, 5) || "--:--"}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{cls.subject}</h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] md:text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate max-w-[100px]">
                            <User className="w-3 h-3" /> {cls.faculty_name}
                          </span>
                          {cls.room && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Monitor className="w-3 h-3" /> {cls.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {cls.is_active && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 animate-pulse shrink-0">
                        Live
                      </Badge>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full glass-card rounded-2xl p-8 text-center text-muted-foreground border border-dashed">
                  <p className="text-sm">No classes scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Classes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Upcoming
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {schedule && schedule.upcoming.length > 0 ? (
                schedule.upcoming.map((cls, idx) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="p-4 rounded-xl border border-border/50 bg-background/50 flex flex-col gap-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => {
                      if (cls.session_date) setSelectedScheduleDay(cls.session_date);
                      setSelectedView("schedule");
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-semibold truncate">{cls.subject}</h4>
                      <span className="text-[9px] md:text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
                        {cls.session_date ? new Date(cls.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] md:text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {cls.start_time.slice(0, 5)}
                      </div>
                      <div className="flex items-center gap-1 truncate max-w-[80px]">
                        <User className="w-3 h-3" /> {cls.faculty_name.split(' ').pop()}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full p-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                  No upcoming classes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
