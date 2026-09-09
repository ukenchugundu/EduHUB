import {
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { Pool, PoolClient } from "pg";
import jwt from "jsonwebtoken";
import pool from "../utils/db";
import {
  buildFacultyClassOptionsFromStudentRows,
  clearInMemoryFacultyClassAllocations,
  ensureFacultyClassAllocationsTable,
  getAllFacultyClassAllocations,
  getFacultyClassAllocations,
  getInMemoryFacultyClassAllocations,
  listAvailableFacultyClassOptions,
  normalizeClassName,
  setInMemoryFacultyClassAllocations,
  type FacultyClassAllocation,
} from "../utils/facultyClassAccess";
import { ensureStudentPortalContext } from "../utils/studentPortalAccess";

type UserRole = "student" | "faculty" | "admin";

interface AuthUserRecord {
  auth_user_id: number;
  email: string;
  role: UserRole;
  full_name: string;
  roll_number: string | null;
  phone?: string | null;
  department?: string | null;
  academic_year?: string | null;
  section?: string | null;
  designation?: string | null;
  password_hash: string;
  password_reset_token_hash: string | null;
  password_reset_expires_at: string | Date | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

interface PublicUser {
  id: number;
  email: string;
  role: UserRole;
  fullName: string;
  rollNumber: string;
  studentId: string;
}

interface AuthUserSummaryRow {
  auth_user_id: number;
  email: string;
  role: UserRole;
  full_name: string;
  roll_number: string | null;
  phone?: string | null;
  department?: string | null;
  academic_year?: string | null;
  section?: string | null;
  designation?: string | null;
  created_at: string | Date;
  updated_at?: string | Date;
}

type AdminManagedRole = "student" | "faculty" | "admin";

interface UserCreateInput {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  rollNumber: string;
  phone?: string;
  department?: string;
  academicYear?: string;
  section?: string;
  designation?: string;
  createdAt?: string | null;
}

interface AdminMemberSummary {
  id: number;
  email: string;
  role: AdminManagedRole;
  fullName: string;
  rollNumber: string;
  phone: string;
  department: string;
  year: string;
  section: string;
  designation: string;
  createdAt: string;
  updatedAt: string;
  assignedClasses: FacultyClassAllocation[];
}

interface PendingLoginOtpChallenge {
  challengeId: string;
  email: string;
  role: UserRole;
  user: PublicUser;
  otpHash: string;
  expiresAt: number;
  attemptsRemaining: number;
}

type EmailProvider = "dev" | "sendgrid" | "resend";

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  windowStartedAt: number;
  attempts: number;
  blockedUntil: number;
}

interface LockoutConfig {
  failureWindowMs: number;
  maxFailures: number;
  lockoutDurationMs: number;
}

interface LockoutEntry {
  windowStartedAt: number;
  failures: number;
  lockedUntil: number;
}

const allowedRoles = new Set<UserRole>(["student", "faculty", "admin"]);
const dbConnectionErrorCodes = new Set([
  "28P01",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ECONNRESET",
  "ETIMEDOUT",
  "3D000",
]);

const LOGIN_OTP_LENGTH = 6;
const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
const LOGIN_OTP_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const emailProviderRaw = String(process.env.EMAIL_PROVIDER ?? "dev")
  .trim()
  .toLowerCase();
const EMAIL_PROVIDER: EmailProvider =
  emailProviderRaw === "sendgrid" || emailProviderRaw === "resend"
    ? emailProviderRaw
    : "dev";
const EMAIL_FROM = (process.env.EMAIL_FROM || "no-reply@eduhub.local")
  .trim()
  .slice(0, 320);
const SENDGRID_API_KEY = (process.env.SENDGRID_API_KEY || "").trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const AUTH_DEBUG_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.EXPOSE_AUTH_DEBUG !== "false";
const FRONTEND_BASE_URL = (
  process.env.FRONTEND_BASE_URL || "http://localhost:8080"
)
  .trim()
  .replace(/\/$/, "");
const DEV_MAILBOX_PATH = path.resolve(__dirname, "../../tmp/dev-mailbox.log");
const RATE_LIMIT_STORE_MAX_SIZE = 20000;

const LOGIN_REQUEST_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 35,
  blockDurationMs: 15 * 60 * 1000,
};

const OTP_VERIFY_REQUEST_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 35,
  blockDurationMs: 10 * 60 * 1000,
};

const OTP_RESEND_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  blockDurationMs: 10 * 60 * 1000,
};

const PASSWORD_RESET_REQUEST_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxAttempts: 4,
  blockDurationMs: 60 * 60 * 1000,
};

const PASSWORD_RESET_SUBMIT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 12,
  blockDurationMs: 15 * 60 * 1000,
};

const LOGIN_FAILURE_LOCKOUT: LockoutConfig = {
  failureWindowMs: 15 * 60 * 1000,
  maxFailures: 5,
  lockoutDurationMs: 15 * 60 * 1000,
};

const OTP_FAILURE_LOCKOUT: LockoutConfig = {
  failureWindowMs: 15 * 60 * 1000,
  maxFailures: 3,
  lockoutDurationMs: 10 * 60 * 1000,
};

const RESET_FAILURE_LOCKOUT: LockoutConfig = {
  failureWindowMs: 15 * 60 * 1000,
  maxFailures: 8,
  lockoutDurationMs: 15 * 60 * 1000,
};

const inMemoryUsers: AuthUserRecord[] = [];
let inMemoryUserId = 1;
const loginOtpChallenges = new Map<string, PendingLoginOtpChallenge>();
const authRateLimitStore = new Map<string, RateLimitEntry>();
const loginFailureLockouts = new Map<string, LockoutEntry>();
const otpFailureLockouts = new Map<string, LockoutEntry>();
const resetFailureLockouts = new Map<string, LockoutEntry>();

if (emailProviderRaw !== EMAIL_PROVIDER) {
  console.warn(
    `[auth-mail] Unsupported EMAIL_PROVIDER "${emailProviderRaw}". Falling back to "dev".`,
  );
}

const toRole = (value: unknown): UserRole | null => {
  const role = String(value ?? "")
    .trim()
    .toLowerCase();
  return allowedRoles.has(role as UserRole) ? (role as UserRole) : null;
};

const toAdminManagedRole = (value: unknown): AdminManagedRole | null => {
  const role = String(value ?? "")
    .trim()
    .toLowerCase();
  if (role === "student" || role === "faculty" || role === "admin") {
    return role;
  }
  return null;
};

const toManagedRole = (role: UserRole): AdminManagedRole =>
  role === "faculty" || role === "admin" ? role : "student";

const getManagedMemberIdLabel = (role: AdminManagedRole): string =>
  role === "student"
    ? "studentId"
    : role === "faculty"
      ? "facultyId"
      : "adminId";

const normalizeEmail = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 320);

const normalizeName = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .slice(0, 255);

const normalizeRollNumber = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .slice(0, 120);

const normalizeOptionalText = (value: unknown, maxLength: number): string =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength);

const normalizePhone = (value: unknown): string => normalizeOptionalText(value, 40);

const normalizeDepartment = (value: unknown): string =>
  normalizeOptionalText(value, 120);

const normalizeAcademicYear = (value: unknown): string =>
  normalizeOptionalText(value, 40);

const normalizeSection = (value: unknown): string =>
  normalizeOptionalText(value, 40);

const normalizeDesignation = (value: unknown): string =>
  normalizeOptionalText(value, 120);

const normalizeCreatedAt = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const normalizeOtp = (value: unknown): string =>
  String(value ?? "")
    .replace(/\D+/g, "")
    .slice(0, LOGIN_OTP_LENGTH);

const isDatabaseConnectionError = (error: unknown): boolean => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (dbConnectionErrorCodes.has(code)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("password authentication failed") ||
    message.includes("client password must be a string") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("timeout expired") ||
    message.includes("connect econnrefused") ||
    (message.includes("database") && message.includes("does not exist"))
  );
};

const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, storedHash: string): boolean => {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
};

const hashToken = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const compareHashes = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const getExpiryTimestamp = (value: string | Date | null): number => {
  if (!value) {
    return 0;
  }
  const parsed =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const maskEmail = (email: string): string => {
  const [localPart, domainPart] = email.split("@");
  if (!localPart || !domainPart) {
    return "***";
  }

  const maskedLocal =
    localPart.length <= 2
      ? `${localPart.slice(0, 1)}*`
      : `${localPart.slice(0, 1)}${"*".repeat(localPart.length - 2)}${localPart.slice(-1)}`;

  const domainLabels = domainPart.split(".");
  const baseDomain = domainLabels[0] ?? "";
  const domainSuffix =
    domainLabels.length > 1 ? `.${domainLabels.slice(1).join(".")}` : "";
  const maskedDomain =
    baseDomain.length <= 2
      ? `${baseDomain.slice(0, 1)}*`
      : `${baseDomain.slice(0, 1)}${"*".repeat(baseDomain.length - 2)}${baseDomain.slice(-1)}`;

  return `${maskedLocal}@${maskedDomain}${domainSuffix}`;
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof rawForwarded === "string" && rawForwarded.trim()) {
    return rawForwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
};

const toKey = (...parts: string[]): string => parts.join(":");

const formatRetryDuration = (retryAfterMs: number): string => {
  if (retryAfterMs <= 60 * 1000) {
    return `${Math.max(1, Math.ceil(retryAfterMs / 1000))} second(s)`;
  }
  return `${Math.max(1, Math.ceil(retryAfterMs / 60000))} minute(s)`;
};

const trimRateLimitStore = (
  store: Map<string, RateLimitEntry>,
  maxAgeMs: number,
): void => {
  if (store.size <= RATE_LIMIT_STORE_MAX_SIZE) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    const inactiveTooLong =
      now - entry.windowStartedAt > maxAgeMs && entry.blockedUntil <= now;
    if (inactiveTooLong) {
      store.delete(key);
    }
  }
};

const applyRateLimit = (
  store: Map<string, RateLimitEntry>,
  key: string,
  config: RateLimitConfig,
): { allowed: true } | { allowed: false; retryAfterMs: number } => {
  const now = Date.now();
  trimRateLimitStore(
    store,
    Math.max(config.windowMs, config.blockDurationMs) * 2,
  );

  const state = store.get(key) ?? {
    windowStartedAt: now,
    attempts: 0,
    blockedUntil: 0,
  };

  if (state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: state.blockedUntil - now,
    };
  }

  if (now - state.windowStartedAt >= config.windowMs) {
    state.windowStartedAt = now;
    state.attempts = 0;
    state.blockedUntil = 0;
  }

  state.attempts += 1;
  if (state.attempts > config.maxAttempts) {
    state.blockedUntil = now + config.blockDurationMs;
    store.set(key, state);
    return {
      allowed: false,
      retryAfterMs: config.blockDurationMs,
    };
  }

  store.set(key, state);
  return { allowed: true };
};

const trimLockoutStore = (
  store: Map<string, LockoutEntry>,
  maxAgeMs: number,
): void => {
  if (store.size <= RATE_LIMIT_STORE_MAX_SIZE) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    const inactiveTooLong =
      now - entry.windowStartedAt > maxAgeMs && entry.lockedUntil <= now;
    if (inactiveTooLong) {
      store.delete(key);
    }
  }
};

const getLockoutRemainingMs = (
  store: Map<string, LockoutEntry>,
  key: string,
): number => {
  const state = store.get(key);
  if (!state) {
    return 0;
  }
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
};

const recordFailureAndGetLockoutMs = (
  store: Map<string, LockoutEntry>,
  key: string,
  config: LockoutConfig,
): number => {
  const now = Date.now();
  trimLockoutStore(
    store,
    Math.max(config.failureWindowMs, config.lockoutDurationMs) * 2,
  );

  const state = store.get(key) ?? {
    windowStartedAt: now,
    failures: 0,
    lockedUntil: 0,
  };

  if (state.lockedUntil > now) {
    return state.lockedUntil - now;
  }

  if (now - state.windowStartedAt >= config.failureWindowMs) {
    state.windowStartedAt = now;
    state.failures = 0;
    state.lockedUntil = 0;
  }

  state.failures += 1;
  if (state.failures >= config.maxFailures) {
    state.failures = 0;
    state.lockedUntil = now + config.lockoutDurationMs;
  }

  store.set(key, state);
  return state.lockedUntil > now ? state.lockedUntil - now : 0;
};

const clearFailures = (store: Map<string, LockoutEntry>, key: string): void => {
  store.delete(key);
};

const respondWithRateLimit = (
  res: Response,
  retryAfterMs: number,
  message: string,
) => {
  res.setHeader(
    "Retry-After",
    String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
  );
  return res
    .status(429)
    .json({
      error: `${message} Try again in ${formatRetryDuration(retryAfterMs)}.`,
    });
};

const persistDevEmailPreview = (payload: Record<string, unknown>): void => {
  try {
    fs.mkdirSync(path.dirname(DEV_MAILBOX_PATH), { recursive: true });
    fs.appendFileSync(DEV_MAILBOX_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error) {
    console.warn("Failed to persist dev mailbox preview:", error);
  }
};

const sendViaSendGrid = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    throw new Error(
      "SENDGRID_API_KEY and EMAIL_FROM must be configured for SendGrid.",
    );
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `SendGrid API error (${response.status}): ${body.slice(0, 400)}`,
    );
  }
};

const sendViaResend = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error(
      "RESEND_API_KEY and EMAIL_FROM must be configured for Resend.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Resend API error (${response.status}): ${body.slice(0, 400)}`,
    );
  }
};

const sendSecurityEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  const payload = {
    timestamp: new Date().toISOString(),
    to,
    subject,
    text,
    html,
    provider: EMAIL_PROVIDER,
  };

  if (EMAIL_PROVIDER === "dev") {
    persistDevEmailPreview(payload);
    console.info(
      `[auth-mail] Stored email preview for ${to}. Subject: "${subject}". File: ${DEV_MAILBOX_PATH}`,
    );
    return;
  }

  try {
    if (EMAIL_PROVIDER === "sendgrid") {
      await sendViaSendGrid({ to, subject, text, html });
    } else {
      await sendViaResend({ to, subject, text, html });
    }
    persistDevEmailPreview({ ...payload, deliveryStatus: "sent" });
    console.info(`[auth-mail] Sent email to ${to} using ${EMAIL_PROVIDER}.`);
  } catch (error) {
    persistDevEmailPreview({
      ...payload,
      deliveryStatus: "failed",
      error: error instanceof Error ? error.message : "unknown",
    });
    console.error("[auth-mail] Failed to send email:", error);
    throw new Error(
      "Unable to deliver security email right now. Please try again.",
    );
  }
};

const sendLoginOtpEmail = async ({
  email,
  fullName,
  otp,
}: {
  email: string;
  fullName: string;
  otp: string;
}): Promise<void> => {
  const greeting = fullName || "there";
  const minutes = Math.round(LOGIN_OTP_TTL_MS / 60000);
  const text = [
    `Hi ${greeting},`,
    "",
    `Your EduHub login OTP is ${otp}.`,
    `This code expires in ${minutes} minutes.`,
    "",
    "If you did not try to log in, please ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hi ${greeting},</p>`,
    `<p>Your EduHub login OTP is <strong>${otp}</strong>.</p>`,
    `<p>This code expires in ${minutes} minutes.</p>`,
    "<p>If you did not try to log in, please ignore this email.</p>",
  ].join("");

  await sendSecurityEmail({
    to: email,
    subject: "EduHub login verification code",
    text,
    html,
  });
};

const normalizeFrontendBaseUrl = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

const buildPasswordResetUrl = (
  token: string,
  email: string,
  role: UserRole,
  frontendBaseUrl: string,
): string => {
  const params = new URLSearchParams({
    mode: "reset",
    token,
    email,
    role,
  });
  return `${frontendBaseUrl}/auth?${params.toString()}`;
};

const sendPasswordResetEmail = async ({
  email,
  fullName,
  resetUrl,
}: {
  email: string;
  fullName: string;
  resetUrl: string;
}): Promise<void> => {
  const greeting = fullName || "there";
  const minutes = Math.round(PASSWORD_RESET_TTL_MS / 60000);
  const text = [
    `Hi ${greeting},`,
    "",
    "We received a request to reset your EduHub password.",
    `Reset link: ${resetUrl}`,
    `This link expires in ${minutes} minutes.`,
    "",
    "If you did not request this reset, you can ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hi ${greeting},</p>`,
    "<p>We received a request to reset your EduHub password.</p>",
    `<p><a href=\"${resetUrl}\">Reset your password</a></p>`,
    `<p>This link expires in ${minutes} minutes.</p>`,
    "<p>If you did not request this reset, you can ignore this email.</p>",
  ].join("");

  await sendSecurityEmail({
    to: email,
    subject: "EduHub password reset",
    text,
    html,
  });
};

const createOtpCode = (): string =>
  String(randomInt(0, 10 ** LOGIN_OTP_LENGTH)).padStart(LOGIN_OTP_LENGTH, "0");

const clearLoginChallengesForEmail = (email: string): void => {
  for (const [challengeId, challenge] of loginOtpChallenges.entries()) {
    if (challenge.email === email) {
      loginOtpChallenges.delete(challengeId);
    }
  }
};

const cleanupExpiredLoginChallenges = (): void => {
  const now = Date.now();
  for (const [challengeId, challenge] of loginOtpChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      loginOtpChallenges.delete(challengeId);
    }
  }
};

const createLoginChallenge = (
  user: PublicUser,
): { challengeId: string; otp: string } => {
  cleanupExpiredLoginChallenges();
  clearLoginChallengesForEmail(user.email);

  const otp = createOtpCode();
  const challengeId = randomBytes(24).toString("hex");
  loginOtpChallenges.set(challengeId, {
    challengeId,
    email: user.email,
    role: user.role,
    user,
    otpHash: hashToken(otp),
    expiresAt: Date.now() + LOGIN_OTP_TTL_MS,
    attemptsRemaining: LOGIN_OTP_MAX_ATTEMPTS,
  });

  return { challengeId, otp };
};

const rotateLoginChallengeOtp = (
  challengeId: string,
): { challenge: PendingLoginOtpChallenge; otp: string } | null => {
  cleanupExpiredLoginChallenges();
  const challenge = loginOtpChallenges.get(challengeId);
  if (!challenge) {
    return null;
  }

  const otp = createOtpCode();
  challenge.otpHash = hashToken(otp);
  challenge.expiresAt = Date.now() + LOGIN_OTP_TTL_MS;
  challenge.attemptsRemaining = LOGIN_OTP_MAX_ATTEMPTS;

  return { challenge, otp };
};

const getOtpResponseMeta = (otp: string): Record<string, unknown> =>
  AUTH_DEBUG_ENABLED
    ? {
        debugOtpCode: otp,
      }
    : {};

const getResetResponseMeta = (resetUrl: string): Record<string, unknown> =>
  AUTH_DEBUG_ENABLED
    ? {
        debugResetLink: resetUrl,
      }
    : {};

const toPublicUser = (row: AuthUserRecord): PublicUser => {
  const roll = row.roll_number ?? "";
  return {
    id: Number(row.auth_user_id),
    email: String(row.email),
    role: row.role,
    fullName: String(row.full_name ?? ""),
    rollNumber: roll,
    studentId: roll || row.email,
  };
};

const toIsoDateString = (value: string | Date | null | undefined): string => {
  const parsed =
    value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
};

const toAdminMemberSummary = (row: AuthUserSummaryRow): AdminMemberSummary => ({
  id: Number(row.auth_user_id),
  email: row.email,
  role: toManagedRole(row.role),
  fullName: row.full_name ?? "",
  rollNumber: row.roll_number ?? "",
  phone: row.phone ?? "",
  department: row.department ?? "",
  year: row.academic_year ?? "",
  section: row.section ?? "",
  designation: row.designation ?? "",
  createdAt: toIsoDateString(row.created_at),
  updatedAt: toIsoDateString(row.updated_at ?? row.created_at),
  assignedClasses: [],
});

const toInMemoryAdminMemberSummary = (
  user: AuthUserRecord,
): AdminMemberSummary => ({
  id: Number(user.auth_user_id),
  email: user.email,
  role: toManagedRole(user.role),
  fullName: user.full_name ?? "",
  rollNumber: user.roll_number ?? "",
  phone: user.phone ?? "",
  department: user.department ?? "",
  year: user.academic_year ?? "",
  section: user.section ?? "",
  designation: user.designation ?? "",
  createdAt: toIsoDateString(user.created_at),
  updatedAt: toIsoDateString(user.updated_at ?? user.created_at),
  assignedClasses:
    user.role === "faculty"
      ? getInMemoryFacultyClassAllocations(Number(user.auth_user_id))
      : [],
});

const ensureAuthUsersTable = async (db: Pool | PoolClient): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      auth_user_id SERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL,
      full_name VARCHAR(255) NOT NULL DEFAULT '',
      roll_number VARCHAR(120),
      phone VARCHAR(40),
      department VARCHAR(120),
      academic_year VARCHAR(40),
      section VARCHAR(40),
      designation VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email VARCHAR(320)");
  await db.query("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT ''",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(120)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS phone VARCHAR(40)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS department VARCHAR(120)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS academic_year VARCHAR(40)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS section VARCHAR(40)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS designation VARCHAR(120)",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ",
  );
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_users'
          AND column_name = 'username'
      ) THEN
        EXECUTE 'UPDATE auth_users SET full_name = COALESCE(NULLIF(full_name, ''''), username) WHERE username IS NOT NULL';
        EXECUTE 'ALTER TABLE auth_users ALTER COLUMN username DROP NOT NULL';
      END IF;
    END $$;
  `);
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_users'
          AND column_name = 'password'
      ) THEN
        EXECUTE 'UPDATE auth_users SET password_hash = COALESCE(NULLIF(password_hash, ''''), password::text) WHERE password IS NOT NULL';
        EXECUTE 'ALTER TABLE auth_users ALTER COLUMN password DROP NOT NULL';
      END IF;
    END $$;
  `);
  await db.query("UPDATE auth_users SET password_hash = '' WHERE password_hash IS NULL");
  await db.query("ALTER TABLE auth_users ALTER COLUMN password_hash SET DEFAULT ''");
  await db.query(`
    UPDATE auth_users
    SET created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, created_at, NOW())
    WHERE created_at IS NULL OR updated_at IS NULL
  `);
  await db.query("ALTER TABLE auth_users ALTER COLUMN created_at SET DEFAULT NOW()");
  await db.query("ALTER TABLE auth_users ALTER COLUMN updated_at SET DEFAULT NOW()");
  await db.query("ALTER TABLE auth_users ALTER COLUMN created_at SET NOT NULL");
  await db.query("ALTER TABLE auth_users ALTER COLUMN updated_at SET NOT NULL");
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users (role)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email)",
  );
};

const seedDefaultAccounts = async (db: Pool | PoolClient): Promise<void> => {
  await db.query(
    `
      INSERT INTO auth_users (
        email,
        password_hash,
        role,
        full_name,
        roll_number,
        created_at,
        updated_at
      )
      SELECT defaults.email,
             defaults.password_hash,
             defaults.role,
             defaults.full_name,
             defaults.roll_number,
             NOW(),
             NOW()
      FROM (
        VALUES
          ($1, $2, 'admin', 'Admin User', NULL),
          ($3, $4, 'faculty', 'Faculty User', NULL),
          ($5, $6, 'student', 'Student User', 'STU001')
      ) AS defaults(email, password_hash, role, full_name, roll_number)
      WHERE NOT EXISTS (
        SELECT 1
        FROM auth_users existing
        WHERE existing.email = defaults.email
      )
    `,
    [
      "admin@eduhub.local",
      hashPassword("Admin@123"),
      "faculty@eduhub.local",
      hashPassword("Faculty@123"),
      "student@eduhub.local",
      hashPassword("Student@123"),
    ],
  );
};

const ensureInMemorySeedUsers = (): void => {
  const ensureDefaultUser = (user: Omit<AuthUserRecord, "auth_user_id">) => {
    const exists = inMemoryUsers.some(
      (current) => current.email === user.email,
    );
    if (exists) {
      return;
    }
    inMemoryUsers.push({
      auth_user_id: inMemoryUserId++,
      ...user,
    });
  };

  const now = new Date().toISOString();

  ensureDefaultUser({
    email: "admin@eduhub.local",
    role: "admin",
    full_name: "Admin User",
    roll_number: null,
    phone: null,
    department: null,
    academic_year: null,
    section: null,
    designation: null,
    password_hash: hashPassword("Admin@123"),
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    created_at: now,
    updated_at: now,
  });

  ensureDefaultUser({
    email: "faculty@eduhub.local",
    role: "faculty",
    full_name: "Faculty User",
    roll_number: null,
    phone: null,
    department: null,
    academic_year: null,
    section: null,
    designation: null,
    password_hash: hashPassword("Faculty@123"),
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    created_at: now,
    updated_at: now,
  });

  ensureDefaultUser({
    email: "student@eduhub.local",
    role: "student",
    full_name: "Student User",
    roll_number: "STU001",
    phone: null,
    department: null,
    academic_year: null,
    section: null,
    designation: null,
    password_hash: hashPassword("Student@123"),
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    created_at: now,
    updated_at: now,
  });
};

const createUserInDb = async (
  db: Pool | PoolClient,
  {
    email,
    password,
    role,
    fullName,
    rollNumber,
    phone = "",
    department = "",
    academicYear = "",
    section = "",
    designation = "",
    createdAt = null,
  }: UserCreateInput,
): Promise<{ user?: PublicUser; error?: string }> => {
  const exists = await db.query(
    "SELECT auth_user_id FROM auth_users WHERE email = $1",
    [email],
  );
  if ((exists.rowCount ?? 0) > 0) {
    return { error: "Account already exists for this email." };
  }

  const inserted = await db.query<AuthUserRecord>(
    `
      INSERT INTO auth_users (
        email,
        password_hash,
        role,
        full_name,
        roll_number,
        phone,
        department,
        academic_year,
        section,
        designation,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        COALESCE($11::timestamptz, NOW()),
        COALESCE($11::timestamptz, NOW())
      )
      RETURNING auth_user_id, email, role, full_name, roll_number, password_hash,
        password_reset_token_hash, password_reset_expires_at
    `,
    [
      email,
      hashPassword(password),
      role,
      fullName,
      rollNumber || null,
      phone || null,
      department || null,
      academicYear || null,
      section || null,
      designation || null,
      createdAt,
    ],
  );
  const createdUser = inserted.rows[0];
  if (role === "student") {
    try {
      await ensureStudentPortalContext(db, Number(createdUser.auth_user_id));
    } catch (error) {
      console.warn("Failed to sync student portal profile after creation:", error);
    }
  }
  return { user: toPublicUser(createdUser) };
};

const createUserInMemory = ({
  email,
  password,
  role,
  fullName,
  rollNumber,
  phone = "",
  department = "",
  academicYear = "",
  section = "",
  designation = "",
  createdAt = null,
}: UserCreateInput): { user?: PublicUser; error?: string } => {
  ensureInMemorySeedUsers();
  if (inMemoryUsers.some((user) => user.email === email)) {
    return { error: "Account already exists for this email." };
  }
  const createdTimestamp = createdAt ?? new Date().toISOString();
  const user: AuthUserRecord = {
    auth_user_id: inMemoryUserId++,
    email,
    role,
    full_name: fullName,
    roll_number: rollNumber || null,
    phone: phone || null,
    department: department || null,
    academic_year: academicYear || null,
    section: section || null,
    designation: designation || null,
    password_hash: hashPassword(password),
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    created_at: createdTimestamp,
    updated_at: createdTimestamp,
  };
  inMemoryUsers.push(user);
  return { user: toPublicUser(user) };
};

const countOrZero = async (
  db: Pool | PoolClient,
  query: string,
  params: unknown[] = [],
): Promise<number> => {
  try {
    const result = await db.query<{ value: number | string }>(query, params);
    return Number(result.rows[0]?.value ?? 0);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "42P01" || code === "42703") {
      return 0;
    }
    throw error;
  }
};

const getUserByEmailFromDb = async (
  db: Pool | PoolClient,
  email: string,
): Promise<AuthUserRecord | null> => {
  const result = await db.query<AuthUserRecord>(
    `
      SELECT auth_user_id, email, role, full_name, roll_number, password_hash,
        password_reset_token_hash, password_reset_expires_at
      FROM auth_users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] ?? null;
};

export const registerUser = async (req: Request, res: Response) => {
  const role = toRole(req.body?.role);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? "");
  const fullName = normalizeName(req.body?.fullName);
  const rollNumber = normalizeRollNumber(req.body?.rollNumber);

  if (role !== "student") {
    return res
      .status(400)
      .json({ error: "Only student self-registration is allowed." });
  }
  if (!email || !password || password.length < 6 || !fullName) {
    return res.status(400).json({
      error: "email, password (min 6 chars) and fullName are required.",
    });
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    const created = await createUserInDb(pool, {
      email,
      password,
      role,
      fullName,
      rollNumber,
    });
    if (created.error) {
      return res.status(409).json({ error: created.error });
    }
    return res.status(201).json({ user: created.user });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const created = createUserInMemory({
        email,
        password,
        role,
        fullName,
        rollNumber,
      });
      if (created.error) {
        return res.status(409).json({ error: created.error });
      }
      return res.status(201).json({ user: created.user });
    }

    console.error("Error registering user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createMemberByAdmin = async (req: Request, res: Response) => {
  const role = toAdminManagedRole(req.body?.role);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? "");
  const fullName = normalizeName(req.body?.name ?? req.body?.fullName);
  const phone = normalizePhone(req.body?.phone);
  const department = normalizeDepartment(req.body?.department);
  const academicYear = normalizeAcademicYear(
    req.body?.year ?? req.body?.academicYear,
  );
  const section = normalizeSection(req.body?.section);
  const designation = normalizeDesignation(req.body?.designation);
  const createdAt = normalizeCreatedAt(req.body?.created_at ?? req.body?.createdAt);

  if (!role) {
    return res
      .status(400)
      .json({ error: "role must be one of: student, faculty, admin." });
  }

  const rollNumber = normalizeRollNumber(
    role === "student"
      ? req.body?.studentId ?? req.body?.rollNumber
      : role === "faculty"
        ? req.body?.facultyId ?? req.body?.rollNumber
        : req.body?.adminId ?? req.body?.rollNumber,
  );

  if (!email || !password || password.length < 6 || !fullName) {
    return res.status(400).json({
      error: "name, email, and password (min 6 chars) are required.",
    });
  }
  if (!rollNumber) {
    return res
      .status(400)
      .json({
        error: `${getManagedMemberIdLabel(role)} is required for ${role} accounts.`,
      });
  }
  if (role === "student" && (!department || !academicYear || !section || !phone)) {
    return res.status(400).json({
      error:
        "department, year, section, and phone are required for student accounts.",
    });
  }
  if (role === "faculty" && (!department || !designation || !phone)) {
    return res.status(400).json({
      error:
        "department, designation, and phone are required for faculty accounts.",
    });
  }
  if (role === "admin" && !phone) {
    return res.status(400).json({
      error: "phone is required for admin accounts.",
    });
  }
  if (
    (req.body?.created_at !== undefined || req.body?.createdAt !== undefined) &&
    !createdAt
  ) {
    return res.status(400).json({ error: "created_at must be a valid date." });
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    const created = await createUserInDb(pool, {
      email,
      password,
      role,
      fullName,
      rollNumber,
      phone,
      department,
      academicYear,
      section,
      designation,
      createdAt,
    });
    if (created.error) {
      return res.status(409).json({ error: created.error });
    }
    return res.status(201).json({ user: created.user });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const created = createUserInMemory({
        email,
        password,
        role,
        fullName,
        rollNumber,
        phone,
        department,
        academicYear,
        section,
        designation,
        createdAt,
      });
      if (created.error) {
        return res.status(409).json({ error: created.error });
      }
      return res.status(201).json({ user: created.user });
    }

    console.error("Error creating member by admin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const parseAdminMemberIdParam = (
  req: Request,
  res: Response,
): number | null => {
  const memberId = Number(req.params.memberId);
  if (!Number.isInteger(memberId) || memberId <= 0) {
    res.status(400).json({ error: "Invalid member id." });
    return null;
  }
  return memberId;
};

const parseAdminRoleFilter = (
  req: Request,
  res: Response,
): AdminManagedRole | null => {
  const roleValue = req.query.role;
  if (roleValue === undefined) {
    return null;
  }
  if (typeof roleValue !== "string") {
    res.status(400).json({ error: "role query must be a single value." });
    return null;
  }

  const normalized = roleValue.trim().toLowerCase();
  if (!normalized || normalized === "all") {
    return null;
  }

  const role = toAdminManagedRole(normalized);
  if (!role) {
    res
      .status(400)
      .json({ error: "role query must be one of: all, student, faculty, admin." });
    return null;
  }

  return role;
};

const parseAdminSearchFilter = (req: Request, res: Response): string | null => {
  const searchValue = req.query.search;
  if (searchValue === undefined) {
    return "";
  }
  if (typeof searchValue !== "string") {
    res.status(400).json({ error: "search query must be a single value." });
    return null;
  }
  return searchValue.trim().toLowerCase().slice(0, 120);
};

const getInMemoryAdminMembers = (): AdminMemberSummary[] =>
  inMemoryUsers
    .filter(
      (user) =>
        user.role === "student" ||
        user.role === "faculty" ||
        user.role === "admin",
    )
    .map(toInMemoryAdminMemberSummary)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

const matchesAdminMemberSearch = (
  member: AdminMemberSummary,
  search: string,
): boolean => {
  if (!search) {
    return true;
  }

  return (
    member.fullName.toLowerCase().includes(search) ||
    member.email.toLowerCase().includes(search) ||
    member.rollNumber.toLowerCase().includes(search) ||
    member.phone.toLowerCase().includes(search) ||
    member.department.toLowerCase().includes(search) ||
    member.year.toLowerCase().includes(search) ||
    member.section.toLowerCase().includes(search) ||
    member.designation.toLowerCase().includes(search)
  );
};

const filterAdminMembers = (
  members: AdminMemberSummary[],
  roleFilter: AdminManagedRole | null,
  search: string,
): AdminMemberSummary[] =>
  members.filter((member) => {
    if (roleFilter && member.role !== roleFilter) {
      return false;
    }
    return matchesAdminMemberSearch(member, search);
  });

const getAdminMemberCounts = (members: AdminMemberSummary[]) => ({
  total: members.length,
  faculty: members.filter((member) => member.role === "faculty").length,
  students: members.filter((member) => member.role === "student").length,
  admins: members.filter((member) => member.role === "admin").length,
});

const attachAssignedClassesToMembers = (
  members: AdminMemberSummary[],
  allocationsByFacultyId: Map<number, FacultyClassAllocation[]>,
): AdminMemberSummary[] =>
  members.map((member) =>
    member.role === "faculty"
      ? {
          ...member,
          assignedClasses: allocationsByFacultyId.get(member.id) ?? [],
        }
      : member,
  );

const buildClassAllocationKey = (
  allocation: Pick<FacultyClassAllocation, "className" | "batchId">,
): string =>
  allocation.batchId && allocation.batchId > 0
    ? `batch:${allocation.batchId}`
    : `class:${normalizeClassName(allocation.className)}`;

const normalizeFacultyClassAllocationsPayload = (
  body: unknown,
): {
  error?: string;
  payload?: FacultyClassAllocation[];
} => {
  const rawBody =
    body && typeof body === "object"
      ? (body as { allocations?: unknown })
      : {};
  const rawAllocations = rawBody.allocations;

  if (!Array.isArray(rawAllocations)) {
    return { error: "allocations must be an array." };
  }

  const deduped = new Map<string, FacultyClassAllocation>();
  for (const rawAllocation of rawAllocations) {
    const row =
      rawAllocation && typeof rawAllocation === "object"
        ? (rawAllocation as {
            className?: unknown;
            batchId?: unknown;
            department?: unknown;
            academicYear?: unknown;
            section?: unknown;
            studentCount?: unknown;
          })
        : {};

    const className = normalizeOptionalText(row.className, 255);
    const batchId = Number(row.batchId);
    const normalizedBatchId =
      Number.isInteger(batchId) && batchId > 0 ? batchId : null;
    const department = normalizeDepartment(row.department);
    const academicYear = normalizeAcademicYear(row.academicYear);
    const section = normalizeSection(row.section);

    if (!className) {
      return { error: "Each allocation must include a className." };
    }

    const allocation: FacultyClassAllocation = {
      className,
      batchId: normalizedBatchId,
      department,
      academicYear,
      section,
      studentCount: 0,
    };

    deduped.set(buildClassAllocationKey(allocation), allocation);
  }

  return {
    payload: Array.from(deduped.values()).sort((left, right) =>
      left.className.localeCompare(right.className),
    ),
  };
};

export const getAdminMembers = async (req: Request, res: Response) => {
  const roleFilter = parseAdminRoleFilter(req, res);
  if (roleFilter === null && req.query.role && req.query.role !== "all") {
    const roleValue = req.query.role;
    if (typeof roleValue === "string") {
      const normalized = roleValue.trim().toLowerCase();
      if (
        normalized &&
        normalized !== "all" &&
        !toAdminManagedRole(normalized)
      ) {
        return;
      }
    } else {
      return;
    }
  }

  const search = parseAdminSearchFilter(req, res);
  if (search === null) {
    return;
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    await ensureFacultyClassAllocationsTable(pool);

    const queryParams: unknown[] = [];
    let whereClause = "WHERE role IN ('student', 'faculty', 'admin')";
    if (roleFilter) {
      queryParams.push(roleFilter);
      whereClause += ` AND role = $${queryParams.length}`;
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause +=
        ` AND (` +
        `LOWER(full_name) LIKE $${queryParams.length} ` +
        `OR LOWER(email) LIKE $${queryParams.length} ` +
        `OR LOWER(COALESCE(roll_number, '')) LIKE $${queryParams.length} ` +
        `OR LOWER(COALESCE(phone, '')) LIKE $${queryParams.length} ` +
        `OR LOWER(COALESCE(department, '')) LIKE $${queryParams.length} ` +
        `OR LOWER(COALESCE(academic_year, '')) LIKE $${queryParams.length} ` +
        `OR LOWER(COALESCE(section, '')) LIKE $${queryParams.length} ` +
        `OR LOWER(COALESCE(designation, '')) LIKE $${queryParams.length}` +
        `)`;
    }

    const result = await pool.query<AuthUserSummaryRow>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, phone,
          department, academic_year, section, designation, created_at, updated_at
        FROM auth_users
        ${whereClause}
        ORDER BY created_at DESC
      `,
      queryParams,
    );

    const allocationsByFacultyId = await getAllFacultyClassAllocations(pool);
    const members = attachAssignedClassesToMembers(
      result.rows.map(toAdminMemberSummary),
      allocationsByFacultyId,
    );
    return res.json({
      members,
      counts: getAdminMemberCounts(members),
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const members = filterAdminMembers(
        getInMemoryAdminMembers(),
        roleFilter,
        search,
      );
      return res.json({
        members,
        counts: getAdminMemberCounts(members),
      });
    }

    console.error("Error fetching admin members:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAdminClassOptions = async (req: Request, res: Response) => {
  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);

    const classOptions = await listAvailableFacultyClassOptions(pool);
    return res.json({ classOptions });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      return res.json({
        classOptions: buildFacultyClassOptionsFromStudentRows(
          inMemoryUsers
            .filter((user) => user.role === "student")
            .map((user) => ({
              department: user.department ?? "",
              academic_year: user.academic_year ?? "",
              section: user.section ?? "",
            })),
        ),
      });
    }

    console.error("Error fetching admin class options:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateFacultyClassAllocations = async (
  req: Request,
  res: Response,
) => {
  const memberId = parseAdminMemberIdParam(req, res);
  if (!memberId) {
    return;
  }

  const normalized = normalizeFacultyClassAllocationsPayload(req.body);
  if (normalized.error || !normalized.payload) {
    return res
      .status(400)
      .json({ error: normalized.error ?? "Invalid allocation payload." });
  }

  const requestedAllocations = normalized.payload;

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await ensureAuthUsersTable(client);
      await seedDefaultAccounts(client);
      await ensureFacultyClassAllocationsTable(client);

      const memberResult = await client.query<AuthUserSummaryRow>(
        `
          SELECT auth_user_id, email, role, full_name, roll_number, phone,
            department, academic_year, section, designation, created_at, updated_at
          FROM auth_users
          WHERE auth_user_id = $1
          LIMIT 1
        `,
        [memberId],
      );
      const member = memberResult.rows[0];
      if (!member) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Member not found." });
      }
      if (member.role !== "faculty") {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Class allocations can only be assigned to faculty." });
      }

      const availableOptions = await listAvailableFacultyClassOptions(client);
      const existingAllocations = await getFacultyClassAllocations(client, memberId);
      const validAllocationKeys = new Set(
        [...availableOptions, ...existingAllocations].map((allocation) =>
          buildClassAllocationKey(allocation),
        ),
      );

      const hasInvalidAllocation = requestedAllocations.some(
        (allocation) => !validAllocationKeys.has(buildClassAllocationKey(allocation)),
      );
      if (hasInvalidAllocation) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error:
            "One or more selected classes are no longer available. Refresh the page and try again.",
        });
      }

      await client.query(
        "DELETE FROM faculty_class_allocations WHERE faculty_id = $1",
        [memberId],
      );

      for (const allocation of requestedAllocations) {
        await client.query(
          `
            INSERT INTO faculty_class_allocations (
              faculty_id,
              class_name,
              batch_id,
              department,
              academic_year,
              section,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `,
          [
            memberId,
            allocation.className,
            allocation.batchId,
            allocation.department || null,
            allocation.academicYear || null,
            allocation.section || null,
          ],
        );
      }

      await client.query("COMMIT");
      return res.json({
        memberId,
        assignedClasses: requestedAllocations,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const member = inMemoryUsers.find((user) => user.auth_user_id === memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found." });
      }
      if (member.role !== "faculty") {
        return res
          .status(400)
          .json({ error: "Class allocations can only be assigned to faculty." });
      }

      const availableOptions = buildFacultyClassOptionsFromStudentRows(
        inMemoryUsers
          .filter((user) => user.role === "student")
          .map((user) => ({
            department: user.department ?? "",
            academic_year: user.academic_year ?? "",
            section: user.section ?? "",
          })),
      );
      const existingAllocations = getInMemoryFacultyClassAllocations(memberId);
      const validAllocationKeys = new Set(
        [...availableOptions, ...existingAllocations].map((allocation) =>
          buildClassAllocationKey(allocation),
        ),
      );

      const hasInvalidAllocation = requestedAllocations.some(
        (allocation) => !validAllocationKeys.has(buildClassAllocationKey(allocation)),
      );
      if (hasInvalidAllocation) {
        return res.status(400).json({
          error:
            "One or more selected classes are no longer available. Refresh the page and try again.",
        });
      }

      return res.json({
        memberId,
        assignedClasses: setInMemoryFacultyClassAllocations(
          memberId,
          requestedAllocations,
        ),
      });
    }

    console.error("Error updating faculty class allocations:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFacultyClassAllocationsForCurrentUser = async (
  req: Request,
  res: Response,
) => {
  const authUser =
    req && typeof req === "object" && "user" in req
      ? ((req as Request & { user?: { userId?: unknown; role?: unknown } }).user ??
          null)
      : null;
  const userId = Number(authUser?.userId);
  const role = String(authUser?.role ?? "").trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Authentication is required." });
  }
  if (role !== "faculty" && role !== "admin") {
    return res
      .status(403)
      .json({ error: "Only faculty or admin users can view class allocations." });
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    await ensureFacultyClassAllocationsTable(pool);

    const classAllocations = await getFacultyClassAllocations(pool, userId);
    return res.json({
      classAllocations,
      totalAllocatedClasses: classAllocations.length,
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const classAllocations = getInMemoryFacultyClassAllocations(userId);
      return res.json({
        classAllocations,
        totalAllocatedClasses: classAllocations.length,
      });
    }

    console.error("Error fetching faculty class allocations:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getCurrentUserProfile = async (req: Request, res: Response) => {
  const authUser =
    req && typeof req === "object" && "user" in req
      ? ((req as Request & { user?: { userId?: unknown } }).user ?? null)
      : null;
  const userId = Number(authUser?.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);

    const result = await pool.query<AuthUserSummaryRow>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, phone,
          department, academic_year, section, designation, created_at, updated_at
        FROM auth_users
        WHERE auth_user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const studentContext =
      user.role === "student"
        ? await ensureStudentPortalContext(pool, userId)
        : null;

    return res.json({
      id: Number(user.auth_user_id),
      email: user.email,
      role: toManagedRole(user.role),
      fullName: user.full_name ?? "",
      rollNumber: user.roll_number ?? "",
      studentId: user.roll_number ?? user.email,
      phone: user.phone ?? "",
      department: studentContext?.department || user.department || "",
      academicYear: studentContext?.academicYear || user.academic_year || "",
      section: studentContext?.section || user.section || "",
      designation: user.designation ?? "",
      batchId: studentContext?.batchId ?? null,
      batchName: studentContext?.batchName ?? "",
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const user = inMemoryUsers.find((item) => item.auth_user_id === userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.json({
        id: Number(user.auth_user_id),
        email: user.email,
        role: toManagedRole(user.role),
        fullName: user.full_name ?? "",
        rollNumber: user.roll_number ?? "",
        studentId: user.roll_number ?? user.email,
        phone: user.phone ?? "",
        department: user.department ?? "",
        academicYear: user.academic_year ?? "",
        section: user.section ?? "",
        designation: user.designation ?? "",
        batchId: null,
        batchName: "",
      });
    }

    console.error("Error fetching current user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateAdminMember = async (req: Request, res: Response) => {
  const memberId = parseAdminMemberIdParam(req, res);
  if (!memberId) {
    return;
  }

  const email = normalizeEmail(req.body?.email);
  const fullName = normalizeName(req.body?.fullName);
  const rollNumber = normalizeRollNumber(req.body?.rollNumber);
  const password = String(req.body?.password ?? "").trim();
  const roleOverride = req.body?.role;

  if (!email || !fullName) {
    return res.status(400).json({ error: "email and fullName are required." });
  }
  if (password && password.length < 6) {
    return res
      .status(400)
      .json({ error: "password must be at least 6 characters if provided." });
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);

    const existingResult = await pool.query<AuthUserSummaryRow>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, phone,
          department, academic_year, section, designation, created_at, updated_at
        FROM auth_users
        WHERE auth_user_id = $1
        LIMIT 1
      `,
      [memberId],
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      return res.status(404).json({ error: "Member not found." });
    }

    const existingRole = toAdminManagedRole(existing.role);
    if (!existingRole) {
      return res
        .status(400)
        .json({ error: "Only managed accounts can be edited." });
    }

    if (roleOverride !== undefined) {
      const requestedRole = toAdminManagedRole(roleOverride);
      if (!requestedRole || requestedRole !== existingRole) {
        return res
          .status(400)
          .json({ error: "Role changes are not supported." });
      }
    }

    if (!rollNumber) {
      return res
        .status(400)
        .json({
          error: `${getManagedMemberIdLabel(existingRole)} is required for ${existingRole} accounts.`,
        });
    }

    const duplicateEmailResult = await pool.query(
      "SELECT auth_user_id FROM auth_users WHERE email = $1 AND auth_user_id <> $2 LIMIT 1",
      [email, memberId],
    );
    if ((duplicateEmailResult.rowCount ?? 0) > 0) {
      return res
        .status(409)
        .json({ error: "Another account already uses this email." });
    }

    const updateResult = password
      ? await pool.query<AuthUserSummaryRow>(
          `
            UPDATE auth_users
            SET email = $1,
                full_name = $2,
                roll_number = $3,
                password_hash = $4,
                updated_at = NOW()
            WHERE auth_user_id = $5
            RETURNING auth_user_id, email, role, full_name, roll_number, phone,
              department, academic_year, section, designation, created_at, updated_at
          `,
          [
            email,
            fullName,
            rollNumber || null,
            hashPassword(password),
            memberId,
          ],
        )
      : await pool.query<AuthUserSummaryRow>(
          `
            UPDATE auth_users
            SET email = $1,
                full_name = $2,
                roll_number = $3,
                updated_at = NOW()
            WHERE auth_user_id = $4
            RETURNING auth_user_id, email, role, full_name, roll_number, phone,
              department, academic_year, section, designation, created_at, updated_at
          `,
          [email, fullName, rollNumber || null, memberId],
        );

    const updated = updateResult.rows[0];
    if (updated.role === "student") {
      try {
        await ensureStudentPortalContext(pool, memberId);
      } catch (syncError) {
        console.warn("Failed to sync student portal profile after update:", syncError);
      }
    }
    return res.json({ member: toAdminMemberSummary(updated) });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const member = inMemoryUsers.find(
        (user) => user.auth_user_id === memberId,
      );
      if (!member) {
        return res.status(404).json({ error: "Member not found." });
      }
      if (member.role !== "student" && member.role !== "faculty") {
        if (member.role !== "admin") {
          return res
            .status(400)
            .json({ error: "Only managed accounts can be edited." });
        }
      }

      if (roleOverride !== undefined) {
        const requestedRole = toAdminManagedRole(roleOverride);
        if (!requestedRole || requestedRole !== toManagedRole(member.role)) {
          return res
            .status(400)
            .json({ error: "Role changes are not supported." });
        }
      }

      if (!rollNumber) {
        return res
          .status(400)
          .json({
            error: `${getManagedMemberIdLabel(toManagedRole(member.role))} is required for ${member.role} accounts.`,
          });
      }

      if (
        inMemoryUsers.some(
          (user) =>
            user.auth_user_id !== memberId &&
            user.email.toLowerCase() === email,
        )
      ) {
        return res
          .status(409)
          .json({ error: "Another account already uses this email." });
      }

      member.email = email;
      member.full_name = fullName;
      member.roll_number = rollNumber || null;
      if (password) {
        member.password_hash = hashPassword(password);
      }
      member.updated_at = new Date().toISOString();

      return res.json({
        member: toInMemoryAdminMemberSummary(member),
      });
    }

    console.error("Error updating admin member:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteAdminMember = async (req: Request, res: Response) => {
  const memberId = parseAdminMemberIdParam(req, res);
  if (!memberId) {
    return;
  }

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    await ensureFacultyClassAllocationsTable(pool);

    const deletedResult = await pool.query<AuthUserSummaryRow>(
      `
        DELETE FROM auth_users
        WHERE auth_user_id = $1
          AND role IN ('student', 'faculty', 'admin')
        RETURNING auth_user_id, email, role, full_name, roll_number, phone,
          department, academic_year, section, designation, created_at, updated_at
      `,
      [memberId],
    );

    const deleted = deletedResult.rows[0];
    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Member not found or cannot be deleted." });
    }

    await pool.query(
      "DELETE FROM faculty_class_allocations WHERE faculty_id = $1",
      [memberId],
    );

    return res.json({
      deleted: toAdminMemberSummary(deleted),
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const index = inMemoryUsers.findIndex(
        (user) =>
          user.auth_user_id === memberId &&
          (user.role === "student" ||
            user.role === "faculty" ||
            user.role === "admin"),
      );
      if (index === -1) {
        return res
          .status(404)
          .json({ error: "Member not found or cannot be deleted." });
      }

      const [deleted] = inMemoryUsers.splice(index, 1);
      clearInMemoryFacultyClassAllocations(memberId);
      return res.json({
        deleted: toInMemoryAdminMemberSummary({
          ...deleted,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    console.error("Error deleting admin member:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAdminDashboardData = async (req: Request, res: Response) => {
  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);

    const roleCounts = await pool.query<{
      role: UserRole;
      total: number | string;
    }>(
      `
        SELECT role, COUNT(*) AS total
        FROM auth_users
        GROUP BY role
      `,
    );

    const countMap: Record<UserRole, number> = {
      student: 0,
      faculty: 0,
      admin: 0,
    };
    roleCounts.rows.forEach((row) => {
      countMap[row.role] = Number(row.total ?? 0);
    });

    const recentMembersResult = await pool.query<AuthUserSummaryRow>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, created_at
        FROM auth_users
        ORDER BY created_at DESC
        LIMIT 10
      `,
    );

    const recentFacultyResult = await pool.query<AuthUserSummaryRow>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, created_at
        FROM auth_users
        WHERE role = 'faculty'
        ORDER BY created_at DESC
        LIMIT 5
      `,
    );

    const recentStudentsResult = await pool.query<AuthUserSummaryRow>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, created_at
        FROM auth_users
        WHERE role = 'student'
        ORDER BY created_at DESC
        LIMIT 5
      `,
    );

    const quizzesCount = await countOrZero(
      pool,
      "SELECT COUNT(*) AS value FROM quizzes",
    );
    const assignmentsCount = await countOrZero(
      pool,
      "SELECT COUNT(*) AS value FROM assignments",
    );
    const notesCount = await countOrZero(
      pool,
      "SELECT COUNT(*) AS value FROM notes",
    );
    const pendingQuizReviews = await countOrZero(
      pool,
      "SELECT COUNT(*) AS value FROM quiz_attempts WHERE status = 'Submitted' AND faculty_score IS NULL",
    );
    const pendingAssignmentReviews = await countOrZero(
      pool,
      "SELECT COUNT(*) AS value FROM assignment_submissions WHERE faculty_score IS NULL",
    );
    const recentStudentRegistrations = await countOrZero(
      pool,
      "SELECT COUNT(*) AS value FROM auth_users WHERE role = 'student' AND created_at >= NOW() - INTERVAL '7 days'",
    );
    const studentQuizParticipants = await countOrZero(
      pool,
      "SELECT COUNT(DISTINCT student_id) AS value FROM quiz_attempts",
    );
    const studentAssignmentSubmitters = await countOrZero(
      pool,
      "SELECT COUNT(DISTINCT student_id) AS value FROM assignment_submissions",
    );

    return res.json({
      metrics: {
        totalMembers: countMap.student + countMap.faculty + countMap.admin,
        totalStudents: countMap.student,
        totalFaculty: countMap.faculty,
        totalAdmins: countMap.admin,
        quizzesCount,
        assignmentsCount,
        notesCount,
        pendingQuizReviews,
        pendingAssignmentReviews,
      },
      facultyOverview: {
        total: countMap.faculty,
        pendingQuizReviews,
        pendingAssignmentReviews,
        recentlyAdded: recentFacultyResult.rows.map((row) => ({
          id: Number(row.auth_user_id),
          email: row.email,
          role: row.role,
          fullName: row.full_name,
          rollNumber: row.roll_number ?? "",
          createdAt: new Date(row.created_at).toISOString(),
        })),
      },
      studentOverview: {
        total: countMap.student,
        recentRegistrations7d: recentStudentRegistrations,
        quizParticipants: studentQuizParticipants,
        assignmentSubmitters: studentAssignmentSubmitters,
        recentlyAdded: recentStudentsResult.rows.map((row) => ({
          id: Number(row.auth_user_id),
          email: row.email,
          role: row.role,
          fullName: row.full_name,
          rollNumber: row.roll_number ?? "",
          createdAt: new Date(row.created_at).toISOString(),
        })),
      },
      recentMembers: recentMembersResult.rows.map((row) => ({
        id: Number(row.auth_user_id),
        email: row.email,
        role: row.role,
        fullName: row.full_name,
        rollNumber: row.roll_number ?? "",
        createdAt: new Date(row.created_at).toISOString(),
      })),
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const members = inMemoryUsers
        .slice()
        .reverse()
        .slice(0, 10)
        .map((row) => ({
          id: Number(row.auth_user_id),
          email: row.email,
          role: row.role,
          fullName: row.full_name,
          rollNumber: row.roll_number ?? "",
          createdAt: new Date().toISOString(),
        }));
      const students = inMemoryUsers.filter((u) => u.role === "student").length;
      const faculty = inMemoryUsers.filter((u) => u.role === "faculty").length;
      const admins = inMemoryUsers.filter((u) => u.role === "admin").length;
      const recentFaculty = members
        .filter((m) => m.role === "faculty")
        .slice(0, 5);
      const recentStudents = members
        .filter((m) => m.role === "student")
        .slice(0, 5);
      return res.json({
        metrics: {
          totalMembers: inMemoryUsers.length,
          totalStudents: students,
          totalFaculty: faculty,
          totalAdmins: admins,
          quizzesCount: 0,
          assignmentsCount: 0,
          notesCount: 0,
          pendingQuizReviews: 0,
          pendingAssignmentReviews: 0,
        },
        facultyOverview: {
          total: faculty,
          pendingQuizReviews: 0,
          pendingAssignmentReviews: 0,
          recentlyAdded: recentFaculty,
        },
        studentOverview: {
          total: students,
          recentRegistrations7d: recentStudents.length,
          quizParticipants: 0,
          assignmentSubmitters: 0,
          recentlyAdded: recentStudents,
        },
        recentMembers: members,
      });
    }

    console.error("Error fetching admin dashboard data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const role = toRole(req.body?.role);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? "");
  const ipAddress = getClientIp(req);

  if (!role || !email || !password) {
    return res
      .status(400)
      .json({ error: "role, email and password are required." });
  }

  const loginRequestRate = applyRateLimit(
    authRateLimitStore,
    toKey("auth", "login", "ip", ipAddress),
    LOGIN_REQUEST_RATE_LIMIT,
  );
  if (!loginRequestRate.allowed) {
    return respondWithRateLimit(
      res,
      loginRequestRate.retryAfterMs,
      "Too many login attempts from this network.",
    );
  }

  const loginFailureKey = toKey("auth", "login", "failure", email);
  const otpFailureKey = toKey("auth", "otp", "failure", email);
  const otpSendRateKey = toKey("auth", "otp", "send", email, ipAddress);

  const loginLockoutRemaining = getLockoutRemainingMs(
    loginFailureLockouts,
    loginFailureKey,
  );
  if (loginLockoutRemaining > 0) {
    return respondWithRateLimit(
      res,
      loginLockoutRemaining,
      "This account is temporarily locked due to failed login attempts.",
    );
  }

  const otpLockoutRemaining = getLockoutRemainingMs(
    otpFailureLockouts,
    otpFailureKey,
  );
  if (otpLockoutRemaining > 0) {
    return respondWithRateLimit(
      res,
      otpLockoutRemaining,
      "OTP verification is temporarily locked for this account.",
    );
  }

  const respondForInvalidCredentials = () => {
    const lockoutMs = recordFailureAndGetLockoutMs(
      loginFailureLockouts,
      loginFailureKey,
      LOGIN_FAILURE_LOCKOUT,
    );
    if (lockoutMs > 0) {
      return respondWithRateLimit(
        res,
        lockoutMs,
        "Too many failed login attempts for this account.",
      );
    }
    return res.status(401).json({ error: "Invalid credentials." });
  };

  const toLoginOtpResponse = (
    user: PublicUser,
    otp: string,
    challengeId: string,
  ) => ({
    otpRequired: true,
    message: "Enter the 6-digit code to complete login.",
    challengeId,
    maskedEmail: maskEmail(user.email),
    expiresInSeconds: Math.floor(LOGIN_OTP_TTL_MS / 1000),
    ...getOtpResponseMeta(otp),
  });

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    const user = await getUserByEmailFromDb(pool, email);

    if (
      !user ||
      user.role !== role ||
      !verifyPassword(password, user.password_hash)
    ) {
      return respondForInvalidCredentials();
    }

    const otpSendRate = applyRateLimit(
      authRateLimitStore,
      otpSendRateKey,
      OTP_RESEND_RATE_LIMIT,
    );
    if (!otpSendRate.allowed) {
      return respondWithRateLimit(
        res,
        otpSendRate.retryAfterMs,
        "Too many OTP requests for this account.",
      );
    }

    clearFailures(loginFailureLockouts, loginFailureKey);
    const publicUser = toPublicUser(user);
    if (publicUser.role === "student") {
      try {
        await ensureStudentPortalContext(pool, publicUser.id);
      } catch (syncError) {
        console.warn("Failed to sync student portal profile during login:", syncError);
      }
    }

    // Direct token login - OTP disabled for simplicity
    const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
    const token = jwt.sign(
      {
        userId: publicUser.id,
        email: publicUser.email,
        role: publicUser.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    clearFailures(loginFailureLockouts, loginFailureKey);

    return res.json({ user: publicUser, token });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const user = inMemoryUsers.find((item) => item.email === email);
      if (
        !user ||
        user.role !== role ||
        !verifyPassword(password, user.password_hash)
      ) {
        return respondForInvalidCredentials();
      }

      const publicUser = toPublicUser(user);

      // Direct token login - OTP disabled
      const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
      const token = jwt.sign(
        {
          userId: publicUser.id,
          email: publicUser.email,
          role: publicUser.role,
        },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      clearFailures(loginFailureLockouts, loginFailureKey);

      return res.json({ user: publicUser, token });
    }

    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unable to deliver security email")
    ) {
      return res.status(503).json({ error: error.message });
    }

    console.error("Error logging in user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyLoginOtp = async (req: Request, res: Response) => {
  const role = toRole(req.body?.role);
  const email = normalizeEmail(req.body?.email);
  const challengeId = String(req.body?.challengeId ?? "").trim();
  const otp = normalizeOtp(req.body?.otp);
  const ipAddress = getClientIp(req);

  if (!role || !email || !challengeId || otp.length !== LOGIN_OTP_LENGTH) {
    return res.status(400).json({
      error: "role, email, challengeId and a valid 6-digit otp are required.",
    });
  }

  const otpVerifyRate = applyRateLimit(
    authRateLimitStore,
    toKey("auth", "otp", "verify", "ip", ipAddress),
    OTP_VERIFY_REQUEST_RATE_LIMIT,
  );
  if (!otpVerifyRate.allowed) {
    return respondWithRateLimit(
      res,
      otpVerifyRate.retryAfterMs,
      "Too many OTP verification attempts from this network.",
    );
  }

  const otpFailureKey = toKey("auth", "otp", "failure", email);
  const otpLockoutRemaining = getLockoutRemainingMs(
    otpFailureLockouts,
    otpFailureKey,
  );
  if (otpLockoutRemaining > 0) {
    return respondWithRateLimit(
      res,
      otpLockoutRemaining,
      "OTP verification is temporarily locked for this account.",
    );
  }

  cleanupExpiredLoginChallenges();
  const challenge = loginOtpChallenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (challenge) {
      loginOtpChallenges.delete(challengeId);
    }
    return res
      .status(400)
      .json({ error: "OTP challenge is invalid or expired." });
  }

  if (challenge.email !== email || challenge.role !== role) {
    return res.status(401).json({ error: "Invalid OTP challenge context." });
  }

  const incomingOtpHash = hashToken(otp);
  if (!compareHashes(challenge.otpHash, incomingOtpHash)) {
    challenge.attemptsRemaining -= 1;
    const otpLockoutMs = recordFailureAndGetLockoutMs(
      otpFailureLockouts,
      otpFailureKey,
      OTP_FAILURE_LOCKOUT,
    );
    if (otpLockoutMs > 0) {
      clearLoginChallengesForEmail(email);
      return respondWithRateLimit(
        res,
        otpLockoutMs,
        "Too many invalid OTP attempts for this account.",
      );
    }

    if (challenge.attemptsRemaining <= 0) {
      loginOtpChallenges.delete(challengeId);
      return res
        .status(401)
        .json({ error: "Invalid OTP. Please login again." });
    }
    return res.status(401).json({
      error: `Invalid OTP. ${challenge.attemptsRemaining} attempt(s) remaining.`,
    });
  }

  // Generate JWT token for API authentication
  const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
  const token = jwt.sign(
    {
      userId: challenge.user.id,
      email: challenge.user.email,
      role: challenge.user.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  loginOtpChallenges.delete(challengeId);
  clearFailures(otpFailureLockouts, otpFailureKey);
  clearFailures(loginFailureLockouts, toKey("auth", "login", "failure", email));
  return res.json({ user: challenge.user, token });
};

export const resendLoginOtp = async (req: Request, res: Response) => {
  const challengeId = String(req.body?.challengeId ?? "").trim();
  const ipAddress = getClientIp(req);
  if (!challengeId) {
    return res.status(400).json({ error: "challengeId is required." });
  }

  const resendIpRate = applyRateLimit(
    authRateLimitStore,
    toKey("auth", "otp", "resend", "ip", ipAddress),
    OTP_RESEND_RATE_LIMIT,
  );
  if (!resendIpRate.allowed) {
    return respondWithRateLimit(
      res,
      resendIpRate.retryAfterMs,
      "Too many OTP resend requests from this network.",
    );
  }

  cleanupExpiredLoginChallenges();
  const challenge = loginOtpChallenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (challenge) {
      loginOtpChallenges.delete(challengeId);
    }
    return res
      .status(400)
      .json({ error: "OTP challenge is invalid or expired." });
  }

  const otpFailureKey = toKey("auth", "otp", "failure", challenge.email);
  const otpLockoutRemaining = getLockoutRemainingMs(
    otpFailureLockouts,
    otpFailureKey,
  );
  if (otpLockoutRemaining > 0) {
    return respondWithRateLimit(
      res,
      otpLockoutRemaining,
      "OTP verification is temporarily locked for this account.",
    );
  }

  const resendAccountRate = applyRateLimit(
    authRateLimitStore,
    toKey("auth", "otp", "resend", challenge.email, ipAddress),
    OTP_RESEND_RATE_LIMIT,
  );
  if (!resendAccountRate.allowed) {
    return respondWithRateLimit(
      res,
      resendAccountRate.retryAfterMs,
      "Too many OTP requests for this account.",
    );
  }

  const refreshed = rotateLoginChallengeOtp(challengeId);
  if (!refreshed || refreshed.challenge.expiresAt <= Date.now()) {
    if (refreshed) {
      loginOtpChallenges.delete(challengeId);
    }
    return res
      .status(400)
      .json({ error: "OTP challenge is invalid or expired." });
  }

  try {
    await sendLoginOtpEmail({
      email: refreshed.challenge.email,
      fullName: refreshed.challenge.user.fullName,
      otp: refreshed.otp,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unable to deliver security email")
    ) {
      return res.status(503).json({ error: error.message });
    }
    console.error("Error resending OTP:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({
    message: "A new 6-digit code has been sent.",
    challengeId,
    maskedEmail: maskEmail(refreshed.challenge.email),
    expiresInSeconds: Math.floor(LOGIN_OTP_TTL_MS / 1000),
    ...getOtpResponseMeta(refreshed.otp),
  });
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const role = toRole(req.body?.role);
  const email = normalizeEmail(req.body?.email);
  const ipAddress = getClientIp(req);
  const frontendBaseUrl =
    normalizeFrontendBaseUrl(req.body?.frontendBaseUrl) ??
    normalizeFrontendBaseUrl(req.get("origin")) ??
    FRONTEND_BASE_URL;

  if (!email) {
    return res.status(400).json({ error: "email is required." });
  }

  const resetRequestRate = applyRateLimit(
    authRateLimitStore,
    toKey("auth", "password-reset", "request", email, ipAddress),
    PASSWORD_RESET_REQUEST_RATE_LIMIT,
  );
  if (!resetRequestRate.allowed) {
    return respondWithRateLimit(
      res,
      resetRequestRate.retryAfterMs,
      "Too many password reset requests.",
    );
  }

  const genericMessage =
    "If an account exists for this email, a password reset link has been sent.";

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);
    const user = await getUserByEmailFromDb(pool, email);

    if (user && (!role || user.role === role)) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      await pool.query(
        `
          UPDATE auth_users
          SET
            password_reset_token_hash = $1,
            password_reset_expires_at = $2,
            updated_at = NOW()
          WHERE auth_user_id = $3
        `,
        [tokenHash, expiresAt.toISOString(), user.auth_user_id],
      );

      const resetUrl = buildPasswordResetUrl(
        token,
        email,
        user.role,
        frontendBaseUrl,
      );
      try {
        await sendPasswordResetEmail({
          email,
          fullName: user.full_name,
          resetUrl,
        });
      } catch (mailError) {
        if (
          mailError instanceof Error &&
          mailError.message
            .toLowerCase()
            .includes("unable to deliver security email")
        ) {
          return res.status(503).json({ error: mailError.message });
        }
        throw mailError;
      }

      return res.json({
        message: genericMessage,
        ...getResetResponseMeta(resetUrl),
      });
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const user = inMemoryUsers.find(
        (item) => item.email === email && (!role || item.role === role),
      );
      if (user) {
        const token = randomBytes(32).toString("hex");
        user.password_reset_token_hash = hashToken(token);
        user.password_reset_expires_at = new Date(
          Date.now() + PASSWORD_RESET_TTL_MS,
        );

        const resetUrl = buildPasswordResetUrl(
          token,
          email,
          user.role,
          frontendBaseUrl,
        );
        try {
          await sendPasswordResetEmail({
            email,
            fullName: user.full_name,
            resetUrl,
          });
        } catch (mailError) {
          if (
            mailError instanceof Error &&
            mailError.message
              .toLowerCase()
              .includes("unable to deliver security email")
          ) {
            return res.status(503).json({ error: mailError.message });
          }
          throw mailError;
        }

        return res.json({
          message: genericMessage,
          ...getResetResponseMeta(resetUrl),
        });
      }

      return res.json({ message: genericMessage });
    }

    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unable to deliver security email")
    ) {
      return res.status(503).json({ error: error.message });
    }

    console.error("Error requesting password reset:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const token = String(req.body?.token ?? "").trim();
  const newPassword = String(req.body?.newPassword ?? "");
  const ipAddress = getClientIp(req);
  const resetFailureKey = toKey("auth", "password-reset", "failure", ipAddress);

  if (!token || newPassword.length < 6) {
    return res.status(400).json({
      error: "token and newPassword (min 6 chars) are required.",
    });
  }

  const resetSubmitRate = applyRateLimit(
    authRateLimitStore,
    toKey("auth", "password-reset", "submit", ipAddress),
    PASSWORD_RESET_SUBMIT_RATE_LIMIT,
  );
  if (!resetSubmitRate.allowed) {
    return respondWithRateLimit(
      res,
      resetSubmitRate.retryAfterMs,
      "Too many password reset attempts from this network.",
    );
  }

  const resetLockoutRemaining = getLockoutRemainingMs(
    resetFailureLockouts,
    resetFailureKey,
  );
  if (resetLockoutRemaining > 0) {
    return respondWithRateLimit(
      res,
      resetLockoutRemaining,
      "Password reset is temporarily locked due to invalid reset attempts.",
    );
  }

  const tokenHash = hashToken(token);

  try {
    await ensureAuthUsersTable(pool);
    await seedDefaultAccounts(pool);

    const result = await pool.query<AuthUserRecord>(
      `
        SELECT auth_user_id, email, role, full_name, roll_number, password_hash,
          password_reset_token_hash, password_reset_expires_at
        FROM auth_users
        WHERE password_reset_token_hash = $1
          AND password_reset_expires_at IS NOT NULL
          AND password_reset_expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash],
    );

    const user = result.rows[0];
    if (!user) {
      const lockoutMs = recordFailureAndGetLockoutMs(
        resetFailureLockouts,
        resetFailureKey,
        RESET_FAILURE_LOCKOUT,
      );
      if (lockoutMs > 0) {
        return respondWithRateLimit(
          res,
          lockoutMs,
          "Too many invalid password reset attempts.",
        );
      }
      return res
        .status(400)
        .json({ error: "Reset link is invalid or expired." });
    }

    await pool.query(
      `
        UPDATE auth_users
        SET
          password_hash = $1,
          password_reset_token_hash = NULL,
          password_reset_expires_at = NULL,
          updated_at = NOW()
        WHERE auth_user_id = $2
      `,
      [hashPassword(newPassword), user.auth_user_id],
    );

    clearFailures(resetFailureLockouts, resetFailureKey);
    clearLoginChallengesForEmail(user.email);
    return res.json({
      message:
        "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      ensureInMemorySeedUsers();
      const now = Date.now();
      const user = inMemoryUsers.find((item) => {
        if (
          !item.password_reset_token_hash ||
          !item.password_reset_expires_at
        ) {
          return false;
        }

        return (
          compareHashes(item.password_reset_token_hash, tokenHash) &&
          getExpiryTimestamp(item.password_reset_expires_at) > now
        );
      });

      if (!user) {
        const lockoutMs = recordFailureAndGetLockoutMs(
          resetFailureLockouts,
          resetFailureKey,
          RESET_FAILURE_LOCKOUT,
        );
        if (lockoutMs > 0) {
          return respondWithRateLimit(
            res,
            lockoutMs,
            "Too many invalid password reset attempts.",
          );
        }
        return res
          .status(400)
          .json({ error: "Reset link is invalid or expired." });
      }

      user.password_hash = hashPassword(newPassword);
      user.password_reset_token_hash = null;
      user.password_reset_expires_at = null;
      clearFailures(resetFailureLockouts, resetFailureKey);
      clearLoginChallengesForEmail(user.email);

      return res.json({
        message:
          "Password reset successful. You can now log in with your new password.",
      });
    }

    console.error("Error resetting password:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
