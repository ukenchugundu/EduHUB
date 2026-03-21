const { Pool } = require('pg');

const tableName = process.argv[2];
if (!tableName) {
  console.error('Usage: node describe-table.js <table_name>');
  process.exit(1);
}

(async () => {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:Supabase-EduHUB123-HigherEducation2026@db.eowbssqeqjjhayliwvay.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1
       ORDER BY ordinal_position`,
      [tableName],
    );
    console.log(`\nTable: ${tableName}`);
    console.table(result.rows);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
})();
