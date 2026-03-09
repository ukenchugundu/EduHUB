-- Test management tables
CREATE TABLE coding_tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    faculty_id INTEGER REFERENCES faculty(id),
    subject_id INTEGER REFERENCES subjects(id),
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    allow_multiple_attempts BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_questions (
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
    test_cases JSONB, -- Hidden test cases
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    points INTEGER DEFAULT 10,
    time_limit_seconds INTEGER DEFAULT 30,
    memory_limit_mb INTEGER DEFAULT 256
);

CREATE TABLE test_attempts (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES coding_tests(id),
    student_id INTEGER REFERENCES students(id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('In Progress', 'Submitted', 'Terminated', 'Time Up')),
    total_score INTEGER DEFAULT 0,
    plagiarism_score DECIMAL(5,2) DEFAULT 0,
    cheating_flags JSONB DEFAULT '[]',
    is_flagged BOOLEAN DEFAULT false
);

CREATE TABLE question_submissions (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES test_questions(id),
    code TEXT,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Running', 'Accepted', 'Wrong Answer', 'Time Limit', 'Runtime Error', 'Compile Error')),
    score INTEGER DEFAULT 0,
    execution_time INTEGER, -- milliseconds
    memory_used INTEGER, -- KB
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cheating_logs (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES test_attempts(id),
    event_type VARCHAR(50) NOT NULL, -- 'tab_switch', 'window_blur', 'copy_paste', 'right_click', 'dev_tools'
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plagiarism_results (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES question_submissions(id),
    similar_submission_id INTEGER REFERENCES question_submissions(id),
    similarity_score DECIMAL(5,2) NOT NULL,
    matching_lines JSONB,
    algorithm_used VARCHAR(50) DEFAULT 'levenshtein',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_test_attempts_student_test ON test_attempts(student_id, test_id);
CREATE INDEX idx_submissions_attempt_question ON question_submissions(attempt_id, question_id);
CREATE INDEX idx_cheating_logs_attempt ON cheating_logs(attempt_id, timestamp);
CREATE INDEX idx_plagiarism_similarity ON plagiarism_results(similarity_score DESC);