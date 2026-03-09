-- Optimized schema for 10,000+ students
-- Performance-focused with proper indexing and partitioning

-- Students table with optimized structure
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    year INTEGER CHECK (year BETWEEN 1 AND 4),
    section CHAR(1) CHECK (section IN ('A','B','C','D','E','F','G','H','I')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table (partitioned by date)
CREATE TABLE student_performance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    metric_date DATE NOT NULL,
    attendance_percentage DECIMAL(5,2),
    quiz_score DECIMAL(5,2),
    assessment_score DECIMAL(5,2),
    interaction_score DECIMAL(5,2),
    literacy_percentage DECIMAL(5,2),
    literacy_level VARCHAR(10) CHECK (literacy_level IN ('Low','Medium','High')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (metric_date);

-- Create monthly partitions for performance data
CREATE TABLE student_performance_2024_01 PARTITION OF student_performance
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE student_performance_2024_02 PARTITION OF student_performance
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Add more partitions as needed

-- Attendance tracking (separate table for real-time updates)
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    subject_id INTEGER REFERENCES subjects(id),
    faculty_id INTEGER REFERENCES faculty(id),
    date DATE NOT NULL,
    status VARCHAR(10) CHECK (status IN ('Present','Absent','Late')),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for fast queries
CREATE INDEX idx_students_dept_year_section ON students(department_id, year, section);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_performance_student_date ON student_performance(student_id, metric_date);
CREATE INDEX idx_performance_date_literacy ON student_performance(metric_date, literacy_level);
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX idx_attendance_date_subject ON attendance_records(date, subject_id);

-- Materialized view for quick analytics
CREATE MATERIALIZED VIEW student_performance_summary AS
SELECT 
    s.id,
    s.student_id,
    s.name,
    s.department_id,
    s.year,
    s.section,
    AVG(sp.attendance_percentage) as avg_attendance,
    AVG(sp.quiz_score) as avg_quiz_score,
    AVG(sp.assessment_score) as avg_assessment_score,
    AVG(sp.interaction_score) as avg_interaction_score,
    AVG(sp.literacy_percentage) as avg_literacy_percentage,
    MODE() WITHIN GROUP (ORDER BY sp.literacy_level) as current_literacy_level,
    COUNT(sp.id) as total_records
FROM students s
LEFT JOIN student_performance sp ON s.id = sp.student_id
WHERE sp.metric_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.student_id, s.name, s.department_id, s.year, s.section;

-- Refresh materialized view daily
CREATE INDEX ON student_performance_summary(department_id, year, section);
CREATE INDEX ON student_performance_summary(avg_literacy_percentage DESC);