const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:Supabase-EduHUB123-HigherEducation2026@db.eowbssqeqjjhayliwvay.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    const insert = await pool.query(
      'INSERT INTO quizzes (cls, title, questions, duration, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['TEST', 'Test Quiz', 1, '10 mins', 'Draft'],
    );
    console.log('inserted', insert.rows[0]);

    const q = await pool.query('SELECT id, cls, title, status, questions, duration FROM quizzes ORDER BY id DESC LIMIT 2');
    console.table(q.rows);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
})();
