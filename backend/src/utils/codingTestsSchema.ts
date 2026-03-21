import { Pool, PoolClient } from "pg";
import { getAcademicTableNames } from "./studentPortalAccess";

type DbClient = Pool | PoolClient;

let codingTestsSchemaReadyPromise: Promise<boolean> | null = null;

export const ensureCodingTestsSchema = async (
  db: DbClient,
): Promise<boolean> => {
  if (!codingTestsSchemaReadyPromise) {
    codingTestsSchemaReadyPromise = (async () => {
      const { batchTableName, studentTableName } = await getAcademicTableNames(
        db,
      );

      const batchReferenceClause = batchTableName
        ? ` REFERENCES ${batchTableName}(id) ON DELETE SET NULL`
        : "";
      const studentReferenceClause = studentTableName
        ? ` REFERENCES ${studentTableName}(id) ON DELETE CASCADE`
        : "";

      await db.query(`
        CREATE TABLE IF NOT EXISTS coding_tests (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          faculty_id INTEGER REFERENCES auth_users(auth_user_id) ON DELETE SET NULL,
          batch_id INTEGER${batchReferenceClause},
          duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          allow_multiple_attempts BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS test_questions (
          id SERIAL PRIMARY KEY,
          test_id INTEGER REFERENCES coding_tests(id) ON DELETE CASCADE,
          question_number INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          input_format TEXT,
          output_format TEXT,
          constraints TEXT,
          sample_input TEXT,
          sample_output TEXT,
          test_cases JSONB DEFAULT '[]'::jsonb,
          difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
          points INTEGER DEFAULT 10,
          time_limit_seconds INTEGER DEFAULT 30,
          memory_limit_mb INTEGER DEFAULT 256,
          starter_code TEXT
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS test_attempts (
          id SERIAL PRIMARY KEY,
          test_id INTEGER REFERENCES coding_tests(id) ON DELETE CASCADE,
          student_id INTEGER${studentReferenceClause},
          start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMPTZ,
          status VARCHAR(20) CHECK (status IN ('In Progress', 'Submitted', 'Terminated', 'Time Up')),
          total_score INTEGER DEFAULT 0,
          plagiarism_score DECIMAL(5,2) DEFAULT 0,
          cheating_flags JSONB DEFAULT '[]'::jsonb,
          is_flagged BOOLEAN DEFAULT FALSE
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS question_submissions (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES test_questions(id) ON DELETE CASCADE,
          code TEXT,
          language VARCHAR(50) NOT NULL,
          status VARCHAR(20) CHECK (status IN ('Pending', 'Running', 'Accepted', 'Wrong Answer', 'Time Limit', 'Runtime Error', 'Compile Error')),
          score INTEGER DEFAULT 0,
          execution_time INTEGER,
          memory_used INTEGER,
          test_cases_passed INTEGER DEFAULT 0,
          total_test_cases INTEGER DEFAULT 0,
          submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS cheating_logs (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL,
          event_data JSONB,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS plagiarism_results (
          id SERIAL PRIMARY KEY,
          submission_id INTEGER REFERENCES question_submissions(id) ON DELETE CASCADE,
          similar_submission_id INTEGER REFERENCES question_submissions(id) ON DELETE CASCADE,
          similarity_score DECIMAL(5,2) NOT NULL,
          matching_lines JSONB,
          algorithm_used VARCHAR(50) DEFAULT 'levenshtein',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(
        "ALTER TABLE coding_tests ADD COLUMN IF NOT EXISTS batch_id INTEGER",
      );
      await db.query(
        "ALTER TABLE coding_tests ADD COLUMN IF NOT EXISTS allow_multiple_attempts BOOLEAN DEFAULT FALSE",
      );
      await db.query(
        "ALTER TABLE coding_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
      );

      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS input_format TEXT",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS output_format TEXT",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS constraints TEXT",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS sample_input TEXT",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS sample_output TEXT",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20)",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 30",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS memory_limit_mb INTEGER DEFAULT 256",
      );
      await db.query(
        "ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS starter_code TEXT",
      );

      await db.query(
        "ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS plagiarism_score DECIMAL(5,2) DEFAULT 0",
      );
      await db.query(
        "ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS cheating_flags JSONB DEFAULT '[]'::jsonb",
      );
      await db.query(
        "ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE",
      );

      await db.query(
        "ALTER TABLE question_submissions ADD COLUMN IF NOT EXISTS execution_time INTEGER",
      );
      await db.query(
        "ALTER TABLE question_submissions ADD COLUMN IF NOT EXISTS memory_used INTEGER",
      );
      await db.query(
        "ALTER TABLE question_submissions ADD COLUMN IF NOT EXISTS test_cases_passed INTEGER DEFAULT 0",
      );
      await db.query(
        "ALTER TABLE question_submissions ADD COLUMN IF NOT EXISTS total_test_cases INTEGER DEFAULT 0",
      );
      await db.query(
        "ALTER TABLE question_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
      );

      await db.query(
        "ALTER TABLE plagiarism_results ADD COLUMN IF NOT EXISTS algorithm_used VARCHAR(50) DEFAULT 'levenshtein'",
      );
      await db.query(
        "ALTER TABLE plagiarism_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
      );

      await db.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_test_questions_test_number ON test_questions(test_id, question_number)",
      );
      await db.query(
        "CREATE INDEX IF NOT EXISTS idx_coding_tests_faculty_id ON coding_tests(faculty_id)",
      );
      await db.query(
        "CREATE INDEX IF NOT EXISTS idx_test_attempts_student_test ON test_attempts(student_id, test_id)",
      );
      await db.query(
        "CREATE INDEX IF NOT EXISTS idx_submissions_attempt_question ON question_submissions(attempt_id, question_id)",
      );
      await db.query(
        "CREATE INDEX IF NOT EXISTS idx_cheating_logs_attempt ON cheating_logs(attempt_id, timestamp)",
      );
      await db.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_plagiarism_result_pair ON plagiarism_results(submission_id, similar_submission_id)",
      );
      await db.query(
        "CREATE INDEX IF NOT EXISTS idx_plagiarism_similarity ON plagiarism_results(similarity_score DESC)",
      );

      return true;
    })().catch((error) => {
      codingTestsSchemaReadyPromise = null;
      throw error;
    });
  }

  return codingTestsSchemaReadyPromise;
};
