import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import pool, { ensureDatabaseConnection } from "./utils/db";
import quizRoutes from "./routes/quizRoutes";
import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import eventRoutes from "./routes/eventRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import timetableRoutes from "./routes/timetableRoutes";
import { createTestRoutes } from "./routes/testRoutes";
import { createFacultyTestRoutes } from "./routes/facultyTestRoutes";
import studentTestRoutes from "./routes/studentTestRoutes";
import aiRoutes from "./routes/aiRoutes";
import { authenticateToken } from "./middlewares/auth";
import { buildAllowedOrigins, isAllowedOrigin } from "./utils/corsOrigins";

const app: Express = express();
const defaultPort = Number(process.env.PORT) || 3000;
app.set("trust proxy", 1);

// Use real database connection
let db: Pool | null = pool;
console.log("[DB] Using PostgreSQL database connection");

// Auth middleware
const authMiddleware = authenticateToken;

const allowedOrigins = buildAllowedOrigins(
  process.env.FRONTEND_BASE_URL,
  process.env.CORS_ALLOWED_ORIGINS,
);

// Configure CORS to allow requests from Vercel, ngrok, and local development
const corsOptions: cors.CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin, allowedOrigins)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
console.log("[CORS] Configured with allowed origins:", allowedOrigins);

// Log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});
// Notes file upload is sent as base64 JSON; keep body limit above encoded 20 MB payload.
app.use(express.json({ limit: "35mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "EduHub Backend API Gateway",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    frontendUrl:
      process.env.FRONTEND_BASE_URL ||
      "Configure FRONTEND_BASE_URL to link to your Vercel deployment",
    endpoints: {
      health: "/api",
      auth: "/api/login",
      aiChat: "/api/ai/chat",
      aiQuiz: "/api/ai/generate-quiz",
      tasks: "/api/tasks",
      events: "/api/events",
      attendance: "/api/attendance",
      quizzes: "/api/quizzes",
      timetable: "/api/timetable",
    },
  });
});

app.get("/api", (req: Request, res: Response) => {
  res.send("Welcome to EduHub Backend!");
});

app.use("/api", authRoutes);
app.use("/api", quizRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/ai", aiRoutes);

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

const frontendDistPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "dist",
);
const frontendIndexPath = path.join(frontendDistPath, "index.html");
if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req: Request, res: Response) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return res.status(404).json({ message: "Not found" });
    }
    return res.sendFile(frontendIndexPath);
  });
} else {
  console.warn(
    `[Frontend] Build not found at ${frontendIndexPath}. Run \"npm run build\" in the frontend to serve the UI from the backend.`,
  );
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
    console.log(`Server is running at http://localhost:${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the existing process on that port and restart EduHub.`,
      );
      process.exit(1);
    }

    throw error;
  });
};

const start = async () => {
  await ensureDatabaseConnection();
  startServer(defaultPort);
};

start().catch((error) => {
  console.error("[DB] Database connection failed:", error);
  process.exit(1);
});
