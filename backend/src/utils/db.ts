import { Pool } from "pg";
import fs from "fs";
import path from "path";

const loadEnvFile = (filePath: string): void => {
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

const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
loadEnvFile(path.join(workspaceRoot, ".env"));
loadEnvFile(path.join(workspaceRoot, "backend", ".env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Set it to your Supabase Postgres connection string.",
  );
}
const forceSsl = process.env.DB_SSL?.toLowerCase() === "true";
const disableSsl = process.env.DB_SSL?.toLowerCase() === "false";
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
  // Increase the timeout for remote databases (e.g. Supabase) which may take longer
  // to establish a connection compared to a local Postgres instance.
  connectionTimeoutMillis: 15000,
  // Keep idle connections alive a bit longer to avoid frequent reconnects.
  idleTimeoutMillis: 30000,
});

export const ensureDatabaseConnection = async (): Promise<void> => {
  await pool.query("SELECT 1");
  console.log("[DB] Connected to Supabase Postgres");
};

export default pool;
