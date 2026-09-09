const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

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

loadEnvFile(path.resolve(__dirname, "..", "..", ".env"));
loadEnvFile(path.resolve(__dirname, "..", ".env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const forceSsl = String(process.env.DB_SSL || "").toLowerCase() === "true";
const disableSsl = String(process.env.DB_SSL || "").toLowerCase() === "false";
const isSupabaseConnection =
  connectionString.includes(".supabase.") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("supabase.com");
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

const departments = [
  { code: "CSD", name: "Computer Science and Data Science" },
];

const batchSeeds = [
  { departmentCode: "CSD", name: "I CSD-A", academicYear: "2024-2025", semester: 1 },
  { departmentCode: "CSD", name: "I CSD-B", academicYear: "2024-2025", semester: 1 },
  { departmentCode: "CSD", name: "II CSD-A", academicYear: "2024-2025", semester: 2 },
  { departmentCode: "CSD", name: "II CSD-B", academicYear: "2024-2025", semester: 2 },
  { departmentCode: "CSD", name: "III CSD-A", academicYear: "2024-2025", semester: 3 },
  { departmentCode: "CSD", name: "III CSD-B", academicYear: "2024-2025", semester: 3 },
  { departmentCode: "CSD", name: "IV CSD-A", academicYear: "2024-2025", semester: 4 },
  { departmentCode: "CSD", name: "IV CSD-B", academicYear: "2024-2025", semester: 4 },
];

const ensureRequiredTables = async (client) => {
  const departmentExists = await client.query(
    "SELECT to_regclass('public.department')::text AS name",
  );
  const batchExists = await client.query(
    "SELECT to_regclass('public.batch')::text AS name",
  );

  if (!departmentExists.rows[0]?.name) {
    throw new Error('Table "department" does not exist.');
  }

  if (!batchExists.rows[0]?.name) {
    throw new Error('Table "batch" does not exist.');
  }
};

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureRequiredTables(client);

    for (const department of departments) {
      await client.query(
        `
          INSERT INTO department (name, code, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (code)
          DO UPDATE SET name = EXCLUDED.name
        `,
        [department.name, department.code],
      );
    }

    const departmentRows = await client.query(
      "SELECT id, code FROM department WHERE code = ANY($1::text[])",
      [departments.map((department) => department.code)],
    );
    const departmentIdsByCode = new Map(
      departmentRows.rows.map((row) => [row.code, row.id]),
    );

    let insertedBatches = 0;
    for (const batch of batchSeeds) {
      const departmentId = departmentIdsByCode.get(batch.departmentCode);
      if (!departmentId) {
        throw new Error(
          `Department code ${batch.departmentCode} was not found after seeding.`,
        );
      }

      const result = await client.query(
        `
          INSERT INTO batch (name, department_id, academic_year, semester, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (name, department_id, academic_year) DO NOTHING
          RETURNING id
        `,
        [batch.name, departmentId, batch.academicYear, batch.semester],
      );
      insertedBatches += result.rowCount || 0;
    }

    const departmentCountResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM department",
    );
    const batchCountResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM batch",
    );

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          departmentsSeeded: departments.length,
          totalDepartments: departmentCountResult.rows[0]?.count || 0,
          batchesAttempted: batchSeeds.length,
          newlyInsertedBatches: insertedBatches,
          totalBatches: batchCountResult.rows[0]?.count || 0,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
