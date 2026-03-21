const fs = require("fs");
const path = require("path");
const { randomBytes, scryptSync } = require("crypto");
const csv = require("csv-parser");
const { Pool } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DEFAULT_CSV_PATH = path.resolve(
  ROOT_DIR,
  "backend",
  "imports",
  "csd-ii-year-students.csv",
);

const DEFAULT_DEPARTMENT = "Computer Science and Data Science";
const DEFAULT_YEAR = "2nd yr";

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

loadEnvFile(path.resolve(ROOT_DIR, ".env"));
loadEnvFile(path.resolve(ROOT_DIR, "backend", ".env"));

const normalizeText = (value) => String(value ?? "").trim();
const normalizeUpperText = (value) => normalizeText(value).toUpperCase();

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const ensureAuthUsersTable = async (db) => {
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

const getExistingTableName = async (db, candidates) => {
  for (const tableName of candidates) {
    const result = await db.query("SELECT to_regclass($1)::text AS name", [
      `public.${tableName}`,
    ]);
    if (result.rows[0]?.name) {
      return tableName;
    }
  }

  return null;
};

const getStudentMappingTargetTable = async (db, batchMappingTableName) => {
  if (!batchMappingTableName) {
    return null;
  }

  const result = await db.query(
    `
      SELECT ccu.table_name AS referenced_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'student_id'
      LIMIT 1
    `,
    [batchMappingTableName],
  );

  return result.rows[0]?.referenced_table ?? null;
};

const getMinimumTwoDigitNumber = (value) => String(Number(value)).padStart(2, "0");

const deriveEmailFromRollNumber = (rollNumber) => {
  const normalizedRollNumber = normalizeUpperText(rollNumber);

  const lateralMatch = normalizedRollNumber.match(
    /^(?<admissionYear>\d{2})[A-Z0-9]+L(?<suffix>\d{2})$/,
  );
  if (lateralMatch?.groups) {
    return `20${lateralMatch.groups.admissionYear}csd.l${lateralMatch.groups.suffix}@svce.edu.in`;
  }

  const regularMatch = normalizedRollNumber.match(
    /^(?<admissionYear>\d{2})[A-Z0-9]+(?<suffix>\d{3})$/,
  );
  if (regularMatch?.groups) {
    return `20${regularMatch.groups.admissionYear}csd.r${getMinimumTwoDigitNumber(
      regularMatch.groups.suffix,
    )}@svce.edu.in`;
  }

  throw new Error(`Could not derive email from roll number "${rollNumber}".`);
};

const derivePasswordFromName = (fullName) => {
  const tokens = normalizeText(fullName)
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  if (!tokens.length) {
    throw new Error(`Could not derive password from name "${fullName}".`);
  }

  return `${tokens[tokens.length - 1].toUpperCase()}@123`;
};

const deriveSectionFromSerialNumber = (serialNumber) =>
  Number(serialNumber) >= 73 ? "B" : "A";

const deriveBatchName = (student) => {
  const normalizedYear = normalizeText(student.year).toLowerCase();
  let romanYear = "II";

  if (normalizedYear.startsWith("1") || normalizedYear.includes("1st")) {
    romanYear = "I";
  } else if (normalizedYear.startsWith("3") || normalizedYear.includes("3rd")) {
    romanYear = "III";
  } else if (normalizedYear.startsWith("4") || normalizedYear.includes("4th")) {
    romanYear = "IV";
  }

  return `${romanYear} CSD-${normalizeUpperText(student.section)}`;
};

const readStudentsFromCsv = async (csvPath) =>
  new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (rawRow) => {
        const serialNumber = Number(
          normalizeText(rawRow.serial_no || rawRow.sno || rawRow["S.No"]),
        );
        const rollNumber = normalizeUpperText(
          rawRow.roll_number ||
            rawRow.roll ||
            rawRow["JNTUA Roll Number"] ||
            rawRow.student_id,
        );
        const fullName = normalizeText(
          rawRow.full_name ||
            rawRow.name ||
            rawRow["Name of the Candidate"] ||
            rawRow["Name of the Candidate                                        (As per SSC)"],
        );
        const department =
          normalizeText(rawRow.department) || DEFAULT_DEPARTMENT;
        const year = normalizeText(rawRow.year) || DEFAULT_YEAR;
        const section =
          normalizeUpperText(rawRow.section) ||
          deriveSectionFromSerialNumber(serialNumber);

        if (!rollNumber || !fullName || !Number.isFinite(serialNumber)) {
          return;
        }

        rows.push({
          serialNumber,
          rollNumber,
          fullName,
          department,
          year,
          section,
          email:
            normalizeText(rawRow.email).toLowerCase() ||
            deriveEmailFromRollNumber(rollNumber),
          password: derivePasswordFromName(fullName),
        });
      })
      .on("end", () => {
        rows.sort((left, right) => left.serialNumber - right.serialNumber);
        resolve(rows);
      })
      .on("error", reject);
  });

const insertStudent = async (db, student) => {
  const result = await db.query(
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
        'student',
        $3,
        $4,
        NULL,
        $5,
        $6,
        $7,
        NULL,
        NOW(),
        NOW()
      )
      RETURNING auth_user_id
    `,
    [
      student.email,
      hashPassword(student.password),
      student.fullName,
      student.rollNumber,
      student.department,
      student.year,
      student.section,
    ],
  );

  return Number(result.rows[0]?.auth_user_id);
};

const ensureBatchLink = async (
  db,
  batchTableName,
  batchMappingTableName,
  batchIdCache,
  userId,
  student,
) => {
  const batchName = deriveBatchName(student);
  let batchId = batchIdCache.get(batchName);

  if (batchId === undefined) {
    const batchResult = await db.query(
      `SELECT id FROM ${batchTableName} WHERE name = $1 ORDER BY id ASC LIMIT 1`,
      [batchName],
    );
    batchId = Number(batchResult.rows[0]?.id || 0) || null;
    batchIdCache.set(batchName, batchId);
  }

  if (!batchId) {
    return { status: "missing_batch", batchName };
  }

  const linkResult = await db.query(
    `
      INSERT INTO ${batchMappingTableName} (batch_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING batch_id
    `,
    [batchId, userId],
  );

  return {
    status: (linkResult.rowCount || 0) > 0 ? "linked" : "already_linked",
    batchName,
  };
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    csvPath: DEFAULT_CSV_PATH,
    dryRun: false,
    updateExisting: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--csv" && args[index + 1]) {
      options.csvPath = path.resolve(process.cwd(), args[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--update-existing") {
      options.updateExisting = true;
    }
  }

  return options;
};

const importStudents = async () => {
  const options = parseArgs();
  if (!fs.existsSync(options.csvPath)) {
    throw new Error(`CSV file not found: ${options.csvPath}`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const forceSsl = String(process.env.DB_SSL || "").toLowerCase() === "true";
  const disableSsl = String(process.env.DB_SSL || "").toLowerCase() === "false";
  const isSupabaseConnection = connectionString.includes(".supabase.co");
  const sslConfig = disableSsl
    ? false
    : forceSsl || isSupabaseConnection
      ? { rejectUnauthorized: false }
      : false;

  const pool = new Pool({
    connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
  });

  const students = await readStudentsFromCsv(options.csvPath);
  const db = await pool.connect();

  try {
    await ensureAuthUsersTable(db);

    const batchTableName = await getExistingTableName(db, ["batch", "batches"]);
    const batchMappingTableName = await getExistingTableName(db, [
      "batch_students",
      "batch_student",
    ]);
    const batchMappingStudentTargetTable = await getStudentMappingTargetTable(
      db,
      batchMappingTableName,
    );
    const canLinkBatchStudents =
      Boolean(batchTableName && batchMappingTableName) &&
      (!batchMappingStudentTargetTable ||
        batchMappingStudentTargetTable === "auth_users");
    const batchIdCache = new Map();

    const summary = {
      csvPath: options.csvPath,
      dryRun: options.dryRun,
      totalRows: students.length,
      insertedStudents: 0,
      updatedStudents: 0,
      skippedExistingStudents: 0,
      linkedToBatch: 0,
      alreadyLinkedToBatch: 0,
      missingBatchForStudents: 0,
      batchTableName,
      batchMappingTableName,
      batchMappingStudentTargetTable,
      canLinkBatchStudents,
      missingBatches: [],
      samples: students.slice(0, 5).map((student) => ({
        rollNumber: student.rollNumber,
        email: student.email,
        section: student.section,
      })),
    };

    for (const student of students) {
      const existingResult = await db.query(
        `
          SELECT auth_user_id
          FROM auth_users
          WHERE email = $1 OR roll_number = $2
          LIMIT 1
        `,
        [student.email, student.rollNumber],
      );

      let userId = Number(existingResult.rows[0]?.auth_user_id || 0) || null;

      if (!userId) {
        if (!options.dryRun) {
          userId = await insertStudent(db, student);
        }
        summary.insertedStudents += 1;
      } else if (options.updateExisting) {
        if (!options.dryRun) {
          await db.query(
            `
              UPDATE auth_users
              SET role = 'student',
                  full_name = $1,
                  roll_number = $2,
                  department = $3,
                  academic_year = $4,
                  section = $5,
                  updated_at = NOW()
              WHERE auth_user_id = $6
            `,
            [
              student.fullName,
              student.rollNumber,
              student.department,
              student.year,
              student.section,
              userId,
            ],
          );
        }
        summary.updatedStudents += 1;
      } else {
        summary.skippedExistingStudents += 1;
      }

      if (userId && canLinkBatchStudents) {
        try {
          const batchResult = options.dryRun
            ? { status: "linked", batchName: deriveBatchName(student) }
            : await ensureBatchLink(
                db,
                batchTableName,
                batchMappingTableName,
                batchIdCache,
                userId,
                student,
              );

          if (batchResult.status === "linked") {
            summary.linkedToBatch += 1;
          } else if (batchResult.status === "already_linked") {
            summary.alreadyLinkedToBatch += 1;
          } else if (batchResult.status === "missing_batch") {
            summary.missingBatchForStudents += 1;
            if (!summary.missingBatches.includes(batchResult.batchName)) {
              summary.missingBatches.push(batchResult.batchName);
            }
          }
        } catch (error) {
          summary.batchLinkError =
            error instanceof Error ? error.message : String(error);
        }
      }
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    db.release();
    await pool.end();
  }
};

importStudents().catch((error) => {
  console.error(error);
  process.exit(1);
});
