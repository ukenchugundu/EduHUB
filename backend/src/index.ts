import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { AddressInfo } from "net";
import { Pool } from "pg";
import Redis from "ioredis";
import pool from "./utils/db";
import quizRoutes from "./routes/quizRoutes";
import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import eventRoutes from "./routes/eventRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import timetableRoutes from "./routes/timetableRoutes";
import { createTestRoutes } from "./routes/testRoutes";
import { createFacultyTestRoutes } from "./routes/facultyTestRoutes";
import studentTestRoutes from "./routes/studentTestRoutes";
import { authenticateToken } from "./middlewares/auth";
import { buildAllowedOrigins } from "./utils/corsOrigins";

const app: Express = express();
const defaultPort = Number(process.env.PORT) || 3000;
const allowPortFallback = process.env.ALLOW_PORT_FALLBACK === "true";

// Use real database connection
let db: Pool | null = pool;
console.log("[DB] Using PostgreSQL database connection");

// Redis connection (optional)
let redis: Redis | null = null;
let redisConnected = false;
try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  redis.on("error", (err) => {
    if (!redisConnected) {
      console.log("[Redis] Connection failed, using in-memory cache");
      redisConnected = true;
      redis = null;
    }
  });
  redis.on("connect", () => {
    console.log("[Redis] Connected successfully");
    redisConnected = true;
  });
} catch (error) {
  console.log("[Redis] Redis not available, using in-memory cache");
}

// Auth middleware
const authMiddleware = authenticateToken;

const allowedOrigins = buildAllowedOrigins(
  process.env.FRONTEND_BASE_URL,
  process.env.CORS_ALLOWED_ORIGINS,
);

// Configure CORS to allow requests from Vercel, ngrok, and local development
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // Also allow any vercel.app domain for preview deployments
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
console.log("[CORS] Configured with allowed origins:", corsOptions.origin);

// Log all requests
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});
// Notes file upload is sent as base64 JSON; keep body limit above encoded 20 MB payload.
app.use(express.json({ limit: "35mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.get("/api", (req: Request, res: Response) => {
  res.send("Welcome to EduHub Backend!");
});

app.use("/api", authRoutes);
app.use("/api", quizRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);

import { createMockRoutes } from "./routes/mockRoutes";

// Test routes - use database if available, otherwise use mock data
if (db) {
  app.use("/api/tests", authMiddleware, createTestRoutes(db));
  app.use("/api/faculty", authMiddleware, createFacultyTestRoutes(db));
  app.use("/api/student", authMiddleware, studentTestRoutes);
} else {
  console.log("[API] Using mock data for test routes");
  app.use("/api/student", studentTestRoutes);
  app.use("/api/faculty", studentTestRoutes);
  app.use("/api", authMiddleware, createMockRoutes());
}

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  const errorType =
    typeof error === "object" && error !== null && "type" in error
      ? String((error as { type?: unknown }).type ?? "")
      : "";

  if (errorType === "entity.too.large") {
    return res.status(413).json({
      error:
        "Uploaded file is too large. Maximum supported file size is 20 MB.",
    });
  }

  return next(error);
});

const startServer = (port: number) => {
  const server = app.listen(port, () => {
    const address = server.address() as AddressInfo | null;
    const activePort = address?.port ?? port;
    console.log(`Server is running at http://localhost:${activePort}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      if (!allowPortFallback) {
        console.error(
          `Port ${port} is already in use. Stop the existing process on that port and restart EduHub so the frontend proxy stays aligned with the backend.`,
        );
        process.exit(1);
      }

      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    throw error;
  });
};

startServer(defaultPort);
