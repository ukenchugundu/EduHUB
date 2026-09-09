const { Pool } = require("pg");
const pool = new Pool({
  connectionString: "postgresql://postgres.ynfmqjmdibnnlcuospdo:EduHUB939894@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='question_id') THEN
          ALTER TABLE questions ADD COLUMN question_id INT GENERATED ALWAYS AS (id) STORED;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='question_text') THEN
          ALTER TABLE questions ADD COLUMN question_text TEXT GENERATED ALWAYS AS (text) STORED;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='options' AND column_name='option_id') THEN
          ALTER TABLE options ADD COLUMN option_id INT GENERATED ALWAYS AS (id) STORED;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='options' AND column_name='option_text') THEN
          ALTER TABLE options ADD COLUMN option_text TEXT GENERATED ALWAYS AS (text) STORED;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='quiz_id') THEN
          ALTER TABLE quizzes ADD COLUMN quiz_id INT GENERATED ALWAYS AS (id) STORED;
        END IF;
      END $$;
    `);
    console.log("Successfully added alias generated columns!");

    const testQ = await pool.query("SELECT quiz_id, id, title FROM quizzes LIMIT 1");
    console.log("Quizzes:", testQ.rows);
    const testQuest = await pool.query("SELECT question_id, id, question_text, text FROM questions LIMIT 1");
    console.log("Questions:", testQuest.rows);
    const testOpt = await pool.query("SELECT option_id, id, option_text, text FROM options LIMIT 1");
    console.log("Options:", testOpt.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
