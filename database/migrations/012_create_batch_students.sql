-- Create batch_students mapping table
CREATE TABLE IF NOT EXISTS batch_students (
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES auth_users(auth_user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (batch_id, student_id)
);

-- Link existing students to batches
-- For demo, link the sample student to III CSE-A (which has id 5 based on previous migration)
INSERT INTO batch_students (batch_id, student_id)
SELECT b.id, au.auth_user_id
FROM batches b, auth_users au
WHERE b.name = 'III CSE-A' AND au.email = 'student@eduhub.local'
ON CONFLICT DO NOTHING;

-- Add some sample attendance sessions for today to test the schedule
INSERT INTO attendance_sessions (batch_id, faculty_id, subject, topic, session_date, start_time, end_time)
SELECT 
    b.id, 
    au.auth_user_id, 
    'Computer Networks', 
    'Introduction to OSI Model', 
    CURRENT_DATE, 
    '09:00:00', 
    '09:50:00'
FROM batches b, auth_users au
WHERE b.name = 'III CSE-A' AND au.role = 'faculty' AND au.email = 'faculty@eduhub.local'
ON CONFLICT DO NOTHING;

INSERT INTO attendance_sessions (batch_id, faculty_id, subject, topic, session_date, start_time, end_time)
SELECT 
    b.id, 
    au.auth_user_id, 
    'Operating Systems', 
    'Process Scheduling', 
    CURRENT_DATE, 
    '11:00:00', 
    '11:50:00'
FROM batches b, auth_users au
WHERE b.name = 'III CSE-A' AND au.role = 'faculty' AND au.email = 'faculty@eduhub.local'
ON CONFLICT DO NOTHING;
