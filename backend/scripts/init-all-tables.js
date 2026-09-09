const fs = require("fs");
const path = require("path");
const { randomBytes, scryptSync } = require("crypto");
const { Pool } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..", "..");

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const fileContent = fs.readFileSync(filePath, "utf8");
  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadEnvFile(path.join(ROOT_DIR, ".env"));
loadEnvFile(path.join(ROOT_DIR, "backend", ".env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const isSupabase =
  connectionString.includes(".supabase.") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("supabase.com");

const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 30000,
});

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const runInit = async () => {
  const client = await pool.connect();
  console.log("Connected to database successfully.");

  try {
    // 1. Auth Users
    console.log("Ensuring auth_users...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        auth_user_id SERIAL PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL DEFAULT '',
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        full_name VARCHAR(255) NOT NULL DEFAULT '',
        roll_number VARCHAR(120),
        phone VARCHAR(40),
        department VARCHAR(120),
        academic_year VARCHAR(40),
        section VARCHAR(40),
        designation VARCHAR(120),
        password_reset_token_hash TEXT,
        password_reset_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users (role);
      CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_roll_number_unique ON auth_users (roll_number) WHERE roll_number IS NOT NULL;
    `);

    // Seed default accounts if missing
    console.log("Seeding default auth users...");
    const defaultUsers = [
      {
        email: "admin@eduhub.local",
        password: "Admin@123",
        role: "admin",
        fullName: "System Admin",
      },
      {
        email: "faculty@eduhub.local",
        password: "Faculty@123",
        role: "faculty",
        fullName: "Dr. Sarah Mitchell",
        department: "Computer Science and Data Science",
        designation: "Associate Professor",
      },
      {
        email: "student@eduhub.local",
        password: "Student@123",
        role: "student",
        fullName: "Alex Chen",
        rollNumber: "STU001",
        department: "Computer Science and Data Science",
        academicYear: "2nd yr",
        section: "A",
      },
    ];

    for (const u of defaultUsers) {
      await client.query(
        `
        INSERT INTO auth_users (email, password_hash, role, full_name, roll_number, department, designation, academic_year, section)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          updated_at = NOW()
      `,
        [
          u.email,
          hashPassword(u.password),
          u.role,
          u.fullName,
          u.rollNumber || null,
          u.department || null,
          u.designation || null,
          u.academicYear || null,
          u.section || null,
        ],
      );
    }

    // 2. Department, Batch, Student, Batch_Student
    console.log("Ensuring academic tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS department (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS batch (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department_id INTEGER NOT NULL REFERENCES department(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL,
        semester INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(name, department_id, academic_year)
      );

      CREATE TABLE IF NOT EXISTS student (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(120) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        department_id INTEGER REFERENCES department(id) ON DELETE SET NULL,
        year INTEGER,
        section VARCHAR(40),
        batch_id INTEGER REFERENCES batch(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS batch_student (
        batch_id INTEGER NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        PRIMARY KEY (batch_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS faculty_class_allocations (
        allocation_id SERIAL PRIMARY KEY,
        faculty_id INT NOT NULL,
        class_name VARCHAR(255) NOT NULL,
        batch_id INT,
        department VARCHAR(120),
        academic_year VARCHAR(40),
        section VARCHAR(40),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      DROP VIEW IF EXISTS departments;
      DROP VIEW IF EXISTS batches;
      DROP VIEW IF EXISTS students;
      CREATE VIEW departments AS SELECT * FROM department;
      CREATE VIEW batches AS SELECT * FROM batch;
      CREATE VIEW students AS SELECT * FROM student;
    `);

    // Seed CSD Department & Batches
    await client.query(`
      INSERT INTO department (name, code)
      VALUES ('Computer Science and Data Science', 'CSD')
      ON CONFLICT (code) DO NOTHING;
    `);

    const deptRes = await client.query("SELECT id FROM department WHERE code = 'CSD'");
    const deptId = deptRes.rows[0]?.id;

    const batches = [
      { name: "I CSD-A", year: "2024-2025", sem: 1 },
      { name: "I CSD-B", year: "2024-2025", sem: 1 },
      { name: "II CSD-A", year: "2024-2025", sem: 2 },
      { name: "II CSD-B", year: "2024-2025", sem: 2 },
      { name: "III CSD-A", year: "2024-2025", sem: 3 },
      { name: "III CSD-B", year: "2024-2025", sem: 3 },
      { name: "IV CSD-A", year: "2024-2025", sem: 4 },
      { name: "IV CSD-B", year: "2024-2025", sem: 4 },
    ];

    for (const b of batches) {
      await client.query(`
        INSERT INTO batch (name, department_id, academic_year, semester)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name, department_id, academic_year) DO NOTHING;
      `, [b.name, deptId, b.year, b.sem]);
    }

    // Allocate classes to faculty
    const facultyRes = await client.query("SELECT auth_user_id FROM auth_users WHERE email = 'faculty@eduhub.local'");
    const facultyId = facultyRes.rows[0]?.auth_user_id;

    if (facultyId) {
      const batchRows = await client.query("SELECT id, name, academic_year FROM batch WHERE department_id = $1", [deptId]);
      for (const row of batchRows.rows) {
        const sec = row.name.includes("-") ? row.name.split("-")[1] : "A";
        await client.query(`
          INSERT INTO faculty_class_allocations (faculty_id, class_name, batch_id, department, academic_year, section)
          VALUES ($1, $2, $3, 'Computer Science and Data Science', $4, $5)
          ON CONFLICT DO NOTHING;
        `, [facultyId, row.name, row.id, row.academic_year, sec]);
      }
    }

    // 3. Quizzes, Questions, Options, Quiz Attempts, Quiz Attempt Answers
    console.log("Ensuring quizzes and questions tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        cls VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        questions INTEGER NOT NULL DEFAULT 0,
        duration VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        text TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS options (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        option_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
        score INTEGER,
        faculty_score INTEGER,
        faculty_feedback TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        submitted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        selected_option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
        is_correct BOOLEAN
      );
    `);

    // 4. Assignments & Submissions
    console.log("Ensuring assignment tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        assignment_id SERIAL PRIMARY KEY,
        cls VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_date TIMESTAMPTZ NOT NULL,
        max_score NUMERIC NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS assignment_submissions (
        submission_id SERIAL PRIMARY KEY,
        assignment_id INT REFERENCES assignments(assignment_id) ON DELETE CASCADE,
        student_id VARCHAR(120) NOT NULL,
        submission_text TEXT NOT NULL,
        file_url TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        faculty_score NUMERIC,
        reviewed_at TIMESTAMPTZ,
        UNIQUE (assignment_id, student_id)
      );
    `);

    // 5. Notes
    console.log("Ensuring notes table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        note_id SERIAL PRIMARY KEY,
        cls VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        chapter VARCHAR(255) NOT NULL DEFAULT '',
        file_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes (subject);
      CREATE INDEX IF NOT EXISTS idx_notes_cls ON notes (cls);
    `);

    // 6. Tasks
    console.log("Ensuring tasks table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_date TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration INTEGER,
        total_marks INTEGER,
        passing_score INTEGER,
        max_attempts INTEGER,
        instructions TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        notifications TEXT,
        proctoring TEXT,
        target_students TEXT
      );
    `);

    // 7. Events & Registrations
    console.log("Ensuring events table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMPTZ NOT NULL,
        location VARCHAR(255),
        max_participants INTEGER,
        image_url VARCHAR(500),
        category VARCHAR(100) DEFAULT 'Conference',
        status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
        created_by INTEGER REFERENCES auth_users(auth_user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES auth_users(auth_user_id) ON DELETE CASCADE,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      );
    `);

    // 8. Attendance Sessions & Records
    console.log("Ensuring attendance tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES batch(id) ON DELETE CASCADE,
        faculty_id INTEGER REFERENCES auth_users(auth_user_id),
        subject VARCHAR(255) NOT NULL,
        topic VARCHAR(255),
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(batch_id, subject, session_date, start_time)
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES auth_users(auth_user_id),
        status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        marked_by INTEGER REFERENCES auth_users(auth_user_id),
        UNIQUE(session_id, student_id)
      );
    `);

    // 9. Timetable Entries
    console.log("Ensuring timetable entries...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS timetable_entries (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
        faculty_id INTEGER REFERENCES auth_users(auth_user_id) ON DELETE SET NULL,
        subject VARCHAR(255) NOT NULL,
        topic TEXT,
        room VARCHAR(255),
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_by INTEGER REFERENCES auth_users(auth_user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 10. Coding Tests & Sandbox Telemetry
    console.log("Ensuring coding tests & live proctoring schema...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_tests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        faculty_id INTEGER REFERENCES auth_users(auth_user_id) ON DELETE SET NULL,
        batch_id INTEGER REFERENCES batch(id) ON DELETE SET NULL,
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        allow_multiple_attempts BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES coding_tests(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        input_format TEXT,
        output_format TEXT,
        constraints TEXT,
        sample_input TEXT,
        sample_output TEXT,
        test_cases JSONB DEFAULT '[]'::jsonb,
        difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
        points INTEGER DEFAULT 10,
        time_limit_seconds INTEGER DEFAULT 30,
        memory_limit_mb INTEGER DEFAULT 256,
        starter_code TEXT
      );

      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES coding_tests(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES student(id) ON DELETE CASCADE,
        start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMPTZ,
        status VARCHAR(20) CHECK (status IN ('In Progress', 'Submitted', 'Terminated', 'Time Up')),
        total_score INTEGER DEFAULT 0,
        plagiarism_score DECIMAL(5,2) DEFAULT 0,
        cheating_flags JSONB DEFAULT '[]'::jsonb,
        is_flagged BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS question_submissions (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES test_questions(id) ON DELETE CASCADE,
        code TEXT,
        language VARCHAR(50) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('Pending', 'Running', 'Accepted', 'Wrong Answer', 'Time Limit', 'Runtime Error', 'Compile Error')),
        score INTEGER DEFAULT 0,
        execution_time INTEGER,
        memory_used INTEGER,
        test_cases_passed INTEGER DEFAULT 0,
        total_test_cases INTEGER DEFAULT 0,
        submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cheating_logs (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plagiarism_results (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER REFERENCES question_submissions(id) ON DELETE CASCADE,
        similar_submission_id INTEGER REFERENCES question_submissions(id) ON DELETE CASCADE,
        similarity_score DECIMAL(5,2) NOT NULL,
        matching_lines JSONB,
        algorithm_used VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Student Performance & Analytics
    console.log("Ensuring student performance...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_performance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER,
        metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
        attendance_percentage DECIMAL(5,2) DEFAULT 0,
        quiz_score DECIMAL(5,2) DEFAULT 0,
        assessment_score DECIMAL(5,2) DEFAULT 0,
        interaction_score DECIMAL(5,2) DEFAULT 0,
        literacy_percentage DECIMAL(5,2) DEFAULT 0,
        literacy_level VARCHAR(10) DEFAULT 'Medium',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 12. Seed Sample Event and Sample Note if empty
    const eventCount = await client.query("SELECT COUNT(*)::int AS count FROM events");
    if ((eventCount.rows[0]?.count || 0) === 0) {
      console.log("Seeding sample campus event...");
      await client.query(`
        INSERT INTO events (title, description, event_date, location, max_participants, category, status)
        VALUES ('EduHub Annual Tech Symposium 2026', 'Flagship AI & Software Engineering Conference featuring student showcases and keynote speakers.', NOW() + INTERVAL '14 days', 'Main Auditorium & Virtual Stream', 500, 'Symposium', 'upcoming')
      `);
    }

    const noteCount = await client.query("SELECT COUNT(*)::int AS count FROM notes");
    if ((noteCount.rows[0]?.count || 0) === 0) {
      console.log("Seeding sample academic note...");
      await client.query(`
        INSERT INTO notes (cls, subject, title, content, chapter, file_url)
        VALUES ('II CSD-A', 'Machine Learning', 'Lecture 1: Foundations of Deep Neural Networks', 'Introduction to backpropagation, gradient descent, and multi-layer perceptrons.', 'Chapter 1', 'https://ynfmqjmdibnnlcuospdo.supabase.co/storage/v1/object/public/EduHub/sample_ml_intro.pdf')
      `);
    }

    // Check all public tables
    const tableRes = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("\n=== PUBLIC DATABASE INVENTORY ===");
    const tableNames = [];
    for (const row of tableRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*)::int as count FROM "${row.table_name}"`).catch(() => ({ rows: [{ count: -1 }] }));
      tableNames.push({ table: row.table_name, type: row.table_type, rows: countRes.rows[0].count });
    }
    console.table(tableNames);

  } finally {
    client.release();
    await pool.end();
  }
};

runInit().catch((err) => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
