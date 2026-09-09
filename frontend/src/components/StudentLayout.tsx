import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Brain,
  BarChart3,
  Code,
  User,
  LogOut,
  GraduationCap,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Settings,
  Clock,
} from "lucide-react";
import {
  getProfileIdentifierLabel,
  getProfileIdentifierValue,
  mergeStoredAuth,
  readStoredAuth,
  readStoredProfileImage,
} from "@/lib/authSession";
import { useTheme } from "@/contexts/ThemeContext";
import EduHubAIAgent from "@/components/EduHubAIAgent";
import {
  StudentAIAssistanceProvider,
  useStudentAIAssistance,
} from "@/contexts/StudentAIAssistanceContext";

const sidebarItems = [
  { label: "My Insights", icon: LayoutDashboard, path: "/student" },
  { label: "Notes", icon: BookOpen, path: "/student/notes" },
  { label: "Assignments", icon: FileText, path: "/student/assignments" },
  { label: "Tests", icon: Code, path: "/student/tests" },
  { label: "Quizzes", icon: Brain, path: "/student/quizzes" },
  { label: "Results", icon: BarChart3, path: "/student/results" },
  { label: "History", icon: Clock, path: "/student/history" },
];

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

const StudentLayoutShell = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { isRestricted } = useStudentAIAssistance();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [auth, setAuth] = useState(() => readStoredAuth());
  const profileImage = readStoredProfileImage(auth);

  useEffect(() => {
    const loadLiveStudentProfile = async () => {
      if (!auth?.token) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          fullName?: string;
          rollNumber?: string;
          studentId?: string;
          department?: string;
          academicYear?: string;
          section?: string;
          batchName?: string;
        };

        const nextAuth =
          mergeStoredAuth({
            fullName: data.fullName || auth.fullName,
            rollNumber: data.rollNumber || auth.rollNumber,
            studentId: data.studentId || auth.studentId,
            department: data.department || auth.department,
            academicYear: data.academicYear || auth.academicYear,
            section: data.section || auth.section,
            batchName: data.batchName || auth.batchName,
          }) || auth;

        setAuth(nextAuth);
      } catch (error) {
        console.error("Failed to refresh student layout profile:", error);
      }
    };

    void loadLiveStudentProfile();
  }, [auth?.academicYear, auth?.batchName, auth?.department, auth?.fullName, auth?.rollNumber, auth?.section, auth?.studentId, auth?.token]);

  const profileName =
    auth?.fullName?.trim() || auth?.email?.split("@")[0] || "Student";
  const profileEmail = auth?.email || "-";
  const profileIdentifierLabel = getProfileIdentifierLabel(auth);
  const profileIdentifierValue = getProfileIdentifierValue(auth);

  const handleLogout = () => {
    localStorage.removeItem("eduhub_auth");
    localStorage.removeItem("eduhub_student_id");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transition-all duration-500 ease-out flex flex-col 
          ${sidebarOpen ? "w-64" : "w-[72px]"} 
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-brand font-bold text-sidebar-foreground text-sm whitespace-nowrap"
              >
                EduHub
              </motion.span>
            )}
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {sidebarItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-300 ${
                  active
                    ? "gradient-primary text-white shadow-lg shadow-primary/20 font-medium"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {(sidebarOpen || window.innerWidth < 1024) && <span>{item.label}</span>}
                {(sidebarOpen || window.innerWidth < 1024) && active && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(sidebarOpen || window.innerWidth < 1024) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div
        className={`flex-1 transition-all duration-500 min-w-0 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"} ml-0`}
      >
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl hover:bg-secondary transition-colors hidden lg:block"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 rounded-xl hover:bg-secondary transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={profileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground hidden md:inline">
                {profileName}
              </span>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-72 glass-card rounded-2xl p-4 shadow-2xl border border-border z-50"
                >
                  <div className="flex items-center gap-3 p-2 mb-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center overflow-hidden shrink-0">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={profileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">
                        {profileName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {profileEmail}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      to="/student/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      View Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                      Theme
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "light", icon: Sun, label: "Light" },
                        { id: "dark", icon: Moon, label: "Dark" },
                        { id: "system", icon: Monitor, label: "Auto" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`flex flex-col items-center gap-1.5 py-2 rounded-xl border transition-all ${
                            theme === t.id
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          <t.icon className="w-4 h-4" />
                          <span className="text-[10px] font-medium">
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
        <EduHubAIAgent role="student" disabled={isRestricted} />
      </div>
    </div>
  );
};

const StudentLayout = ({ children }: { children: React.ReactNode }) => (
  <StudentAIAssistanceProvider>
    <StudentLayoutShell>{children}</StudentLayoutShell>
  </StudentAIAssistanceProvider>
);

export default StudentLayout;
