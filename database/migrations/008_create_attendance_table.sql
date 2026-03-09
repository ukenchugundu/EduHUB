-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create batches/sections table
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    academic_year VARCHAR(20) NOT NULL,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, department_id, academic_year)
);

-- Create attendance sessions table (each class session)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    faculty_id INTEGER REFERENCES auth_users(auth_user_id),
    subject VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, subject, session_date, start_time)
);

-- Create attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES auth_users(auth_user_id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by INTEGER REFERENCES auth_users(auth_user_id),
    UNIQUE(session_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_batch_id ON attendance_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_batches_department_id ON batches(department_id);

-- Insert sample departments
INSERT INTO departments (name, code) VALUES 
    ('Computer Science Engineering', 'CSE'),
    ('Computer Science & Design', 'CSD'),
    ('Information Technology', 'IT'),
    ('Electronics & Communication', 'ECE'),
    ('Mechanical Engineering', 'ME')
ON CONFLICT (code) DO NOTHING;

-- Insert sample batches with different years
INSERT INTO batches (name, department_id, academic_year, semester) 
SELECT 
    b.name,
    d.id,
    b.year,
    b.sem
FROM (VALUES 
    ('I CSE-A', '2024-2025', 1),
    ('I CSE-B', '2024-2025', 1),
    ('II CSE-A', '2024-2025', 2),
    ('II CSE-B', '2024-2025', 2),
    ('III CSE-A', '2024-2025', 3),
    ('III CSE-B', '2024-2025', 3),
    ('IV CSE-A', '2024-2025', 4),
    ('IV CSE-B', '2024-2025', 4),
    ('III CSE-A', '2023-2024', 3),
    ('IV CSE-A', '2023-2024', 4)
) b(name, year, sem)
CROSS JOIN (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1) d
ON CONFLICT (name, department_id, academic_year) DO NOTHING;

INSERT INTO batches (name, department_id, academic_year, semester) 
SELECT 
    b.name,
    d.id,
    b.year,
    b.sem
FROM (VALUES 
    ('I CSD-A', '2024-2025', 1),
    ('II CSD-A', '2024-2025', 2),
    ('III CSD-A', '2024-2025', 3),
    ('IV CSD-A', '2024-2025', 4)
) b(name, year, sem)
CROSS JOIN (SELECT id FROM departments WHERE code = 'CSD' LIMIT 1) d
ON CONFLICT (name, department_id, academic_year) DO NOTHING;

INSERT INTO batches (name, department_id, academic_year, semester) 
SELECT 
    b.name,
    d.id,
    b.year,
    b.sem
FROM (VALUES 
    ('I IT-A', '2024-2025', 1),
    ('II IT-A', '2024-2025', 2),
    ('III IT-A', '2024-2025', 3),
    ('IV IT-A', '2024-2025', 4)
) b(name, year, sem)
CROSS JOIN (SELECT id FROM departments WHERE code = 'IT' LIMIT 1) d
ON CONFLICT (name, department_id, academic_year) DO NOTHING;

INSERT INTO batches (name, department_id, academic_year, semester) 
SELECT 
    b.name,
    d.id,
    b.year,
    b.sem
FROM (VALUES 
    ('I ECE-A', '2024-2025', 1),
    ('II ECE-A', '2024-2025', 2),
    ('III ECE-A', '2024-2025', 3),
    ('IV ECE-A', '2024-2025', 4)
) b(name, year, sem)
CROSS JOIN (SELECT id FROM departments WHERE code = 'ECE' LIMIT 1) d
ON CONFLICT (name, department_id, academic_year) DO NOTHING;

INSERT INTO batches (name, department_id, academic_year, semester) 
SELECT 
    b.name,
    d.id,
    b.year,
    b.sem
FROM (VALUES 
    ('I ME-A', '2024-2025', 1),
    ('II ME-A', '2024-2025', 2),
    ('III ME-A', '2024-2025', 3),
    ('IV ME-A', '2024-2025', 4)
) b(name, year, sem)
CROSS JOIN (SELECT id FROM departments WHERE code = 'ME' LIMIT 1) d
ON CONFLICT (name, department_id, academic_year) DO NOTHING;

