const fs = require("fs");
const path = require("path");
const { randomBytes, scryptSync } = require("crypto");
const { Pool } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..", "..");

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

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

const sslConfig = connectionString.includes(".supabase.co")
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 60000,
});

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const restoreDepartment = {
  code: "CSD",
  name: "Computer Science and Data Science",
};

const restoreBatches = [
  { name: "I CSD-A", academicYear: "2024-2025", semester: 1 },
  { name: "I CSD-B", academicYear: "2024-2025", semester: 1 },
  { name: "II CSD-A", academicYear: "2024-2025", semester: 2 },
  { name: "II CSD-B", academicYear: "2024-2025", semester: 2 },
  { name: "III CSD-A", academicYear: "2024-2025", semester: 3 },
  { name: "III CSD-B", academicYear: "2024-2025", semester: 3 },
  { name: "IV CSD-A", academicYear: "2024-2025", semester: 4 },
  { name: "IV CSD-B", academicYear: "2024-2025", semester: 4 },
];

const restoreUsers = [
  {
    email: "admin@eduhub.local",
    password: "Admin@123",
    role: "admin",
    fullName: "Admin User",
    rollNumber: null,
    phone: null,
    department: null,
    academicYear: null,
    section: null,
    designation: null,
  },
  {
    email: "faculty@eduhub.local",
    password: "Faculty@123",
    role: "faculty",
    fullName: "Faculty User",
    rollNumber: null,
    phone: "9999999999",
    department: restoreDepartment.name,
    academicYear: null,
    section: null,
    designation: "Assistant Professor",
  },
  {
    email: "student@eduhub.local",
    password: "Student@123",
    role: "student",
    fullName: "Student User",
    rollNumber: "STU001",
    phone: null,
    department: restoreDepartment.name,
    academicYear: "2nd yr",
    section: "A",
    designation: null,
  },
];

const ensureAuthUsersTable = async (db) => {
  await db.query(`
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
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await db.query(
    "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
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
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users (role)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email)",
  );
  await db.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_roll_number_unique ON auth_users (roll_number) WHERE roll_number IS NOT NULL",
  );
};

const ensureAcademicTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS department (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS batch (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      department_id INTEGER NOT NULL REFERENCES department(id) ON DELETE CASCADE,
      academic_year VARCHAR(20) NOT NULL,
      semester INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(name, department_id, academic_year)
    )
  `);

  await db.query(`
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
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS batch_student (
      batch_id INTEGER NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
      PRIMARY KEY (batch_id, student_id)
    )
  `);

  await db.query(`
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
    )
  `);

  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_student_department_id ON student (department_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_student_batch_id ON student (batch_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_batch_department_id ON batch (department_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_faculty_class_allocations_faculty ON faculty_class_allocations (faculty_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_faculty_class_allocations_batch ON faculty_class_allocations (batch_id)",
  );
  await db.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_class_allocations_unique_class ON faculty_class_allocations (faculty_id, lower(class_name))",
  );
  await db.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_class_allocations_unique_batch ON faculty_class_allocations (faculty_id, batch_id) WHERE batch_id IS NOT NULL",
  );

  await db.query("DROP VIEW IF EXISTS departments");
  await db.query("DROP VIEW IF EXISTS batches");
  await db.query("DROP VIEW IF EXISTS students");
  await db.query("CREATE VIEW departments AS SELECT * FROM department");
  await db.query("CREATE VIEW batches AS SELECT * FROM batch");
  await db.query("CREATE VIEW students AS SELECT * FROM student");
};

const ensureDefaultUsers = async (db) => {
  const idsByEmail = new Map();

  for (const user of restoreUsers) {
    const existingResult = await db.query(
      "SELECT auth_user_id FROM auth_users WHERE email = $1 LIMIT 1",
      [user.email],
    );

    if (existingResult.rows[0]?.auth_user_id) {
      const userId = Number(existingResult.rows[0].auth_user_id);
      idsByEmail.set(user.email, userId);

      await db.query(
        `
          UPDATE auth_users
          SET role = $2,
              full_name = $3,
              roll_number = $4,
              phone = $5,
              department = $6,
              academic_year = $7,
              section = $8,
              designation = $9,
              updated_at = NOW()
          WHERE email = $1
        `,
        [
          user.email,
          user.role,
          user.fullName,
          user.rollNumber,
          user.phone,
          user.department,
          user.academicYear,
          user.section,
          user.designation,
        ],
      );
      continue;
    }

    const insertResult = await db.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING auth_user_id
      `,
      [
        user.email,
        hashPassword(user.password),
        user.role,
        user.fullName,
        user.rollNumber,
        user.phone,
        user.department,
        user.academicYear,
        user.section,
        user.designation,
      ],
    );

    idsByEmail.set(user.email, Number(insertResult.rows[0].auth_user_id));
  }

  return idsByEmail;
};

const seedDepartmentAndBatches = async (db) => {
  await db.query(
    `
      INSERT INTO department (name, code, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (code)
      DO UPDATE SET name = EXCLUDED.name
    `,
    [restoreDepartment.name, restoreDepartment.code],
  );

  const departmentResult = await db.query(
    "SELECT id FROM department WHERE code = $1 LIMIT 1",
    [restoreDepartment.code],
  );
  const departmentId = Number(departmentResult.rows[0]?.id);
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    throw new Error("Failed to create or load the CSD department.");
  }

  for (const batch of restoreBatches) {
    await db.query(
      `
        INSERT INTO batch (name, department_id, academic_year, semester, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (name, department_id, academic_year) DO NOTHING
      `,
      [batch.name, departmentId, batch.academicYear, batch.semester],
    );
  }
};

const buildAllocationRows = async (db, facultyId) => {
  const result = await db.query(
    `
      SELECT b.id, b.name, b.academic_year, d.name AS department_name
      FROM batch b
      JOIN department d ON d.id = b.department_id
      WHERE d.code = $1
      ORDER BY b.semester ASC, b.name ASC
    `,
    [restoreDepartment.code],
  );

  await db.query("DELETE FROM faculty_class_allocations WHERE faculty_id = $1", [
    facultyId,
  ]);

  for (const row of result.rows) {
    const className = String(row.name ?? "").trim();
    const sectionMatch = className.match(/-([A-Z0-9]+)$/);
    const section = sectionMatch?.[1] ?? "";

    await db.query(
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
        facultyId,
        className,
        Number(row.id),
        String(row.department_name ?? ""),
        String(row.academic_year ?? ""),
        section,
      ],
    );
  }

  return result.rowCount ?? 0;
};

const countRows = async (db, tableName) => {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
};

const main = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureAuthUsersTable(client);
    await ensureAcademicTables(client);
    const idsByEmail = await ensureDefaultUsers(client);
    await seedDepartmentAndBatches(client);
    const facultyId = idsByEmail.get("faculty@eduhub.local");
    const allocationCount = facultyId
      ? await buildAllocationRows(client, facultyId)
      : 0;
    await client.query("COMMIT");

    const summary = {
      databaseHost: connectionString.match(/@([^:/]+)/)?.[1] ?? "unknown",
      authUsers: await countRows(client, "auth_users"),
      departments: await countRows(client, "department"),
      batches: await countRows(client, "batch"),
      students: await countRows(client, "student"),
      batchStudentLinks: await countRows(client, "batch_student"),
      facultyClassAllocations: await countRows(client, "faculty_class_allocations"),
      allocationRowsSeeded: allocationCount,
      adminEmail: "admin@eduhub.local",
      facultyEmail: "faculty@eduhub.local",
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
