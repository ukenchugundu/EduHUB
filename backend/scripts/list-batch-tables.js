const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:Supabase-EduHUB123-HigherEducation2026@db.eowbssqeqjjhayliwvay.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    const q = `SELECT table_name FROM information_schema.tables
               WHERE table_schema='public'
                 AND table_name LIKE '%batch%'
               ORDER BY table_name`;
    const result = await pool.query(q);
    console.table(result.rows);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
})();
