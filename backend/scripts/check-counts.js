const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadEnvFile(path.resolve(__dirname, "..", "..", ".env"));
loadEnvFile(path.resolve(__dirname, "..", ".env"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const userRes = await client.query("SELECT auth_user_id, email, role, full_name, roll_number FROM auth_users ORDER BY auth_user_id");
    console.log("Current auth_users:", userRes.rows);

    const tables = [
      'departments', 'batches', 'student', 'faculty_class_allocations', 
      'quizzes', 'assignments', 'coding_tests', 'attendance_sessions', 
      'timetable_entries', 'notes', 'events', 'student_performance'
    ];
    for (const t of tables) {
      try {
        const cnt = await client.query(`SELECT COUNT(*)::int as c FROM ${t}`);
        console.log(`Count in [${t}]: ${cnt.rows[0].c}`);
      } catch (err) {
        console.log(`Table [${t}] error:`, err.message);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
