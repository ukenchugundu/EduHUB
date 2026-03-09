import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpenCheck,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  UserCog,
  Mail,
  Lock,
  User,
  CheckCircle,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Role = "student" | "faculty" | "admin";

const roleConfig: Record<
  Role,
  {
    label: string;
    icon: typeof GraduationCap;
    gradient: string;
    redirect: string;
  }
> = {
  student: {
    label: "Student",
    icon: GraduationCap,
    gradient: "from-violet-600 to-indigo-600",
    redirect: "/student",
  },
  faculty: {
    label: "Faculty",
    icon: BookOpenCheck,
    gradient: "from-emerald-600 to-teal-600",
    redirect: "/faculty",
  },
  admin: {
    label: "Admin",
    icon: UserCog,
    gradient: "from-amber-500 to-orange-600",
    redirect: "/admin",
  },
};

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const STUDENT_ID_STORAGE_KEY = "eduhub_student_id";

const parseRole = (value: string | null): Role | null => {
  if (value === "student" || value === "faculty" || value === "admin") {
    return value;
  }
  return null;
};

interface AuthApiUser {
  id: number;
  email: string;
  role: Role;
  fullName: string;
  rollNumber: string;
  studentId: string;
}

interface AuthApiResponse {
  user: AuthApiUser;
  token?: string;
  error?: string;
}

interface LoginOtpResponse {
  otpRequired: boolean;
  message?: string;
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  debugOtpCode?: string;
}

interface GenericMessageResponse {
  message: string;
  error?: string;
}

interface ForgotPasswordResponse extends GenericMessageResponse {
  debugResetLink?: string;
}

interface PendingOtpSession {
  role: Role;
  email: string;
  challengeId: string;
  maskedEmail: string;
  debugOtpCode?: string;
}

const postJson = async <T,>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      "Request failed. Please try again.";
    throw new Error(message);
  }

  return data as T;
};

const persistAuth = (user: AuthApiUser, token?: string): void => {
  localStorage.setItem(
    "eduhub_auth",
    JSON.stringify({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      rollNumber: user.rollNumber,
      studentId: user.studentId,
      token: token || "",
    }),
  );

  if (user.role === "student") {
    localStorage.setItem(STUDENT_ID_STORAGE_KEY, user.studentId || user.email);
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRoll, setSignupRoll] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [pendingOtpSession, setPendingOtpSession] =
    useState<PendingOtpSession | null>(null);
  const [debugResetLink, setDebugResetLink] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const resetTokenFromUrl =
    searchParams.get("mode") === "reset"
      ? (searchParams.get("token")?.trim() ?? "")
      : "";
  const resetEmailFromUrl = searchParams.get("email")?.trim() ?? "";
  const resetRoleFromUrl = parseRole(searchParams.get("role"));
  const isResetMode = Boolean(resetTokenFromUrl);

  const clearTransientAuthState = () => {
    setAuthError("");
    setAuthMessage("");
    setOtpCode("");
    setPendingOtpSession(null);
    setDebugResetLink("");
  };

  const resetView = () => {
    setIsCreatingAccount(false);
    setIsForgotPassword(false);
    clearTransientAuthState();
  };

  const completeLogin = (user: AuthApiUser, token?: string) => {
    persistAuth(user, token);
    const redirectUrl = searchParams.get("redirect");
    if (redirectUrl) {
      navigate(redirectUrl);
    } else {
      navigate(roleConfig[user.role].redirect);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setIsSubmitting(true);

    try {
      const email = loginEmail.trim().toLowerCase();
      const login = await postJson<LoginOtpResponse>("/api/auth/login", {
        role: selectedRole,
        email,
        password: loginPassword,
      });

      if (!login.otpRequired || !login.challengeId) {
        throw new Error("Invalid login response from server.");
      }

      setPendingOtpSession({
        role: selectedRole,
        email,
        challengeId: login.challengeId,
        maskedEmail: login.maskedEmail,
        debugOtpCode: login.debugOtpCode,
      });
      setOtpCode("");
      setAuthMessage("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingOtpSession) {
      return;
    }

    if (otpCode.length !== 6) {
      setAuthError("Please enter the 6-digit OTP.");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setIsSubmitting(true);

    try {
      const auth = await postJson<AuthApiResponse>(
        "/api/auth/login/verify-otp",
        {
          role: pendingOtpSession.role,
          email: pendingOtpSession.email,
          challengeId: pendingOtpSession.challengeId,
          otp: otpCode,
        },
      );

      if (!auth.user) {
        throw new Error("Invalid OTP verification response.");
      }

      completeLogin(auth.user, auth.token);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "OTP verification failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingOtpSession) {
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setIsSubmitting(true);

    try {
      const login = await postJson<LoginOtpResponse>(
        "/api/auth/login/resend-otp",
        {
          challengeId: pendingOtpSession.challengeId,
        },
      );

      setPendingOtpSession((prev) =>
        prev
          ? {
              ...prev,
              maskedEmail: login.maskedEmail || prev.maskedEmail,
              debugOtpCode: login.debugOtpCode,
            }
          : prev,
      );
      setOtpCode("");
      setAuthMessage(login.message || "A new 6-digit code has been sent.");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to resend OTP",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setDebugResetLink("");
    setIsSubmitting(true);

    try {
      const response = await postJson<ForgotPasswordResponse>(
        "/api/auth/forgot-password",
        {
          role: selectedRole,
          email: forgotEmail.trim(),
          frontendBaseUrl: window.location.origin,
        },
      );
      setAuthMessage(
        response.message ||
          "If this account exists, a reset link has been sent.",
      );
      if (response.debugResetLink) {
        setDebugResetLink(response.debugResetLink);
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Failed to send reset link",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetTokenFromUrl) {
      setAuthError("Reset token is missing or invalid.");
      return;
    }
    if (newPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setIsSubmitting(true);

    try {
      const response = await postJson<GenericMessageResponse>(
        "/api/auth/reset-password",
        {
          token: resetTokenFromUrl,
          newPassword,
        },
      );
      localStorage.removeItem("eduhub_auth");
      localStorage.removeItem(STUDENT_ID_STORAGE_KEY);

      const nextRole = resetRoleFromUrl ?? selectedRole;
      setSearchParams(nextRole ? { role: nextRole } : {});
      setSelectedRole(nextRole);
      setIsCreatingAccount(false);
      setIsForgotPassword(false);
      setPendingOtpSession(null);
      setOtpCode("");
      setShowPassword(false);
      setAuthError("");
      setAuthMessage(
        response.message ||
          "Password reset successful. Please login with your new password.",
      );
      setLoginPassword("");
      if (resetEmailFromUrl) {
        setLoginEmail(resetEmailFromUrl);
      }
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Password reset failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setIsSubmitting(true);
    try {
      const auth = await postJson<AuthApiResponse>("/api/auth/register", {
        role: "student",
        email: signupEmail.trim(),
        password: signupPassword,
        fullName: signupName.trim(),
        rollNumber: signupRoll.trim(),
      });

      if (!auth.user) {
        throw new Error("Invalid registration response from server.");
      }

      completeLogin(auth.user);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Account creation failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const exitResetMode = () => {
    setSearchParams({});
    setNewPassword("");
    setConfirmNewPassword("");
    clearTransientAuthState();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 relative flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs with enhanced animations */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-violet-600/30 to-purple-600/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-r from-indigo-600/25 to-blue-600/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/15 to-teal-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        {/* Floating particles */}
        <div
          className="absolute top-1/4 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-ping"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-3/4 right-1/3 w-1 h-1 bg-purple-400/30 rounded-full animate-ping"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-indigo-400/25 rounded-full animate-ping"
          style={{ animationDelay: "2.5s" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Enhanced Logo Section */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.4,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/40 border border-white/20 backdrop-blur-sm"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
            <GraduationCap className="w-12 h-12 text-white drop-shadow-lg" />
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 opacity-30 blur-lg animate-pulse" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-brand text-5xl font-bold text-white tracking-tight mb-2 bg-gradient-to-r from-white via-purple-100 to-indigo-100 bg-clip-text text-transparent"
          >
            EduHub
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-white/60 text-base font-medium bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent"
          >
            Your Learning Journey Starts Here
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="w-20 h-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full mx-auto mt-4"
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {isResetMode && (
            <motion.div
              key="reset-password-token"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={exitResetMode}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-heading text-xl font-bold text-white">
                  Set New Password
                </h2>
              </div>

              <form className="space-y-5" onSubmit={handleResetPassword}>
                {authError ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {authError}
                  </motion.div>
                ) : null}
                {authMessage ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                  >
                    {authMessage}
                  </motion.div>
                ) : null}
                {resetEmailFromUrl ? (
                  <p className="text-xs text-white/50">
                    Resetting password for {resetEmailFromUrl}
                  </p>
                ) : null}

                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Resetting...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {!selectedRole && !isResetMode && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-center text-white/60 mb-6 font-medium text-sm">
                Select your role to continue
              </p>
              {(Object.keys(roleConfig) as Role[]).map((role, i) => {
                const config = roleConfig[role];
                return (
                  <motion.button
                    key={role}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => {
                      setSelectedRole(role);
                      resetView();
                    }}
                    className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-6 flex items-center gap-4 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 text-left group border border-white/20 hover:border-purple-400/30 relative overflow-hidden"
                  >
                    {/* Role card background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center gap-4 w-full">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-black/20 relative`}
                      >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                        <config.icon className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-bold text-white text-xl mb-1">
                          {config.label}
                        </p>
                        <p className="text-sm text-white/50 font-medium">
                          Login as {config.label.toLowerCase()}
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        <Sparkles className="w-6 h-6 text-white/30 group-hover:text-purple-300 transition-all duration-300 group-hover:rotate-12" />
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
              <button
                onClick={() => navigate("/")}
                className="w-full text-center text-white/30 text-sm mt-6 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>
            </motion.div>
          )}

          {selectedRole &&
            !isCreatingAccount &&
            !isForgotPassword &&
            !pendingOtpSession &&
            !isResetMode && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl shadow-purple-500/10 relative overflow-hidden"
              >
                {/* Enhanced card background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-purple-500/10 rounded-3xl" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-t-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <button
                      onClick={() => {
                        setSelectedRole(null);
                        resetView();
                      }}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="font-heading text-xl font-bold text-white">
                      {roleConfig[selectedRole].label} Login
                    </h2>
                    <ShieldCheck className="w-5 h-5 text-violet-400 ml-auto" />
                  </div>

                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      {authError}
                    </motion.div>
                  )}
                  {authMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                    >
                      {authMessage}
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="text-sm text-white/70 mb-2 block font-medium">
                        Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="Enter your email"
                          className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/60 focus:bg-white/15 transition-all duration-300 pl-12 backdrop-blur-sm"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-white/70 mb-2 block font-medium">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/60 focus:bg-white/15 transition-all duration-300 pl-12 pr-12 backdrop-blur-sm"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-bold hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative z-10">
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Signing in...
                          </span>
                        ) : (
                          "Login"
                        )}
                      </div>
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setForgotEmail(loginEmail.trim());
                          setAuthError("");
                          setAuthMessage("");
                        }}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

          {selectedRole && pendingOtpSession && !isResetMode && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setPendingOtpSession(null);
                    setOtpCode("");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-heading text-xl font-bold text-white">
                  Verify OTP
                </h2>
                <ShieldCheck className="w-5 h-5 text-violet-400 ml-auto" />
              </div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {authError}
                </motion.div>
              )}
              {authMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                >
                  {authMessage}
                </motion.div>
              )}

              <p className="text-sm text-white/60 mb-6">Enter the 6-digit code</p>

              {pendingOtpSession.debugOtpCode && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300">
                    Dev OTP:{" "}
                    <span className="font-semibold text-lg">
                      {pendingOtpSession.debugOtpCode}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={isSubmitting}
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-14 w-12 rounded-xl border border-white/20 bg-white/5 text-white text-lg"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <button
                type="submit"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || otpCode.length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mb-4"
              >
                {isSubmitting ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="w-full text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-70"
              >
                Didn't receive the code? Resend OTP
              </button>
            </motion.div>
          )}

          {selectedRole && isForgotPassword && !isResetMode && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setAuthError("");
                    setAuthMessage("");
                    setDebugResetLink("");
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-heading text-xl font-bold text-white">
                  Reset Password
                </h2>
              </div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {authError}
                </motion.div>
              )}
              {authMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                >
                  {authMessage}
                </motion.div>
              )}

              {debugResetLink && (
                <a
                  href={debugResetLink}
                  className="block mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs hover:underline"
                  target="_self"
                >
                  Open reset link (dev)
                </a>
              )}

              <form className="space-y-5" onSubmit={handleForgotPassword}>
                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {selectedRole === "student" && isCreatingAccount && !isResetMode && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => {
                    setIsCreatingAccount(false);
                    setAuthError("");
                    setAuthMessage("");
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-heading text-xl font-bold text-white">
                  Create Account
                </h2>
                <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />
              </div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {authError}
                </motion.div>
              )}
              {authMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                >
                  {authMessage}
                </motion.div>
              )}

              <form className="space-y-4" onSubmit={handleCreateAccount}>
                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter full name"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    Roll Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter roll number"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12"
                      value={signupRoll}
                      onChange={(e) => setSignupRoll(e.target.value)}
                      required
                    />
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Enter email"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 pl-12 pr-12"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
