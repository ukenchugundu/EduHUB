import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Shield,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Calendar,
  Clock,
  BookOpen,
} from "lucide-react";
import {
  getProfileIdentifierLabel,
  getProfileIdentifierValue,
  readStoredAuth,
  readStoredProfileImage,
} from "@/lib/authSession";
import { useTheme } from "@/contexts/ThemeContext";
import EduHubAIAgent from "@/components/EduHubAIAgent";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Manage Users", icon: Users, path: "/admin/users" },
  { label: "Create Schedule", icon: Clock, path: "/admin/schedule" },
  { label: "Events", icon: Calendar, path: "/admin/events" },
  { label: "View Marks", icon: BookOpen, path: "/admin/marks" },
  { label: "History", icon: Clock, path: "/admin/history" },
];

const isSidebarItemActive = (pathname: string, itemPath: string) =>
  itemPath === "/admin"
    ? pathname === itemPath
    : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = useMemo(() => readStoredAuth(), []);
  const profileName =
    auth?.fullName?.trim() || auth?.email.split("@")[0] || "Admin";
  const profileEmail = auth?.email || "-";
  const profileIdentifierLabel = getProfileIdentifierLabel(auth);
  const profileIdentifierValue = getProfileIdentifierValue(auth);
  const profileImage = readStoredProfileImage(auth);
  const activeItem =
    sidebarItems.find(({ path }) => isSidebarItemActive(location.pathname, path)) ??
    sidebarItems[0];
  const showExpandedSidebar = !isDesktopViewport || sidebarOpen;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = (matches: boolean) => {
      setIsDesktopViewport(matches);
      if (matches) {
        setMobileMenuOpen(false);
      }
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktopViewport) {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("eduhub_auth");
    localStorage.removeItem("eduhub_student_id");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground relative overflow-x-hidden">
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

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transition-all duration-500 ease-out flex flex-col ${
          showExpandedSidebar ? "w-64" : "w-[72px]"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {showExpandedSidebar && (
              <div className="min-w-0">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="block font-brand font-bold text-sidebar-foreground text-sm whitespace-nowrap"
                >
                  EduHub
                </motion.span>
                <span className="block text-[11px] text-sidebar-foreground/60 whitespace-nowrap">
                  Admin Portal
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pt-4">
          <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/20 p-3">
            {showExpandedSidebar ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
                  Admin Workspace
                </p>
                <p className="mt-2 text-sm font-semibold text-sidebar-foreground">
                  {activeItem.label}
                </p>
                <p className="mt-1 text-xs text-sidebar-foreground/60">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </>
            ) : (
              <div className="flex justify-center">
                <Calendar className="w-5 h-5 text-sidebar-foreground/70" />
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {sidebarItems.map((item) => {
            const active = isSidebarItemActive(location.pathname, item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-300 ${
                  active
                    ? "gradient-gold text-white shadow-lg shadow-gold/20 font-medium"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {showExpandedSidebar && <span>{item.label}</span>}
                {showExpandedSidebar && active && (
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
            {showExpandedSidebar && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div
        className={`flex-1 transition-all duration-500 min-w-0 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"} ml-0`}
      >
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
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
            <div className="hidden sm:block min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Admin Workspace
              </p>
              <p className="text-sm font-medium text-foreground truncate">
                {activeItem.label}
              </p>
            </div>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setProfileOpen((previous) => !previous)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center overflow-hidden">
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
              <span className="text-sm font-medium text-foreground hidden md:inline max-w-[140px] truncate">
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
                    <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center overflow-hidden shrink-0">
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
                      {profileIdentifierValue ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          {profileIdentifierLabel}: {profileIdentifierValue}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/40 p-3 mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Portal Access
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      Administrator
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Link
                      to="/admin/profile"
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
                      ].map((themeOption) => (
                        <button
                          key={themeOption.id}
                          onClick={() =>
                            setTheme(themeOption.id as "light" | "dark" | "system")
                          }
                          className={`flex flex-col items-center gap-1.5 py-2 rounded-xl border transition-all ${
                            theme === themeOption.id
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          <themeOption.icon className="w-4 h-4" />
                          <span className="text-[10px] font-medium">
                            {themeOption.label}
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

        <main className="p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
        <EduHubAIAgent role="admin" />
      </div>
    </div>
  );
};

export default AdminLayout;
