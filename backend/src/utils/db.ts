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

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/eduhub";
const forceSsl = process.env.DB_SSL?.toLowerCase() === "true";
const disableSsl = process.env.DB_SSL?.toLowerCase() === "false";
const isSupabaseConnection = connectionString.includes(".supabase.co");
const sslConfig = disableSsl
  ? false
  : forceSsl || isSupabaseConnection
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
});

export default pool;
