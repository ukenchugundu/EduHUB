import { useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  GraduationCap,
  Shield,
  Camera,
  Trash2,
  Save,
  LogOut,
  UserCog,
  Calendar,
  Clock,
  BookOpen,
  BarChart3,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  buildProfileImageDataUrl,
  getProfileIdentifierLabel,
  getProfileIdentifierValue,
  isAcceptedProfileImageFile,
  PROFILE_IMAGE_ACCEPT,
  readStoredAuth,
  readStoredProfileImage,
  removeStoredProfileImage,
  writeStoredProfileImage,
  StoredAuthSession,
} from "@/lib/authSession";
import { useTheme } from "@/contexts/ThemeContext";
import StudentLayout from "@/components/StudentLayout";
import FacultyLayout from "@/components/FacultyLayout";
import AdminLayout from "@/components/AdminLayout";

// Role-specific components based on user role
const RoleBadge = ({ role }: { role: string }) => {
  const roleConfig = {
    student: {
      icon: GraduationCap,
      label: "Student",
      gradient: "gradient-primary",
    },
    faculty: { icon: UserCog, label: "Faculty", gradient: "gradient-accent" },
    admin: { icon: Shield, label: "Administrator", gradient: "gradient-gold" },
  };

  const config =
    roleConfig[role as keyof typeof roleConfig] || roleConfig.student;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${config.gradient}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// Stats card component
const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) => (
  <div className="bg-card rounded-xl p-4 border border-border/50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const auth = readStoredAuth();
  const profileImage = readStoredProfileImage(auth);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(auth?.fullName || "");
  const [currentImage, setCurrentImage] = useState(profileImage);
  const [isEditing, setIsEditing] = useState(false);

  const profileName =
    auth?.fullName?.trim() || auth?.email.split("@")[0] || "User";
  const profileEmail = auth?.email || "-";
  const profileIdentifierLabel = getProfileIdentifierLabel(auth);
  const profileIdentifierValue = getProfileIdentifierValue(auth);

  // Redirect if not logged in
  if (!auth) {
    navigate("/auth");
    return null;
  }

  const handleUploadProfileImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAcceptedProfileImageFile(file)) {
      toast.error(
        "Unsupported image type. Please choose a valid image format.",
      );
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("Profile image must be 15 MB or smaller.");
      event.target.value = "";
      return;
    }

    buildProfileImageDataUrl(file)
      .then((result) => {
        setCurrentImage(result);
        const persisted = writeStoredProfileImage(auth, result);
        if (persisted) {
          toast.success("Profile photo updated successfully!");
        } else {
          toast.warning("Photo updated, but could not be saved permanently.");
        }
      })
      .catch(() => {
        toast.error(
          "Could not process this image. Please try a different format.",
        );
      });
    event.target.value = "";
  };

  const handleRemoveProfileImage = () => {
    setCurrentImage("");
    removeStoredProfileImage(auth);
    toast.success("Profile photo removed.");
  };

  const handleSaveName = () => {
    if (name.trim()) {
      const updatedAuth = { ...auth, fullName: name.trim() };
      localStorage.setItem("eduhub_auth", JSON.stringify(updatedAuth));
      toast.success("Name updated successfully!");
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("eduhub_auth");
    localStorage.removeItem("eduhub_student_id");
    navigate("/auth");
  };

  // Get role-specific stats (placeholder - can be connected to actual data)
  const getRoleStats = () => {
    switch (auth?.role) {
      case "student":
        return [
          { icon: BookOpen, label: "Enrolled Courses", value: 5 },
          { icon: BarChart3, label: "Average Score", value: "85%" },
          { icon: Calendar, label: "Attendance", value: "92%" },
        ];
      case "faculty":
        return [
          { icon: UserCog, label: "Active Courses", value: 3 },
          { icon: BookOpen, label: "Total Students", value: 120 },
          { icon: Clock, label: "Hours Taught", value: 48 },
        ];
      case "admin":
        return [
          { icon: UserCog, label: "Total Users", value: 250 },
          { icon: Shield, label: "Active Sessions", value: 12 },
          { icon: Calendar, label: "Events", value: 8 },
        ];
      default:
        return [];
    }
  };

  const Layout =
    auth?.role === "student"
      ? StudentLayout
      : auth?.role === "faculty"
        ? FacultyLayout
        : AdminLayout;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>
          </div>
          <RoleBadge role={auth?.role || "student"} />
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          {/* Cover gradient */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-gold/20" />

          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl bg-card border-4 border-card flex items-center justify-center overflow-hidden shadow-xl">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={profileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept={PROFILE_IMAGE_ACCEPT}
                  className="hidden"
                  onChange={handleUploadProfileImage}
                />
                <button
                  onClick={() => profileFileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Name and Email */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-2xl font-bold bg-background border border-border rounded-lg px-3 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setName(auth?.fullName || "");
                      }}
                      className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground">
                      {profileName}
                    </h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <UserCog className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {profileEmail}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getRoleStats().map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </div>

        {/* Account Details */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Account Information
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium text-foreground">{profileName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium text-foreground">{profileEmail}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {profileIdentifierLabel}
                  </p>
                  <p className="font-medium text-foreground">
                    {profileIdentifierValue}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <p className="font-medium text-foreground capitalize">
                    {auth?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Appearance
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Theme:</span>
            <div className="flex gap-2">
              {[
                { value: "light", label: "Light", icon: "☀️" },
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "system", label: "Auto", icon: "💻" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() =>
                    setTheme(t.value as "light" | "dark" | "system")
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
                    theme === t.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card rounded-2xl border border-destructive/20 p-6">
          <h3 className="text-lg font-semibold text-destructive mb-4">
            Danger Zone
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Remove Profile Photo
              </p>
              <p className="text-sm text-muted-foreground">
                This will remove your current profile picture
              </p>
            </div>
            <button
              onClick={handleRemoveProfileImage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove Photo
            </button>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Profile;
